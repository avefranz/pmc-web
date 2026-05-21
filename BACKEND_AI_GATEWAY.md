# AI Gateway — спецификация для PMC.BFF

Документ для бэкенд-команды. Описывает единый AI-эндпоинт, через который фронт получает все AI-фичи (генерация названий объявлений, описаний, ответов в тикетах и т. д.).

Цель: фронту просто. Один `aiApi.suggestListingTitle({...})` — и есть результат. Никаких prompt-крафтов на клиенте, никаких ключей в браузере, никаких CORS-страданий.

---

## 1. Зачем

Фронт пытался дёргать `text.pollinations.ai` напрямую — нарвался на то, что Pollinations с прошлой недели режет всё, у чего есть `Origin`-хедер (т. е. любой браузер). Анонимные server-to-server вызовы всё ещё работают.

Помимо этого, прямой вызов AI из браузера всё равно неправилен:
- ключ провайдера утечёт
- prompt'ы рассыпаются по фичам, версионировать невозможно
- ни кеша, ни rate-limit'а, ни аудита
- A/B-тестить модель/промпт — только релизом фронта

**Решение:** один backend-сервис `AiGateway` с типизированными use-case-эндпоинтами. Промпты живут в коде бэка, провайдер выбирается конфигом, фронт получает чистые DTO.

---

## 2. Высокоуровневая архитектура

```
Frontend                Backend (PMC.BFF)                External
─────────               ─────────────────────             ─────────────
aiApi.x()  ──HTTP──▶    AiController                ┌──▶ Anthropic Claude (primary)
                          │                         │
                          ▼                         │
                        UseCase (e.g. SuggestListingTitle)
                          │  builds typed prompt    │
                          ▼                         │
                        AiClient (interface)        │
                          │                         │
                          ├──▶ AnthropicAiClient ───┘
                          ├──▶ PollinationsAiClient ──▶ text.pollinations.ai (free fallback)
                          └──▶ TemplateAiClient       (last-resort, in-process)

                        + IMemoryCache (response cache)
                        + Rate limiter (per user)
```

Ключевые принципы:
- **Use-case-эндпоинты, не «raw prompt»**. Никогда не отдавать `POST /api/ai/complete { prompt }` — это будет prompt-injection-полигон и хаос.
- **Промпт — серверная деталь**. Фронт шлёт структурированный DTO (`{ type, area, bedrooms, feature }`), бэк сам собирает текст.
- **Провайдер абстрагирован**. Переключение Claude ⇄ Pollinations ⇄ что-угодно — одна строка в `appsettings`.
- **Фолбэк есть всегда**. Если AI лёг — отвечаем 200 с шаблонным результатом и флагом `provider: "template"`. Фронт никогда не должен показывать ошибку из-за того, что у нас кончились токены.

---

## 3. Рекомендуемый провайдер: Claude Haiku 4.5

У пользователя есть Anthropic-аккаунт. Haiku 4.5 — наш дефолт.

- **Цена** (на момент написания): $1 / 1M input tokens, $5 / 1M output tokens
- **Типичная задача** «сгенерируй заголовок»: ~150 input + 30 output tokens ≈ **$0.0003 за вызов**
- На 10 000 генераций в день — ~$3/день. С кешированием (см. §6) реально будет в 5–10 раз меньше.
- Латентность: ~300–800 мс. Для UX «сразу появилось предложение» достаточно.

**Модель ID:** `claude-haiku-4-5-20251001` (см. CLAUDE.md в этом репо).

**Альтернатива «совсем бесплатно»:** Pollinations с server-to-server. Анонимный GET `https://text.pollinations.ai/{prompt}?model=openai` работает без ключа и без авторизации, но качество и стабильность ниже Claude'а. Держим как fallback-провайдер.

---

## 4. Первый эндпоинт: `POST /api/ai/listings/suggest-title`

### Request

```http
POST /api/ai/listings/suggest-title
Content-Type: application/json
Authorization: Bearer <jwt>      ; стандартная auth, как везде

{
  "propertyType":   "Condo" | "House" | "Villa" | "Studio" | "Townhouse" | "Other",
  "area":           "Chiang Mai",   ; 2–60 chars
  "bedrooms":       4,              ; 0..10 (0 = studio)
  "feature":        "Pool view",    ; nullable, 0..40 chars
  "variation":      0               ; 0..9, чтобы «Try another» давал разные варианты
}
```

### Response (200)

```json
{
  "data": {
    "title":    "Modern 4-bed condo | Chiang Mai | Pool view",
    "provider": "anthropic",
    "cached":   false,
    "tookMs":   412
  }
}
```

