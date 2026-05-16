# AI Gateway — use case #2: «Suggest standout features»

Дополнение к [BACKEND_AI_GATEWAY.md](BACKEND_AI_GATEWAY.md). Тот же шаблон, что и для `suggest-title` — добавляется второй use case в уже существующий gateway. Должно занять 10–15 минут.

Цель: чипы «Standout feature» в hosting-флоу (`/me/host/properties/new`) сейчас собираются локальной rule-based функцией на фронте. Хотим, чтобы их курировал тот же AI gateway, как и заголовок. Качество предложений выше + UX-плашка «AI-generated» становится правдой.

---

## 1. Endpoint

```
POST /api/ai/listings/suggest-features
Authorization: Bearer <jwt>
Content-Type: application/json
```

### Request

```json
{
  "propertyType": "Villa",            // тот же enum, что и для suggest-title
  "area":         "Phuket",           // 2–60 chars, тот же charset
  "bedrooms":     3                   // 0–10
}
```

`feature` и `variation` тут не нужны — этот endpoint возвращает **список** чипов целиком, фронт сам разрулит выбор пользователя.

### Response 200

```json
{
  "data": {
    "features": [
      "Private pool",
      "Sea view",
      "Garden",
      "Beach access",
      "Sunset terrace",
      "Outdoor shower",
      "Fully furnished",
      "Pet friendly"
    ],
    "provider": "groq",
    "cached":   false,
    "tookMs":   420
  },
  "success": true,
  "message": null,
  "errors":  null
}
```

### Контракт

- **Длина списка:** ровно 6–10 чипов. Не меньше 6, не больше 10. Меньше — UI выглядит пусто, больше — переполняет flex-wrap.
- **Каждый чип:** 2–24 символа, заглавная первая буква, без эмодзи, без markdown, без скобок.
- **Дедупликация:** уникальные строки, регистр-нечувствительно.
- **Контекстная релевантность:**
  - Бангкокские районы (Sukhumvit/Sathorn/Silom/etc.) → пушим транспорт («Near BTS», «Near MRT»), High floor, City view.
  - Прибрежные (Phuket/Koh Samui/Hua Hin/Pattaya) → Sea view / Beach access / Private pool / Sunset terrace.
  - Горные (Chiang Mai/Chiang Rai) → Mountain view / Quiet area / Garden.
  - Villa/House → пушим Private pool, Garden, Outdoor space.
  - Studio/Condo → High floor, City view, Pool view (общедомовой), Corner unit.
  - Если bedrooms=0 (студия) — не пушим «Master suite», «Kids room» и т.п.

Если AI вернёт что-то не подходящее по этим правилам — sanitiser на сервере должен это резать. Лучше пусть лучше будет 6 хороших чипов, чем 10 шумных.

### Error responses

| Код | Когда | Что фронт делает |
|---|---|---|
| `400` | вне enum / area вне 2–60 / bedrooms вне 0–10 | Pre-submit валидация всё это режет, до сети не доходит. Если придёт — фронт упадёт на свой локальный template (та же логика, что и для title) |
| `401` | плохой JWT | Стандартный auth-flow |
| `429` | rate limit (общий пул с suggest-title — 30/час на пользователя) | Локальный template fallback |

**Никогда не падает 5xx.** Как и в title-эндпойнте: если все провайдеры легли — отдаёшь `provider: "template"` с шаблонным списком (см. §4) и `200`.

---

## 2. Промпт (для Groq / Pollinations)

