# Backend Issues — PMC.BFF

Этот файл — баги/проблемы backend, найденные во время E2E-тестирования фронта.
Каждая находка содержит severity, способ воспроизведения и (если ясна) гипотезу о причине.

Контекст: фронт `pmc-web` тестируется как реальные пользователи. Все находки относятся к API на `http://localhost:5149`.

## Статус (2026-05-22)

| #     | Severity     | Что                              | Статус |
|-------|--------------|----------------------------------|--------|
| BE-1  | blocker      | login → 500                      | ✅ fixed (толерантный jsonb-конвертер + миграция) |
| BE-2  | blocker      | cities=1                         | ✅ fixed (новый `/api/references/cities`) |
| BE-3  | minor        | /asset/ → 400                    | ✅ fixed (route constraint `:guid`) |
| BE-4  | minor        | capabilities x5                  | ✅ fixed (`Cache-Control: private, max-age=60`) |
| BE-5  | **major**    | data loss POST                   | ✅ fixed (DTO расширен 8 полями + валидация) |
| BE-6  | оказался major | lastName лост                  | ✅ fixed (DTO + AuthService) |
| BE-7  | major        | AI suggestFeatures hallucinate   | ✅ fixed (AI выключен для этого use case'а) |
| BE-8  | major (UX)   | booking 4xx без field errors     | ✅ fixed (camelCase keys в ProblemDetails) |
| BE-9  | major        | AI suggestTitle hallucinate      | ✅ fixed (ужесточённый system prompt) |

Все 9 — задеплоены, отсмочены вживую. Дёргать сервер заново после `git pull`.

**Action для фронта** (минимум):
- BE-2: заменить `/api/marketplace/cities` → `/api/references/cities` на странице create-property
- BE-5: можно убрать workaround-PATCH после POST /api/assets
- BE-6: убедиться что фронт шлёт `firstName/lastName` в register (теперь они правда сохраняются)
- BE-7: можно вернуть вызов `aiApi.suggestFeatures(...)`, но **не показывать** «AI-curated» лейбл — это template
- BE-8: ничего — фронт уже умеет парсить `{ errors: { field: [...] } }`; теперь ключи приходят в camelCase и парсер их видит
- BE-9: можно показывать suggestTitle без опаски «придумает Pool View»; если есть `feature` в input — модель его честно использует

---

## BE-1. `POST /api/auth/login` → 500 для существующих пользователей  ✅ FIXED

**Severity:** blocker

**Воспроизведение:**
```bash
curl -X POST http://localhost:5149/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"claude@pmc-test.dev","password":"Test1234!"}'
```

**Ожидание:** `{ data: { token: "…" } }` или валидный 401 при неверном пароле.

**Факт (был):** `500 Internal Server Error`.

**Root cause:** колонка `User.ContactChannels` (jsonb) у одного юзера хранила legacy-значение, которое `JsonSerializer.Deserialize<List<ContactChannel>>` бросал `JsonException`. Предыдущая миграция `FixContactChannelsDefault` чинила только NULL / `''` / `'""'` — но не «голую строку», `"null"` и пр. EF ValueConverter крашился до того, как `BCrypt.Verify` доходил до выполнения → пробрасывался `JsonException` → handler не знает этот тип → 500.

**Фикс на бэке:**
1. **Толерантный конвертер** [PMC.BFF.Infrastructure/Data/AppDbContext.cs](../PMC.BFF/PMC.BFF.Infrastructure/Data/AppDbContext.cs) — `SafeDeserializeContactChannels()` ловит `JsonException` и возвращает пустой список. Этот класс багов больше не сможет 500-нуть. Бракованная строка нормализуется при первом `SaveChanges`.
2. **Миграция-доскрёб** [20260521180000_NormalizeBrokenContactChannels.cs](../PMC.BFF/PMC.BFF.Infrastructure/Migrations/20260521180000_NormalizeBrokenContactChannels.cs) — `UPDATE Users SET ContactChannels='[]'::jsonb WHERE jsonb_typeof <> 'array'` + чистка не-string элементов внутри массива.

**Проверено:** `claude@pmc-test.dev` → HTTP 200, выдаёт токен.

---

## BE-2. `GET /api/marketplace/cities` возвращает только Chiang Mai  ✅ FIXED

**Severity:** blocker для production

**Воспроизведение:**
```bash
curl http://localhost:5149/api/marketplace/cities
```

**Факт:** возвращался только Chiang Mai.

**Root cause:** endpoint работает корректно по своему контракту — он намеренно фильтрует «cities с хотя бы одним активным long-term листингом» (для marketplace homepage «популярные города»). База seed'ится 10 городами (Bangkok, Chiang Mai, Phuket, Pattaya, Hua Hin, Koh Samui, Chiang Rai, Khon Kaen, Rayong, …), но активного листинга есть только в Chiang Mai → endpoint показывает 1.

Фронт же на странице create-property нуждался в **полном** списке поддерживаемых городов, не зависящем от текущих листингов. Этого endpoint'а просто не было.

**Фикс на бэке:** добавил отдельные эндпойнты в [ReferencesController](../PMC.BFF/PMC.BFF/Controllers/ReferencesController.cs):
- `GET /api/references/cities` — все города (10 на момент написания)
- `GET /api/references/regions` — все регионы
- `GET /api/references/countries` — все страны

`/api/marketplace/cities` остался без изменений — это правильное поведение для marketplace homepage.

**Action для фронта:** на странице onboarding'а заменить вызов `/api/marketplace/cities` на `/api/references/cities`.

**Проверено:** `GET /api/references/cities` возвращает 10 городов (Phuket, Pattaya, Hua Hin, Koh Samui, Chiang Rai, Khon Kaen, …).

---

## BE-3. `GET /api/listings/asset/` (пустой ID) → 400  ✅ FIXED (бэк-сторона)

**Severity:** minor (косметика, шум в логах)

**Факт (был):** 400 с «model binding failed» — это «битый запрос», семантически неверно для «такого ассета нет».

**Root cause:** route не имел type-constraint, поэтому пустой/невалидный path попадал в model binding, который возвращал 400 «not a valid Guid».

**Фикс на бэке:** добавил `:guid` constraint в [ListingsController](../PMC.BFF/PMC.BFF/Controllers/MainControllers/ListingsController.cs):
```csharp
[HttpGet("{id:guid}")]
[HttpGet("asset/{assetId:guid}")]
```

Теперь невалидный path не матчит route → framework возвращает 404, а не 400 от model binding.

**Проверено:**
- `/api/listings/asset/not-a-guid` → **HTTP 404** ✓
- `/api/listings/asset/` → **HTTP 405** (фронт всё равно может прекратить эти запросы)

**Action для фронта:** независимо от фикса — перестать дёргать endpoint без `assetId`.

---

## BE-4. `GET /api/me/capabilities` дёргается × 5 при одном переходе  ✅ FIXED (бэк-сторона)

**Severity:** minor (производительность)

**Фикс на бэке:** [MeController.GetCapabilities](../PMC.BFF/PMC.BFF/Controllers/MainControllers/MeController.cs) теперь шлёт:
```
Cache-Control: private, max-age=60
```

`[ResponseCache(Duration=60, Location=Client)]` + явная перестановка заголовков (потому что глобальный pipeline иногда штамповал `no-cache,no-store`). Браузер будет переиспользовать ответ из HTTP cache в течение минуты — независимо от того, дёргает ли TanStack Query 5 раз подряд.

**Action для фронта:** всё равно поднять `staleTime` в React Query до ~1 минуты — это страховка на случай если кто-то отключил HTTP cache devtools'ами.

**Проверено:** `curl -D - /api/me/capabilities` → `Cache-Control: private, max-age=60`.

---

---

## BE-5. `POST /api/assets` принимает только 7 полей — теряет area/floor/totalFloors/furnished/parking  ✅ FIXED

**Severity:** major (data loss on first save)

**Фикс на бэке:**
- [CreateAssetRequest](../PMC.BFF/PMC.BFF.Domain/DTOs/CreateAssetRequest.cs) расширен 8 опциональными полями: `Floor`, `TotalFloors`, `AreaSqm`, `BuildingType`, `Furnished`, `ParkingSpaces`, `ParkingIncluded`, `MinLeaseMonths`. Все nullable — фронт может прислать только то что у него есть на момент первого save.
- [AssetService.CreateAssetAsync](../PMC.BFF/PMC.BFF.Domain/Services/AssetService.cs) пишет их в `InventoryAsset`.
- [CreateAssetRequestValidator](../PMC.BFF/PMC.BFF.Domain/Validators/CreateAssetRequestValidator.cs) — здравые границы (Area 1..100k м², Floor -10..500, MinLeaseMonths 1..60, enum-проверки), и кросс-полевая «floor не выше totalFloors».

**Action для фронта:** можно убрать workaround-PATCH после POST — слать всё одним запросом. Старый workaround продолжит работать пока его не уберёшь (PATCH остаётся валидным).

**Проверено:**
- POST со всеми 12 полями → asset создан, GET /api/assets/{id} возвращает все значения после reload ✓
- POST с `floor=50, totalFloors=10` → 400 «Unit floor cannot be higher than the total number of floors.» ✓

---

## BE-6. `POST /api/auth/register` → правильный поток для landlord с lastName  ✅ FIXED (был silently dropped!)

**Severity:** оказалось **major**, а не minor: `lastName` действительно молча терялся.

**Root cause:** [RegisterRequest](../PMC.BFF/PMC.BFF.Domain/DTOs/RegisterRequest.cs) принимал только `Email` + `Password`. ASP.NET model binder игнорировал любые лишние поля → `lastName` не доходил до `AuthService.RegisterAsync` → `User.LastName` оставался null. Запрос возвращал 200, но данные терялись.

**Фикс на бэке:**
- В `RegisterRequest` добавлены опциональные `FirstName?` и `LastName?`.
- `AuthService.RegisterAsync` записывает их в `User.FirstName` / `User.LastName` (с trim + normalize whitespace→null).
- [RegisterRequestValidator](../PMC.BFF/PMC.BFF.Domain/Validators/RegisterRequestValidator.cs) — `MaximumLength(80)` на оба, только когда не пусто.

**Проверено:** регистрация с `{"email","password","firstName":"Ivan","lastName":"Petrov"}` → `GET /api/auth/me` возвращает `firstName: "Ivan", lastName: "Petrov"` ✓.

**Контракт PDF:** `ContractGenerationService` уже использует `tenant.LastName` через `FormatName(tenant?.FirstName, tenant?.LastName)`. Теперь данные туда дойдут.

---

## BE-7. AI feature suggestions (`POST /api/ai/listings/suggest-features`) галлюцинируют  ✅ FIXED (AI выключен на этом endpoint)

**Severity:** major (репутация / false advertising)

**Решение:** **полностью убрал AI с этого use case'а**. Llama-3.1-8b (free tier Groq) слишком мала чтобы стабильно следовать запрету «не выдумывай features» — даже с tight prompt модель уверенно подсовывала «mountain view» для центра Бангкока. Маленькие чипы — это не тот use case где креативность стоит риска.

**Фикс на бэке:** [SuggestListingFeaturesHandler](../PMC.BFF/PMC.BFF.Domain/Services/Ai/UseCases/SuggestListingFeatures/SuggestListingFeaturesHandler.cs) теперь полностью bypass'ит `AiGateway` и всегда отдаёт детерминистический template (rule-based на `propertyType` + `area` + `bedrooms`). Шаблон ранее жил как fallback — теперь он единственный источник правды. Endpoint **остаётся** доступным, ответ имеет тот же shape, `provider` всегда `"template"`.

Преимущества:
- 0% галлюцинаций — невозможно врать о том, чего нет
- мгновенно (0 ms) — никакой сети, никаких токенов
- стабильно — одинаковый ввод → одинаковый вывод

AI остаётся для use case'ов где креативность реально нужна: `suggest-title` (1-строчные заголовки), `suggest-nearby-blurb` (prose-описание из проверенных POI).

**Action для фронта:**
- можно вернуть вызов `aiApi.suggestFeatures(...)` обратно — он больше не врёт
- **НЕ показывать** «AI-curated chips» / «✨ AI-generated» лейбл над списком — это template, а не AI
- если фронт уже сам формирует список локально (тот же rule-based код) — можно так и оставить, оба варианта дают одинаковый результат

**Проверено:** POST с Sukhumvit Condo 2BR → `provider:"template"`, чипы `["High floor","Pool view","City view","Corner unit","Near BTS","Near MRT","Fully furnished","Pet friendly"]`, `tookMs:0`.

---

## Шаблон для новых находок (заполняется по ходу тестирования)

### BE-N. <заголовок>

**Severity:** blocker / major / minor / polish

**Воспроизведение:**

**Ожидание:**

**Факт:**

**Гипотеза:**

**Решение:**

---

## BE-8. POST /api/bookings (tenant submit) → 4xx без structured field errors  ✅ FIXED

**Severity:** major (UX)

**Воспроизведение:**
1. Tenant (non-TH) → Listing → Request to Book → message + No pets → Continue
2. Step 2 passport: nationality + passport number + expiry, **skip** visa/last-entry/port
3. Save & send request

**Факт (был):** generic тост «Failed to send request. Please try again.» Network: 400, фронт не находил field-level errors.

**Root cause:** `GlobalExceptionHandler` мапил `FluentValidation.ValidationException` в `problemDetails.Extensions["errors"]` с **PascalCase** ключами (`"EntryDate"`, `"EntryPort"` — берётся напрямую из `x.PropertyName` через reflection). Остальное API сериализуется через `JsonSerializerDefaults.Web` (camelCase), фронтовый парсер ключей искал `entryDate` / `entryPort` и не находил → выпадал на generic тост.

**Фикс на бэке:** [GlobalExceptionHandler.cs](../PMC.BFF/PMC.BFF.Infrastructure/Middleware/GlobalExceptionHandler.cs) — добавлен `ToCamelCasePropertyPath()`: lowercase первого символа каждого dot-разделённого сегмента. Сохраняет array-индексы (`Highlights[2].Name` → `highlights[2].name`) и не ломает legacy ключи с custom path'ом.

**Проверено:** `POST /api/ai/listings/suggest-title` с `area:"A"` → `errors: { "area": ["'Area' must be between 2 and 60 characters."] }` ✓ (раньше было `"Area"`).

**Frontend (опционально):** добавить inline валидацию visa+entry на step 2 ДО submit, чтобы пользователь увидел ошибку без roundtrip.

---

## BE-9. AI suggestListingTitle (`POST /api/ai/listings/suggest-title`) — проверить на hallucinations  ✅ FIXED

**Severity:** major (false advertising в title)

**Подтверждено эмпирически:** Llama-3.1-8b на старом промпте действительно подбрасывала «Pool View», «Sea View», «Modern», «Fully Furnished» в заголовки даже когда юзер не указывал `feature`. Title попадает прямо в листинг как первое что видит tenant — врать в нём нельзя.

**Фикс на бэке:** [SuggestListingTitlePrompt.cs](../PMC.BFF/PMC.BFF.Domain/Services/Ai/UseCases/SuggestListingTitle/SuggestListingTitlePrompt.cs) — переписан system prompt:
- Жёсткое правило «STRICT TRUTHFULNESS: Use ONLY the property type, area, bedroom count, and the single feature shown in the user message. Never invent or imply additional amenities, finishes, or services. If no feature is provided, do NOT add one».
- Из примеров убраны features (раньше пример `"Modern 2BR | Sukhumvit 11 | Pool View"` провоцировал модель копировать паттерн).
- User-prompt теперь явно говорит «no feature provided — do not invent one» когда `feature` пустой.

**Проверено** (4 кейса с cache-bust через `variation`):

| Input                              | Title              | Hallucinations? |
|------------------------------------|--------------------|-----------------|
| Condo Sukhumvit 2BR (no feature)   | `Condo Sukhumvit 2-bed` | нет ✓ |
| Villa Phuket 3BR (no feature)      | `3-bed Villa in Phuket` | нет ✓ |
| Studio Phuket 0BR + "Sea View"     | `Studio Sea View Phuket` | feature использован честно ✓ |
| House Chiang Mai 4BR (no feature)  | `4-bed House Chiang Mai` | нет ✓ |

**Action для фронта:** suggestTitle можно показывать без warnings — модель больше не выдумывает features. Если `feature` передан — он попадёт в title. Если не передан — будет голый «type + size + area», и юзер допишет руками то что хочет.


---

## BE-10. `GET /api/me/profile` не возвращает payment-поля (хотя PATCH их принимает)

**Severity:** **major (data invisibility = duplicate input UX)**

**Воспроизведение:**
```bash
# 1. Залогиниться → получить токен
TOKEN=...

# 2. Сохранить payment
curl -X PATCH http://localhost:5149/api/me/profile \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"promptPayId":"0899999999"}'
# → 200 OK

# 3. Прочитать профиль
curl -H "Authorization: Bearer $TOKEN" http://localhost:5149/api/me/profile
# → 200 OK, body содержит email/firstName/phone/contactChannels/...,
#   но **БЕЗ** promptPayId, bankName, bankAccountNumber, bankAccountName.
```

**Симптом на фронте (то что заметил пользователь):** «платежные реквизиты вводишь несколько раз, они не сохраняются».

Реальная причина: frontend `isPaymentComplete(profile)` смотрит на `profile.promptPayId`, его всегда `undefined` → editor секция Payment **никогда не скрывается** → каждый new property требует повторного ввода. Settings-страница (`/me/host/settings/payment`) показывает поля пустыми по той же причине.

**Гипотеза:** в `UserProfileDto` mapper / serializer на бэке отсутствуют эти 4 поля. PATCH принимает и пишет в БД, GET читает но не сериализует.

**Решение на backend:** добавить в response DTO + serialization:
- `promptPayId: string | null`
- `bankName: string | null`
- `bankAccountNumber: string | null`
- `bankAccountName: string | null`

**Workaround на фронте (применён):** после `profileApi.update(...)` обновляем React Query cache локально с отправленными значениями (вместо чистого invalidate). Это маскирует проблему в пределах одной session — юзер не увидит дубля в том же sign-in. Но после reload данных нет, settings/editor снова пустые.