Поля `provider` / `cached` / `tookMs` — для отладки и метрик; фронт их не показывает.

### Контракт ответа: ВСЕГДА 200

Даже если внешний API лёг, ответ возвращается 200 с `provider: "template"` и подходящим заголовком из локального шаблона. Это критично для UX — фронт не должен ловить ошибки на этапе «дай мне предложение названия».

400 разрешён только для невалидного запроса (отсутствует propertyType, area короче 2 символов и т. д.). 401/403 — стандартная auth.

### Ограничения

- `title` всегда ≤ **60 символов**. Если модель вернула больше — обрезаем по последней границе слова.
- `title` — одна строка, без кавычек, markdown'а и эмодзи.
- Запрос идемпотентен по `(propertyType, area, bedrooms, feature, variation)` — см. §6 про кеш.

---

## 5. Структура кода (.NET)

Предлагаемая раскладка (адаптировать под существующий стиль PMC.BFF):

```
PMC.BFF/
├── Controllers/
│   └── AiController.cs                 # один контроллер на всё AI
├── Features/Ai/
│   ├── AiGateway.cs                    # фасад: dispatch к UseCase
│   ├── IAiClient.cs                    # интерфейс провайдера
│   ├── Providers/
│   │   ├── AnthropicAiClient.cs
│   │   ├── PollinationsAiClient.cs
│   │   └── TemplateAiClient.cs
│   ├── UseCases/
│   │   └── SuggestListingTitle/
│   │       ├── SuggestListingTitleRequest.cs
│   │       ├── SuggestListingTitleResponse.cs
│   │       ├── SuggestListingTitleHandler.cs
│   │       └── SuggestListingTitlePrompt.cs   # сборка промпта
│   └── AiOptions.cs                    # bind из appsettings
└── Services/RateLimiter/
    └── PerUserRateLimiter.cs
```

### `IAiClient`

```csharp
public interface IAiClient
{
    string Name { get; }                          // "anthropic" | "pollinations" | "template"
    Task<AiCompletionResult> CompleteAsync(
        AiCompletionRequest request,
        CancellationToken ct);
}

public record AiCompletionRequest(
    string System,                                 // system prompt
    string User,                                   // user prompt
    int MaxTokens = 100,
    double Temperature = 0.7);

public record AiCompletionResult(string Text, int InputTokens, int OutputTokens);
```

### `AnthropicAiClient` — основные точки

- Использует официальный SDK `Anthropic.SDK` (NuGet) или прямой HTTP к `https://api.anthropic.com/v1/messages`.
- Модель: из `AiOptions.Anthropic.Model` (default `"claude-haiku-4-5-20251001"`).
- Версия API: header `anthropic-version: 2023-06-01`.
- Ключ: из `AiOptions.Anthropic.ApiKey` (биндим из env var `ANTHROPIC_API_KEY`).
- Таймаут: 6 секунд. Превышение — кидаем `AiProviderException`, шлюз переключается на fallback.
- НИКОГДА не логируем ключ. В логах ошибок маскируем `sk-ant-*` → `sk-ant-****`.

### Цепочка fallback'ов

`AiGateway.Run(useCase, request)`:
1. Проверить кеш — есть ответ? Вернуть с `cached: true`.
2. Проверить rate limit — `PerUserRateLimiter.Acquire(userId)`. Превышен → 429 (см. §7).
3. Вызвать primary client (`Anthropic`). Получилось — записать в кеш, вернуть.
4. Поймали `AiProviderException` или таймаут → залогировать `WARN`, попробовать secondary (`Pollinations`).
5. Снова упало → вернуть результат от `TemplateAiClient` с `provider: "template"`. **Это всегда успех.**

Шаблонный fallback — в точности тот же алгоритм, что сейчас живёт на фронте в `create-page.tsx` → `templateName()`. Можно перетащить логику оттуда, чтобы поведение было одинаковое, если бэкенд почему-то недоступен (фронт держит локальный fallback на этот случай).

### `SuggestListingTitlePrompt`

```csharp
public static class SuggestListingTitlePrompt
{
    public const string System =
        "You write short rental listing titles for Thai property marketplace. " +
        "Style: concise, modern, no hype. " +
        "Output rules: ONE line, max 60 characters, no quotes, no markdown, no emoji, " +
        "no explanation, no preamble. " +
        "Examples: \"Modern 2BR | Sukhumvit 11 | Pool View\", " +
        "\"Cosy Studio in Silom · Fully Furnished\".";

    public static string Build(SuggestListingTitleRequest r)
    {
        var bedrooms = r.Bedrooms == 0 ? "Studio" : $"{r.Bedrooms}-bed";
        var feature = string.IsNullOrWhiteSpace(r.Feature) ? "" : $" · feature: {r.Feature}";
        var variation = r.Variation == 0 ? "" : $" Give variant #{r.Variation} (different shape from variant 0).";
        return $"Property: {r.PropertyType} in {r.Area}, Thailand. " +
               $"Size: {bedrooms}.{feature}.{variation} " +
               $"Output only the title.";
    }
}
```