```
You suggest standout marketplace features for a rental listing in Thailand.

Property: {PropertyType} in {Area}, Thailand.
Size: {BedroomsLabel}.

Output rules:
- Output ONLY a JSON array of 6 to 10 short feature labels.
- Each label: 2 to 24 characters, Title Case, no emoji, no markdown, no parentheses.
- Features must be plausibly true for the property type and location.
- For Bangkok districts (Sukhumvit, Sathorn, Silom, Asok, etc.): include transit ("Near BTS" / "Near MRT") and a view feature.
- For beach destinations (Phuket, Koh Samui, Pattaya, Hua Hin): include "Sea view" or "Beach access".
- For mountain destinations (Chiang Mai, Chiang Rai): include "Mountain view" and quiet/garden features.
- For Villas/Houses: include outdoor amenities (private pool, garden).
- Always include "Fully furnished" and "Pet friendly" as the last two items if relevant.
- No duplicates.

Output ONLY the JSON array, nothing else. Example:
["Private Pool","Sea View","Garden","Outdoor Shower","Beach Access","Sunset Terrace","Fully Furnished","Pet Friendly"]
```

`{BedroomsLabel}` собирается на сервере как `"Studio"` для bedrooms=0, иначе `"{N}-bed"`.

JSON-парсинг — обернуть в try/catch: если модель отдала не валидный JSON или массив < 6 элементов — fallback на template.

---

## 3. Структура кода

По §10 BACKEND_AI_GATEWAY.md — новый use case заводится так:

```
PMC.BFF/
└── Features/Ai/UseCases/SuggestListingFeatures/
    ├── SuggestListingFeaturesRequest.cs
    ├── SuggestListingFeaturesResponse.cs
    ├── SuggestListingFeaturesHandler.cs
    └── SuggestListingFeaturesPrompt.cs
```

Контроллер:

```csharp
[HttpPost("listings/suggest-features")]
public async Task<IActionResult> SuggestFeatures(
    [FromBody] SuggestListingFeaturesRequest req, CancellationToken ct)
    => Success(await _gateway.RunAsync<SuggestListingFeatures>(req, ct));
```

Кеш на бэке — те же 60 мин по ключу `$"ai:listing-features:{type}:{area.ToLower()}:{bedrooms}"`. Variation в этом use case нет, поэтому ключ короче.

---

## 4. Template fallback (`TemplateAiClient.SuggestFeatures`)

Логика 1:1 как сейчас живёт на фронте в `src/features/me/host/properties/create-page.tsx` → `relevantFeatures()`. Перенесите её в C#:

```csharp
public IReadOnlyList<string> SuggestFeatures(SuggestListingFeaturesRequest r)
{
    var area = r.Area.Trim().ToLowerInvariant();
    var isBkk = BangkokDistricts.Contains(area);
    var isBeach = BeachDestinations.Contains(area);
    var isMountain = MountainDestinations.Contains(area);

    var list = new List<string>();
    switch (r.PropertyType)
    {
        case "Villa":     list.AddRange(new[] { "Private pool", "Garden", "Pool view" }); break;
        case "House":     list.AddRange(new[] { "Garden", "Corner unit", "Pet friendly" }); break;
        case "Townhouse": list.AddRange(new[] { "Garden", "Corner unit" }); break;
        case "Condo":     list.AddRange(new[] { "High floor", "Pool view", "City view", "Corner unit" }); break;
        case "Studio":    list.AddRange(new[] { "High floor", "City view" }); break;
        default:          list.Add("Corner unit"); break;
    }
    if (isBkk)      list.AddRange(new[] { "Near BTS", "Near MRT" });
    if (isBeach)    list.Add("Sea view");
    if (isMountain) list.Add("Mountain view");

    list.AddRange(new[] { "Fully furnished", "Pet friendly" });

    return list.Distinct(StringComparer.OrdinalIgnoreCase).Take(8).ToList();
}

private static readonly HashSet<string> BangkokDistricts = new(StringComparer.OrdinalIgnoreCase)
{
    "sukhumvit", "sathorn", "silom", "asok", "phrom phong", "thonglor",
    "ekkamai", "ari", "nana", "ratchada", "chatuchak", "on nut", "udomsuk",
    "lat phrao", "victory monument",
};
private static readonly HashSet<string> BeachDestinations = new(StringComparer.OrdinalIgnoreCase)
{
    "phuket", "koh samui", "pattaya", "hua hin", "cha-am",
};
private static readonly HashSet<string> MountainDestinations = new(StringComparer.OrdinalIgnoreCase)
{
    "chiang mai", "chiang rai",
};
```