`variation` важен — фронт показывает кнопку «Try another», которая инкрементирует это число. Если промпт его игнорирует — кнопка станет бесполезной. Можно пойти дальше и в system prompt запретить повторять предыдущие варианты, но MVP — указать номер варианта.

---

## 6. Кеширование

`IMemoryCache` (встроенный в ASP.NET Core).

- **Ключ:** `$"ai:listing-title:{type}:{area.ToLower()}:{bedrooms}:{feature?.ToLower()}:{variation}"`
- **TTL:** 60 минут (sliding). Длиннее — рискуем «застрять» на старой формулировке, если решим улучшить промпт.
- **Размер:** `SizeLimit = 10_000` записей.

Кеш — на уровне `AiGateway`, до похода в провайдера. Это и есть основная экономия токенов.

---

## 7. Rate limiting

Per-user simple sliding window:
- **Лимит:** 30 запросов / час на пользователя
- **Хранилище:** `IMemoryCache` (для одной инстанции хватит; если будете масштабировать, переключиться на Redis)
- **Ответ при превышении:** `429 Too Many Requests` с `Retry-After: <seconds>` и телом `{ "message": "AI suggestions are temporarily limited. Try again in N minutes." }`

Фронт обработает 429 → покажет шаблонный заголовок локально + тост «AI suggestions limited, using a template».

---

## 8. Конфигурация

`appsettings.json`:

```json
{
  "Ai": {
    "PrimaryProvider":   "Anthropic",
    "SecondaryProvider": "Pollinations",
    "CacheTtlMinutes":   60,
    "RateLimitPerHour":  30,
    "Anthropic": {
      "Model":       "claude-haiku-4-5-20251001",
      "MaxTokens":   100,
      "Temperature": 0.7,
      "TimeoutMs":   6000
    },
    "Pollinations": {
      "Model":     "openai",
      "TimeoutMs": 8000
    }
  }
}
```

Ключ Anthropic — **только** через env var, никогда не в `appsettings.json`:

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

Биндинг в коде: `builder.Configuration.GetValue<string>("ANTHROPIC_API_KEY")` либо ASP.NET-style override через `Ai__Anthropic__ApiKey`.

---

## 9. Безопасность

1. **Auth:** эндпоинт под обычным JWT. Анонимам — 401.
2. **Никаких "raw prompt" эндпоинтов.** Только типизированные use-case'ы. Если фронту вдруг понадобится свободная генерация — заводим новый endpoint с валидированными полями, не лазейку.
3. **Input validation:**
   - `area`: 2–60 символов, регулярка `^[\p{L}0-9 \-'.]+$` (письма любых алфавитов, цифры, пробел, дефис, апостроф, точка)
   - `feature`: 0–40 символов, та же регулярка
   - `propertyType`: enum
   - `bedrooms`: 0–10
   - `variation`: 0–9
4. **Output sanitization:** обрезаем по 60 символов, удаляем `\n`, `\r`, `"`, `'`, `` ` ``, `*`. Это страховка от prompt-injection через `area`.
5. **Логирование:** запросы — да, ответы — да (полезно для итерации промпта), JWT и ключи — нет.
6. **PII:** в этом use-case'е её нет. Если в будущем добавим AI-эндпоинты, обрабатывающие данные арендатора/landlord'а — обязательно явный data-policy-флаг в `AiOptions`, отключающий Pollinations (отдаёт данные третьей стороне без BAA).

---

## 10. Как добавить следующий AI-эндпоинт

Шаблон. Допустим, надо «сгенерировать описание объявления»:

1. **Папка** `Features/Ai/UseCases/SuggestListingDescription/`
2. **Request DTO** — поля, нужные для промпта (тип, район, фичи, разрешённые удобства, цена)
3. **Prompt builder** — отдельный класс, чтобы промпт был под версионным контролем и его легко обновлять
4. **Handler** — получает request, билдит промпт, вызывает `AiGateway.CompleteAsync(...)`, форматирует ответ
5. **Контроллер-метод** — `POST /api/ai/listings/suggest-description`, делегирует handler'у
6. **Фронт:** добавить метод в `lib/api/ai.api.ts` (см. §11)

**Правила:**
- Один use case = один endpoint. Не складывать «генерируй что-нибудь» в общую кучу.
- Промпт всегда server-side. Если возникает соблазн принять `prompt: string` от фронта — остановиться и подумать почему.
- Cache TTL подбирать под use case (для описания — 24 часа: меняется реже).

---

## 11. Контракт со стороны фронта

Чтобы фронт мог быстро всё подключить, ожидаем такой `lib/api/ai.api.ts`:

```ts
import { apiClient } from "./client";

export type SuggestListingTitleRequest = {
  propertyType: "Condo" | "House" | "Villa" | "Studio" | "Townhouse" | "Other";
  area: string;
  bedrooms: number;
  feature?: string;
  variation?: number;
};

export type SuggestListingTitleResponse = {
  title: string;
  provider: "anthropic" | "pollinations" | "template";
  cached: boolean;
  tookMs: number;
};

export const aiApi = {
  suggestListingTitle: (req: SuggestListingTitleRequest) =>
    apiClient
      .post<{ data: SuggestListingTitleResponse }>("/api/ai/listings/suggest-title", req)
      .then((r) => r.data.data),
};
```

После того как эндпоинт появится — фронт заменит локальный `generateListingName()` в `create-page.tsx` на `aiApi.suggestListingTitle(...)` + сохранит локальный шаблон как fallback (если бэк недоступен или вернул 429).

---

## 12. Observability

Логи (Serilog или что у вас стандарт):
- `INFO` на каждый успешный вызов: `useCase`, `userId`, `provider`, `cached`, `tookMs`, `inputTokens`, `outputTokens`
- `WARN` при fallback'е: какая ошибка, какой провайдер выбрали
- `ERROR` только если **все** провайдеры упали (включая template — это уже баг кода)

Метрики (если есть Prometheus / OpenTelemetry):
- `ai_requests_total{use_case, provider, outcome}` — counter
- `ai_request_duration_seconds{use_case, provider}` — histogram
- `ai_cache_hits_total{use_case}` — counter
- `ai_input_tokens_total{provider}` / `ai_output_tokens_total{provider}` — counter, для отслеживания биллинга

---

## 13. Тесты

Минимум:
1. **Unit:** `SuggestListingTitlePrompt.Build()` — снапшоты промптов для каждого propertyType + варианты с/без feature.
2. **Unit:** output sanitizer — отрезает кавычки, эмодзи, длину; работает на всякой грязи, которую можно представить от модели.
3. **Integration (in-memory):** `AiGateway` с мок-клиентом — проверить, что fallback-цепочка отрабатывает (primary бросает → secondary вызывается → если он тоже падает → template вернул валидный результат).
4. **Integration (реальный Anthropic, под флагом `RUN_LIVE_AI_TESTS=1`):** один тест на каждый use case, чтобы изменения в API провайдера ловить.

---

## 14. Чеклист для запуска

- [ ] `ANTHROPIC_API_KEY` добавлен в секреты прод-окружения (и dev)
- [ ] `AiOptions` биндинг, валидация (`Validate(options => ...)`)
- [ ] `IAiClient` зарегистрирован в DI как keyed service (`"anthropic"`, `"pollinations"`, `"template"`)
- [ ] `IMemoryCache.AddMemoryCache(o => o.SizeLimit = 10_000)`
- [ ] Rate limiter подключён
- [ ] `AiController` с одним эндпоинтом
- [ ] Тесты зелёные
- [ ] Swagger описание заполнено
- [ ] Логи + метрики наблюдаются на staging'е
- [ ] Фронт переключён с локального шаблона на API-вызов (отдельный PR с фронта)

---

## 15. Открытые вопросы для согласования

1. **Где хранить версию промпта.** Простое решение — захардкожено в `.cs`-файле и версионируется через git. Сложное — БД-таблица `AiPromptVersions` с историей. MVP — git, потом видно.
2. **Включать ли streaming.** Для коротких ответов (заголовок) — не нужен. Для будущих use case'ов (генерация описания) — возможно. Не делать сейчас.
3. **Доступ для незалогиненных.** На странице создания объекта пользователь уже залогинен, поэтому пока auth обязателен. Если появится «попробуйте генератор» лендинг — переоценим (тогда — отдельный анонимный endpoint с гораздо более жёстким rate limit + капча).

---

При вопросах — пиши, продумаем точечно. Главное правило: **фронт никогда не должен видеть ошибку «не смогли сгенерировать»**. Шаблонный fallback в `TemplateAiClient` — наша страховка, и он должен быть приличного качества (см. текущий `templateName` в `src/features/me/host/properties/create-page.tsx`).