Этот же fallback используется когда:
- Groq упал
- Pollinations упал
- Модель вернула невалидный JSON
- Меньше 6 чипов после санитайзера

---

## 5. Что я (фронт) поменяю когда эндпойнт поднимется

Один файл, одна функция. Сейчас в `src/features/me/host/properties/create-page.tsx`:

```ts
const chips = relevantFeatures(typeId, area, feature);
```

Заменится на:

```ts
const { data: features } = useQuery({
  queryKey: ["ai-features", typeId, area.trim().toLowerCase(), bedrooms],
  queryFn: () => aiApi.suggestFeatures({
    propertyType: typeName as AiPropertyType,
    area: area.trim(),
    bedrooms: bedrooms!,
  }),
  enabled: bedroomsReady,
  staleTime: 60 * 60 * 1000, // совпадает с серверным TTL
});
const chips = ensureSelectionVisible(features ?? [], feature);
```

`ensureSelectionVisible` — пара строк, чтобы текущий выбор пользователя всегда был в списке, даже если AI его не предложил.

Плашка «curated for your spot» уже подготовлена в UI — сейчас просто скрыта чтобы не обманывать про AI. После подключения — поставим обратно с шиммером.

---

## 6. Чеклист для запуска

- [ ] `SuggestListingFeaturesRequest` / `Response` DTOs
- [ ] `SuggestListingFeaturesHandler` с цепочкой fallback
- [ ] `SuggestListingFeaturesPrompt.Build()` + JSON-парсинг ответа модели
- [ ] `TemplateAiClient.SuggestFeatures()` — порт логики с фронта
- [ ] Sanitiser режет дубли, эмодзи, длинные строки, ограничивает 6–10 чипами
- [ ] Кеш ключ + 60-мин TTL
- [ ] Rate limit — общий с suggest-title (тот же лимитер, тот же бакет)
- [ ] Тест: Sukhumvit Condo → BTS/MRT в выдаче; Phuket Villa → Sea view + Private pool; Chiang Mai House → Mountain view + Garden; никаких BTS в выдаче для Phuket.
- [ ] Swagger описание

---

## 7. Почему не делать на фронте

Те же причины что и для title, но дополнительно:
- Логика «что считать релевантным» меняется со временем (рынок, сезоны). На бэке — A/B тестить и итерировать промпт, на фронте — ждать релиза.
- Фронтовый rule-based код сейчас покрывает ~5 районов. Реальный пользователь напишет «Krabi», «Hat Yai», «Pak Chong» — fallback вернёт обобщённый список. AI справится без новых правил.
- Дубликаты с title-эндпойнтом по auth/rate-limit/observability — всё уже есть, переиспользуется.

---

## 8. Открытые вопросы

1. **Чувствительность к стилю объявления.** Сейчас не различаем «эконом» vs «премиум». Можно потом добавить ценовой диапазон в request — для премиум-вилл нагенерится «Butler service», «Chef on demand», для эконома — «Free WiFi», «Hot water». MVP — без этого, ровный middle-ground.
2. **Локализация.** Все фичи английские. Когда пойдёт TH-локаль фронта — у нас будет ещё одно поле `locale: "en" | "th"` в request. Сейчас не закладываем.
3. **Cache invalidation.** 60 минут TTL — нормально. Если хочется глобально дёрнуть кеш (например, после улучшения промпта) — `IMemoryCache.Clear()` достаточно.

---

При вопросах пинг сюда. Всё бесплатно, общий лимит у нас 14k Groq-запросов в день — на features это +~30% запросов поверх title, всё уложится.
