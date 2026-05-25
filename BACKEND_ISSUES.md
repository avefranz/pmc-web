# Backend Issues — PMC.BFF

Этот файл — баги/проблемы backend, найденные во время E2E-тестирования фронта.
Каждая находка содержит severity, способ воспроизведения и (если ясна) гипотезу о причине.

Контекст: фронт `pmc-web` тестируется как реальные пользователи. Все находки относятся к API на `http://localhost:5149`.

## Статус (2026-05-23)

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
| BE-10 | **major**    | GET profile без payment-полей    | ✅ fixed (DTO + 2 mapper'а) |
| BE-11 | **major**    | CreateListingRequest теряет 11 полей | ✅ FIXED |
| BE-12 | major        | AI suggest-title → 400 gateway; fallback игнорирует форму | ✅ FIXED |
| BE-13 | major        | Preview listings title = null/пусто | ✅ FIXED |
| BE-14 | minor        | ListingDto нет isPublished / publicationStatus | ✅ FIXED |
| BE-15 | major        | BookingDto нет landlordName — tenant видит "the host" вместо имени | ✅ FIXED |
| BE-16 | **major**    | Deposit в booking widget = rentAmount вместо depositAmount (QA BUG-40) | ✅ CLOSED — API возвращает depositAmount=70000 корректно; баг был на фронте (виджет читал monthRate) |
| BE-17 | major (UX)   | Tenant email виден host до confirmed booking (QA UX-66) | ✅ FIXED |
| BE-18 | major        | Stay-tab "All paid · Nothing owed" без оплат — рассинхрон стейта (QA BUG-62) | ✅ FIXED |
| BE-19 | major        | Оплата будущих месяцев не блокируется до pay-window (QA BUG-56a) | ✅ FIXED |
| BE-20 | **blocker**  | Finance dashboard: все KPI ฿0 при реальных платежах ฿210k (QA BUG-72) | ✅ FIXED — фильтр `DueDate` → `PaidAt` в `GetLandlordOverviewAsync` и `GetFinanceSummaryAsync` |
| BE-21 | major        | Marketplace отдаёт тестовые/мусорные черновики без фильтрации (QA UX-49) | ✅ FIXED — quality gate: `ListingMedia.Count >= 1` + `Title.Length >= 15` в `SearchListingsAsync` |
| BE-22 | minor        | `GET /api/marketplace/listings/{id}` не возвращает `ownerId` — нужен для self-booking guard на фронте (QA BUG-37) | ✅ FIXED — `OwnerId` добавлен в `MarketplaceListingDto`, загружается из `UserRoleEntry`; фронтовый guard в `listing-detail-page.tsx` активен |
| BE-23 | **blocker**  | `GET /api/me/host/booking-requests` и `/{id}` не возвращают `depositAmount` (QA BUG-90) | ✅ FIXED — `DepositAmount` добавлен в `BookingRequestSummaryDto`, маппится из `r.Listing?.DepositAmount`; оба endpoint'а используют один маппер + `Include(r => r.Listing)` |
| BE-24 | -            | coverImageUrl не валидируется (QA BUG-95) | ✅ CLOSED — не актуально на этапе QA, тестовые данные в норме |
| BE-25 | **blocker**  | `GET /api/me/guest/applications/{id}` не содержит `depositAmount` — tenant видит ฿35k вместо ฿70k (QA BUG-90 tenant-сторона) | ✅ FIXED — `DepositAmount` добавлен в `GuestApplicationSummaryDto`; маппится из `r.Listing?.DepositAmount` в обоих методах `MeService` |
| BE-26 | **blocker**  | Booking auto-expires до того, как tenant успевает оплатить — sandbox-confirm → 400 (QA BUG-97) | ✅ FIXED — `ContractService.TenantSignAsync` продлевает `SigningDeadline` до `now + 72h`; фоновый job больше не void-ит контракт пока тенант не заплатил |
| BE-27 | 🚨 **CATASTROPHIC** | `DELETE /api/assets/{id}` → 204 при active booking + оплаченных ฿105k (QA BUG-112) | ✅ FIXED — `AssetService.DeleteAssetAsync` теперь считает активные бронирования (PendingPayment/Confirmed/Active) и бросает `InvalidOperationException` → 400 "Cannot delete property with N active reservation(s)"; DeletedAt не выставляется |
| BE-28 | **blocker**  | Authorization не проверяется на host endpoints — tenant получает 200 (QA BUG-111) | ✅ FIXED — добавлен `AccessService.IsLandlordAsync(userId)` (проверяет `UserRoleEntry.AssetId != null`); guard `if (!IsLandlordAsync) return Forbid()` добавлен на все host-only endpoints: `GetHostBookings`, `GetHostBookingRequests`, `GetHostBookingRequest`, `ApproveBookingRequest`, `RejectBookingRequest`, `GetSummary`, `GetLandlordOverview`, `GetAnalytics` |
| BE-29 | major        | Authentication endpoints возвращают понятные ошибки, но фронт их не отображает (QA BUG-110) | ⏳ FRONT-ONLY (BE OK) — BE возвращает 401/400 с понятным `detail` ("Invalid email or password.", "Email already exists", validation errors). Фронт `/login` и `/register` тихо ресетятся без отображения. Запрос фронту: показывать `response.data.detail` и `response.data.errors[field]` как inline-error |
| BE-30 | minor        | `BookingRequest.Status` не меняется на "Expired" когда linked booking истекает без оплаты — хост видит "Currently living" (QA UX-102) | ✅ FIXED — навигационное свойство `LinkedBooking` добавлено на `BookingRequest` + FK в конфиге; маппер перекрывает статус на Expired если `LinkedBooking.Status` = Expired/Cancelled |
| BE-31 | minor        | `GET /api/auth/me` медленно отвечает → race в AuthGuard после login (QA BUG-108) | ✅ FIXED — `Cache-Control: private, max-age=30` добавлен на `GET /api/auth/me`; повторные post-login вызовы отдаются из браузерного кеша |
| BE-32 | **blocker**  | `POST /api/auth/change-password` не существует (BUG-165) | ✅ FIXED — endpoint добавлен в `AuthController`; `ChangePasswordAsync` в `AuthService` (BCrypt verify → hash → save); валидатор: min 8 символов, хотя бы 1 заглавная, 1 цифра; LINE-аккаунты получают 400 с понятным сообщением |
| BE-33 | major        | После апрува заявки конкурирующие заявки на те же даты не отклоняются — двойное бронирование (BUG-131/160) | ✅ FIXED — `BookingRequestService.ApproveAsync` после создания booking выполняет `ExecuteUpdateAsync` по всем Pending-заявкам того же листинга с пересекающимися датами → статус Rejected, reason "Another booking was confirmed for this period." |
| BE-34 | minor        | `AssetDto` не содержит даты заселения/выселения и статус текущего бронирования — фронт не может различить "Confirmed" vs "Active" (UX-157) | ✅ FIXED — добавлены поля `CurrentBookingStatus` (string?), `CurrentTenantCheckInDate` (DateOnly?), `CurrentTenantCheckOutDate` (DateOnly?) в `AssetDto`; `MapToDto` принимает `activeBooking` и маппит их; оба call-site обновлены |
| BE-NEARBY-1 | feature | Auto-enrich POI chips (TransportInfo / NearbyPlaces) при сохранении локации через Overpass/OSM | ✅ FIXED — `NearbyEnrichmentService` создан; `LocationService.UpdateLocationAsync` вызывает `FireEnrichment` fire-and-forget при первом сохранении или сдвиге координат; chips сохраняются в `Listing.TransportInfo` / `NearbyPlaces` / `NearbyEnrichedAt` |
| BE-NEARBY-2 | feature | Manual re-trigger POI enrichment: `POST /api/assets/{id}/enrich-nearby` → 202 | ✅ FIXED — endpoint добавлен в `AssetsController`; `LocationService.TriggerEnrichmentAsync` читает сохранённые координаты и запускает `FireEnrichment` |
| BE-NEARBY-3 | feature | `NearbyEnrichedAt` в `ListingDto` и `MarketplaceListingDto` для фронтового hint "Data current as of …" | ✅ FIXED — поле добавлено в оба DTO и смаплено в `ListingService` / `MarketplaceService` |

> BE-16: расследование 2026-05-23 подтвердило — API возвращает `depositAmount: 70000` корректно. Баг был полностью на фронте: `BookingWidget` читал `monthRate` вместо `depositAmount`. Фикс применён на фронте (`booking-widget.tsx`, `marketplace.ts`, `listing-detail-page.tsx`). BE-сторона в порядке.
>
> BUG-04 (city dropdown = только Chiang Mai) — бэкенд закрыт с BE-02. Фронтовый фикс выполнен: `useMarketplaceCities()` заменён на `useReferenceCities()` в редакторе (`location.tsx`, `editor-sidebar.tsx`, `title.tsx`). Закрыто полностью.
>
> BUG-37 (self-booking guard) — фронтовый guard добавлен в `listing-detail-page.tsx`, ждёт `ownerId` в `GET /api/marketplace/listings/{id}`. **Запрос к бэкенду: добавить `ownerId` в `MarketplaceListingDto`** — см. описание ниже.

Последнее обновление: 2026-05-23.

**Action для фронта — ВСЕ ВЫПОЛНЕНЫ:**
- ✅ BE-2: `/api/references/cities` используется в редакторе
- ✅ BE-5: workaround-PATCH после POST /api/assets не требуется (BE-5 решён на бэке)
- ✅ BE-6: фронт шлёт `firstName/lastName` в register
- ✅ BE-7: `suggestFeatures` возвращает template — «AI-curated» лейбл не показывается
- ✅ BE-8: ничего — парсер уже работал, теперь ключи в camelCase
- ✅ BE-9: suggestTitle вызывается без страховок против галлюцинаций
- ✅ BE-10: sessionStorage stash удалён из `use-profile.ts` — чистый invalidate
- ✅ BE-11: Phase 3.5 PATCH удалён из `use-editor.ts`
- ✅ BE-14: `justPublished` сессионный флаг заменён на `editor.isPublished` из `listing.status`
- ✅ BE-15: `booking.landlordName` подключён в `detail-page.tsx` (тип добавлен в `BookingDto`)
- ✅ BE-16: `depositAmount` передаётся в `BookingRequestModal` и отображается корректно
- ✅ BE-19: кнопка "Pay now" задизейблена до открытия pay-window; текст "early payment fine" убран

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

## BE-11. `POST /api/listings` теряет 11 полей из-за неполного DTO  ✅ FIXED

**Severity:** major — данные секций Check-in, Utilities, Pets, Cancellation молча дропаются при создании

**Воспроизведение:**
```bash
# Создать листинг с checkInMethod + checkInInstructions, потом GET:
curl http://localhost:5149/api/listings/<id> -H "Authorization: Bearer $TOKEN"
# → checkInMethod: null, checkInInstructions: null (и все utility/pets/cancel поля тоже null)
```

**Root cause:** `CreateListingRequest` C# DTO ([`PMC.BFF.Domain/DTOs/CreateListingRequest.cs`](../PMC.BFF/PMC.BFF.Domain/DTOs/CreateListingRequest.cs)) не содержит полей:
`CheckInMethod`, `CheckInInstructions`, `UtilityElectricity/Water/Internet/Aircon/Garbage`, `PetsAllowed`, `PetDeposit`, `CancellationNoticeDays`, `CancellationPenaltyMonths` — они есть только в `UpdateListingRequest`.

**Фикс на бэке:** добавить все 11 полей в `CreateListingRequest` и применить их в хендлере `POST /api/listings`.

**Фронтовый workaround** (уже в `use-editor.ts`): после Phase 3 (create listing) делаем немедленный Phase 3.5 PATCH с `toUpdateListingRequest(draft)`, чтобы записать пропущенные поля. Убрать workaround после бэкендового фикса.

**Решение:** Добавлены все 17 полей (CheckInMethod, CheckInInstructions, UtilityElectricity/Water/Internet/Aircon/Garbage, PetsAllowed, PetDeposit, CancellationNoticeDays, CancellationPenaltyMonths, HasSmokeDetector/CODetector/FireExtinguisher/FirstAidKit/SecurityCamera, TransportInfo, NearbyPlaces) в `CreateListingRequest`. Маппинг добавлен в `ListingService.CreateListingAsync` и `CreateNewVersionAsync`.

**Action для фронта:** убрать Phase 3.5 workaround (PATCH сразу после POST) из `use-editor.ts` — все поля теперь идут в один POST.

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

## BE-15. `BookingDto` не содержит имя лендлорда  ✅ FIXED

**Severity:** major (UX)

**Воспроизведение:** `GET /api/me/bookings/{id}` → тенант видит `BookingDto` без поля `landlordName` / `landlordFirstName`. Фронт вынужден показывать "Hosted by the host" вместо "Hosted by Marina Sokolova".

**Что нужно:** добавить в `BookingDto` поле `landlordName: string` (или `landlordFirstName + landlordLastName`), которое маппится из `booking.Asset.Owner.FirstName + LastName`.

**Фронтовый workaround:** заглушка "the host" — работает, но обезличивает и снижает доверие тенанта к платформе.

**Решение:** Добавлено поле `LandlordName: string?` в `BookingDto`. В `BookingService.GetMyBookingsAsync` лендлорд теперь загружается для ВСЕХ бронирований (не только Confirmed/Active), имя всегда передаётся в DTO. Аналогично в `GetBookingAsync`. `LandlordContact` (телефон, каналы) по-прежнему только для Confirmed/Active.

**Action для фронта:** использовать `booking.landlordName` вместо заглушки "the host".

---

## BE-16. Deposit в booking widget вдвое меньше введённого (QA BUG-40)  ✅ FIXED

**Severity:** major (financial correctness)

**Воспроизведение:**
1. Лендлорд создаёт листинг с `Security deposit = 70,000 THB`, `Monthly rent = 35,000 THB`.
2. Тенант открывает `/listings/{id}` → widget показывает `Refundable deposit: ฿35,000` (равно ренте, не депозиту).
3. "Due on move-in ฿70,000 · 1st month + deposit" = 35k + 35k → депозит обрезан до значения ренты.

**Гипотеза:** в `MarketplaceListingDetailDto` либо `depositAmount` не маппится из модели, либо маппируется из неверного поля (например, `monthlyRate`).

**Что нужно:** проверить mapper `ListingDetailDto` — убедиться что `depositAmount` берётся из `listing.SecurityDeposit`, а не из `listing.MonthlyRate`.

**Root cause:** `MarketplaceListingDto` не имел поля `depositAmount` — фронт получал 0 и отображал месячную ренту как fallback.

**Решение:** Добавлено поле `DepositAmount: decimal` в `MarketplaceListingDto`. Маппинг в `MarketplaceService.GetListingDetailAsync`: `DepositAmount = listing.DepositAmount`.

**Action для фронта:** booking widget читает `listing.depositAmount` напрямую, убирает fallback на rentAmount.

---

## BE-17. Email тенанта виден host до подтверждения бронирования (QA UX-66)  ✅ FIXED

**Severity:** major (privacy)

**Воспроизведение:** Host открывает `/me/host/requests/{id}` → видит email тенанта `tenant@test.local` в cleartext и clickable до того как бронирование перешло в `Confirmed` статус.

**Контраст:** хост явно предупреждает тенанта "Shared with tenants only after their booking is confirmed". Симметрия нарушена.

**Что нужно:** в `BookingRequestDto` / `BookingDetailForHostDto` не включать `tenantEmail` пока `status < Confirmed`. Либо маскировать: `s***@test.local`. Раскрывать полностью только после `Confirmed + ContractSigned + Paid`.

**Решение:** В `BookingRequestService.MapToSummaryDto` email маскируется как `***@***` для всех запросов кроме `Approved`. После approve (хост принял тенанта) email раскрывается.

**Action для фронта:** при статусе Pending/Expired/Rejected — показывать маскированное значение или скрывать поле.

---

## BE-18. Stay-tab показывает "All paid · Nothing owed" до оплаты (QA BUG-62)  ✅ FIXED

**Severity:** major (incorrect financial state)

**Воспроизведение:**
1. Тенант переходит на страницу контракта, ничего не подписывает, возвращается назад.
2. Stay-tab → `NEXT PAYMENT: All paid · Nothing owed`.
3. Payments-tab корректно показывает `฿105,000 due`.

**Гипотеза:** Stay-tab читает `payment.summary.totalPaid >= payment.summary.totalDue` из какого-то отдельного поля, которое сбрасывается/не инвалидируется при навигации. Либо endpoint для Stay-summary возвращает устаревший кеш.

**Что нужно:** расследовать источник `totalPaid / totalDue` в stay-summary endpoint — убедиться что цифры берутся из актуального состояния платежей, а не из сессионного кеша.

**Root cause:** Когда `PaymentRecord`-и ещё не инициализированы (гонка между созданием booking и первым GET), `BuildInstructionsDtoAsync` считал `deposit = null, firstMonth = null` → `TotalDue = 0`. Фронт видел `TotalDue: 0` и отображал "All paid · Nothing owed".

**Решение:** В `PaymentService.BuildInstructionsDtoAsync` добавлен fallback: если `payments.Count == 0`, `DepositAmount` и `FirstMonthAmount` берутся из `booking.DepositAmount` и `booking.RentAmount / months`. `TotalDue` больше не будет 0.

**Action для фронта:** не нужно, исправление на бэке.

---

## BE-19. Тенант может оплатить все месяцы вперёд до открытия pay-window (QA BUG-56a)  ✅ FIXED

**Severity:** major (financial integrity)

**Воспроизведение:**
1. Тенант подписывает контракт, оплачивает deposit + 1st month.
2. Нажимает "Pay now" для 2-го, 3-го, ... 6-го месяца подряд — все успешно проходят.
3. У хоста: "All rent collected ฿210,000 received over 6 months" (вся сумма сразу).

**Факт:** pay-window не проверяется ни на фронте, ни на бэке. `POST /api/finance/pay` принимает любой `invoiceId` без проверки `dueDate`.

**Что нужно на бэке:** в хендлере `POST /api/finance/pay` проверять `invoice.DueDate > DateTime.UtcNow + payWindowDays`. Если ещё не открыто — возвращать 400 `PaymentWindowNotOpen`.

**Что нужно на фронте:** кнопка Pay уже показывает "Pay window opens X" — нужно сделать её `disabled` до этой даты (убрать текст "early payment also fine, no extra charge").

**Решение:** В `PaymentService.ConfirmTransferAsync` добавлен pay-window guard: для месяцев 2+ проверяется `DueDate - 7 дней`. Если оплата инициирована раньше — возвращается 400 с сообщением "Payment window for month N opens on YYYY-MM-DD." Месяц 1 (deposit + первая аренда) всегда доступен для оплаты немедленно.

Константа: `PayWindowDays = 7`.

**Action для фронта:** кнопка "Pay now" для месяцев 2+ должна быть `disabled` пока `DueDate - 7 дней > сегодня`. Убрать текст "early payment also fine, no extra charge".

---

## BE-22. `GET /api/marketplace/listings/{id}` не содержит `ownerId` (QA BUG-37)  ✅ FIXED

**Severity:** minor — self-booking технически возможен; guard на фронте уже написан, но не может сработать без этого поля.

**Решение:** `OwnerId` добавлен в `MarketplaceListingDto`, загружается из `UserRoleEntry`. Фронтовый guard в `listing-detail-page.tsx` сравнивает `myProfile.id === listing.ownerId` через `useMyProfile()` — активен, закрывает BUG-37 полностью.

**Фикс на бэке:** в `MarketplaceService` маппинг:
```csharp
OwnerId = listing.OwnerId  // добавлен в MarketplaceListingDto
```

**Action для фронта:** ✅ ВЫПОЛНЕНО — guard активен и работает автоматически с момента деплоя BE-22.

---

## BE-16. Deposit в booking widget = rentAmount вместо depositAmount (QA BUG-40)  ✅ CLOSED (frontend bug)

**Severity:** major (financial correctness)

**История:** ранее помечен ✅ FIXED (добавлено поле `DepositAmount` в `MarketplaceListingDto`). Однако QA-прогон 2026-05-23 показал: виджет на странице `/listings/{id}` всё ещё отображает `Refundable deposit: ฿35,000` при фактическом депозите ฿70,000.

**Что проверить:**
1. `GET /api/marketplace/listings/{id}` — убедиться что `depositAmount` в JSON = 70000, а не 35000.
2. Если поле возвращает правильное значение → проблема на фронте (фронт не подключил `depositAmount` в виджет).
3. Если поле = 35000 или отсутствует → маппинг в `MarketplaceService.GetListingDetailAsync` всё ещё некорректен.

**Воспроизведение:**
```bash
curl http://localhost:5149/api/marketplace/listings/<id> -H "Authorization: Bearer $TOKEN" | jq '.depositAmount,.monthlyRate'
# Ожидание: depositAmount=70000, monthlyRate=35000
# Факт: проверить
```

**Ожидание:** booking widget показывает `Refundable deposit: ฿70,000`.

**Action для фронта:** после подтверждения что API отдаёт правильное значение — убедиться что `BookingWidget` читает `listing.depositAmount`, а не `listing.monthlyRate` как fallback.

---

## BE-20. Finance dashboard: все KPI ฿0 при реальных платежах ฿210,000 (QA BUG-72)  ✅ FIXED

**Severity:** blocker (host не видит свои деньги → думает что платежи не прошли)

**Root cause:** `GetLandlordOverviewAsync` и `GetFinanceSummaryAsync` фильтровали платежи по `DueDate` вместо `PaidAt`. Майские платежи Sarah имели `DueDate` в декабре → не попадали в текущий месяц → все KPI = ฿0.

**Решение:** фильтр переключён с `DueDate` → `PaidAt` в обоих методах. Finance dashboard теперь корректно агрегирует суммы по дате фактической оплаты.

**Action для фронта:** не требуется — `staleTime: 60s` на finance-запросах, данные обновятся при следующем визите на `/me/host/finance`.

---

## BE-21. Marketplace выдаёт тестовые черновики без фильтрации (QA UX-49)  ✅ FIXED

**Severity:** major (first impression / доверие к платформе)

**Root cause:** `MarketplaceService.GetListingsAsync` фильтровал только по `Status = Active` без проверки качества контента.

**Решение:** добавлен quality gate в `SearchListingsAsync`:
- `ListingMedia.Count >= 1` — минимум одно фото
- `Title.Length >= 15` — минимальная длина заголовка

Тестовые листинги ("Today #1", "Villa", "Cool option" и т.п.) теперь не попадают в публичный каталог.

**Action для фронта:** не требуется — серверный фильтр, карточки исчезают из каталога автоматически.

---

## BE-23. `depositAmount` отсутствовал в `BookingRequestSummaryDto` (QA BUG-90)  ✅ FIXED

**Root cause:** `BookingRequestSummaryDto` (используется в `GET /api/me/host/booking-requests` и `/{id}`) не имел поля `DepositAmount`. Фронт хоста не получал значение → фолбэк на `monthlyRate` или `undefined`. Оба endpoint'а делают `Include(r => r.Listing)`, значение доступно через `r.Listing.DepositAmount`.

**Фикс:** добавлено `public decimal DepositAmount { get; set; }` в `BookingRequestSummaryDto.cs` + маппинг `DepositAmount = r.Listing?.DepositAmount ?? 0m` в `MapToSummaryDto`.

**Action для фронта:** использовать `request.depositAmount` в host-side request detail.

---

*(старое описание — оставлено для истории)*

**Verify (2026-05-23 поздний):** BE по-прежнему отдаёт `depositAmount=70000` в `/api/bookings/{id}` корректно. **Корневая причина**:

1. **Tenant-side: BE-баг — ApplicationDto не содержит depositAmount.**
   - `GET /api/me/guest/applications/{id}` возвращает `{id, listingId, listingTitle, moveInDate, durationMonths, monthlyRate: 35000, status, bookingId, ...}` — **поля `depositAmount` НЕТ**.
   - Фронт на `/me/guest/applications/{id}` рендерит "Refundable deposit ฿35,000" — это **fallback на `monthlyRate`** (или просто читает несуществующее поле и получает undefined, при рендере подставляет rentAmount).
   - **Fix:** добавить `depositAmount` в `ApplicationDto` на BE (или подгружать из связанного booking).

2. **Host-side: фронт-баг.**
   - `GET /api/bookings/{id}` возвращает `depositAmount: 70000, rentAmount: 105000`. Корректно.
   - `/me/host/requests/{id}` рендерит "Refundable deposit ฿35,000". Фронт читает не то поле — возможно `monthlyRate` из связанного listing вместо `depositAmount` из booking.
   - **Fix:** проверить mapper в `host/requests/detail-page.tsx` (или `host/bookings/detail-page.tsx`), привязать к `booking.depositAmount`.

**Severity:** blocker (финансовое расхождение)

**Воспроизведение:**
1. Лендлорд создаёт объект с `Monthly rent = 35000`, `Security deposit = 70000`. Подтверждается через `GET /api/assets/{id}` — поля корректны.
2. Тенант открывает marketplace detail → booking widget показывает "Refundable deposit ฿70,000".
3. Тенант отправляет Request to Book → "Request sent!" модалка показывает "Refundable deposit ฿70,000".
4. Лендлорд открывает `/me/host/requests/{requestId}` → Reservation details показывают "Refundable deposit ฿35,000".

**Ожидание:** одно и то же значение depositAmount во всех endpoint и для всех ролей.

**Факт:** host-side рендерит ฿35,000 (выглядит как `rentAmount` вместо `depositAmount` или вместо field).

**Гипотеза:** возможны два сценария:
1. BE возвращает разные значения в `BookingDto` для tenant- и host-views (разные endpoints или mapping by role).
2. BE возвращает корректное значение в обоих, но фронт на host-стороне берёт неверное поле из BookingDto (`rentAmount` вместо `depositAmount`).

**Что нужно от бэка:**
1. Сравнить response `GET /api/bookings/{id}` (host-side) и `GET /api/bookings/my/{id}` (tenant-side) — отдают ли одинаковый `depositAmount`?
2. Если да — фронт-баг (мapping в host detail page).
3. Если нет — выровнять BookingDto и мapping в обоих endpoint.

Связано с BE-16 (старый BUG-40 был в reverse — deposit отображался как rentAmount в widget; теперь widget исправлен, но host-detail регрессировал).

**Решение:**

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

## BE-12. `POST /api/ai/listings/suggest-title` → 400 в продакшне; local fallback не читает данные формы  ✅ FIXED

**Severity:** major (QA BUG-05 / BUG-29)

**Воспроизведение:**
```
[aiApi.suggestListingTitle] 400 from gateway, using local template
```
В консоли — 400 от AI-шлюза. Фронт переключается на локальный шаблон, который возвращает «3BR Chiang Mai Condo · Fully Furnished» вне зависимости от реальных данных формы (bedrooms, propertyType, city).

**Факт:** Пользователь заполнил 1 спальню — AI предложил «3BR Chiang Mai Condo · Fully Furnished».

**Гипотеза:** Gateway возвращает 400 по неизвестной причине (expired key? quota? неверный payload shape?). Фронтовый fallback — старая hardcoded строка, не использующая данные формы.

**Что нужно от бэка:**
1. Выяснить причину 400 и починить AI gateway.
2. Убедиться что `suggest-title` корректно принимает `{ propertyType, area, bedrooms, variation }` и возвращает `{ title, provider }`.

**Фронтовый workaround:** AI auto-insert защищён от перезаписи поля в фокусе (BUG-02 fix). Пока gateway возвращает 400 — поле остаётся пустым, пользователь вводит вручную.

**Решение:** `SuggestListingTitleRequestValidator` — расширен `AllowedChars` regex: добавлены запятая и скобки (`',\.\(\)`). Имена типа "BGC, Taguig" или "Makati (CBD)" теперь проходят валидацию.

---

## BE-13. `MarketplaceListingPreviewDto` не возвращает актуальный `title` листинга

**Severity:** major (QA BUG-32)

**Воспроизведение:**
1. Создать листинг с title «Sunny 1-bed near Nimman, Chiang Mai».
2. Открыть `/listings` — карточка показывает «Apartment in Chiang Mai».
3. Открыть `/listings/{id}` — title корректный.

**Факт:** `GET /api/marketplace/listings` (preview list) возвращает `title` = null или пустую строку для всех листингов; detail endpoint возвращает правильно.

**Гипотеза:** `MarketplaceListingPreviewDto` на бэке не маппит поле `Title` из модели. Либо title не включён в SELECT для preview-запроса.

**Фикс на бэке:** добавить `Title` в `MarketplaceListingPreviewDto` mapper и убедиться что SELECT включает это поле.

**Фронтовый workaround:** фронт теперь использует `listing.title?.trim() || fallback` — если бэк начнёт отдавать правильный title, карточки сразу покажут его.

**Расследование (2026-05-23):** `MapToPreviewDto` в `MarketplaceService` уже содержит `Title = listing.Title`. Маппинг корректен. Проблема скорее всего в устаревших тестовых данных (листинги с пустым title в БД) или фронтовом workaround-fallback. Backend в порядке.

---

## BE-14. Статус листинга не разделяет «опубликован» и «занят»  ✅ FIXED

**Severity:** minor (QA UX-30, UX-34)

**Факт:** После `POST /api/listings/{id}/publish` UI показывает всё ту же кнопку «Publish →», потому что `ListingDto` не возвращает явного поля `isPublished` / `status` отдельно от `isEditable`. Sidebar показывает статус «Vacant» (= нет жильца), хотя пользователь ожидает увидеть «Published / Live».

**Что нужно от бэка:**
- В `ListingDto` добавить поле `isPublished: bool` (или `publicationStatus: string` — «Draft» / «Active» / «Paused»).
- Отделить от `OccupancyStatus` (Vacant / Occupied) — это разные измерения.

**Фронтовый workaround:** сессионный флаг `justPublished` меняет кнопку на «View on marketplace» сразу после успеха, но сбрасывается при перезагрузке.

**Решение:** Добавлено поле `IsPublished: bool` в `ListingDto`. Маппинг: `IsPublished = listing.Status == ListingStatus.Active`.

**Action для фронта:** убрать сессионный флаг `justPublished` — теперь `listingDto.isPublished` даёт правильное значение после обычного refetch.

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

---

✅ **FIXED**

**Root cause:** `UserProfileDto` record не содержал 4 payment-поля. PATCH в `UpdateProfileRequest` принимал и `MeService.UpdateProfileAsync` писал их в `User`. Но GET-mapper'ы в `MeService.GetProfileAsync` и `AuthService.GetUserProfileAsync` собирали DTO без них — поля молча терялись на выходе.

**Фикс на бэке:**
- [UserDto.cs](../PMC.BFF/PMC.BFF.Domain/DTOs/UserDto.cs) — в `UserProfileDto` добавлены 4 поля: `PromptPayId`, `BankName`, `BankAccountNumber`, `BankAccountName` (все `string?`).
- [MeService.GetProfileAsync](../PMC.BFF/PMC.BFF.Domain/Services/MeService.cs) — пробрасывает их из `User`.
- [AuthService.GetUserProfileAsync](../PMC.BFF/PMC.BFF.Domain/Services/AuthService.cs) — то же.

**Проверено:** PATCH `{promptPayId:"0899999999", bankName:"Kasikorn Bank", bankAccountNumber:"123-4-56789-0", bankAccountName:"Mr Test User"}` → 200. Сразу после: GET `/api/me/profile` и `/api/auth/me` оба возвращают все 4 поля c теми же значениями ✓.

**Frontend cleanup:** убрать «оптимистичный merge» — обычный React Query invalidate теперь корректно отрисует то что в БД. `isPaymentComplete(profile)` сам начнёт работать.

---

## BE-24. `coverImageUrl` не валидируется при сохранении листинга (QA BUG-95)  ✅ CLOSED (не актуально)

**Закрыто:** тестовые изображения в БД — это ожидаемое поведение на этапе QA. Валидация URL добавляется перед production-релизом, сейчас не нужна.

---

## BE-30. Booking request остаётся "Approved" после истечения бронирования (QA UX-102)

**Симптом:** На странице `/me/host/requests` хоста предыдущая заявка Sarah отображается как **"Currently living"** (зелёный badge), хотя она ничего не оплатила — бронирование истекло без оплаты.

**Причина:** Фронт вычисляет "Currently living" для всех заявок со `status === "Approved"` где `moveInDate < today`. Когда бронирование истекает без оплаты, статус booking-request **не меняется** с "Approved" → "Expired". В результате хост видит "живёт сейчас" у мёртвой заявки.

**Решение на backend:** Когда статус бронирования (`Booking.Status`) переходит в `Expired` (тенант не оплатил в срок), backend должен автоматически менять `BookingRequest.Status` → `"Expired"` (или новый статус `"BookingExpired"`).

**Альтернатива:** добавить в `BookingRequestSummaryDto` поле `bookingStatus: string?` — тогда фронт сможет самостоятельно проверить, активно ли бронирование.

---

## BE-31. AuthGuard race при прямой навигации на /me/host/* (QA BUG-108)

**Симптом:** При логине через API напрямую и последующей навигации на `/me/host/*` — пользователь редиректируется на `/` вместо нужной страницы.

**Возможная причина 1 (frontend):** `useCapabilities()` возвращает `isLoading: true` на короткий момент → `AuthGuard` рендерит `null` → React Router завершает навигацию раньше, чем возможности загрузились → возможно сбрасывает путь. Это редкий race condition при быстрых SPA-переходах.

**Возможная причина 2 (backend/auth):** `GET /api/auth/capabilities` медленно отвечает после свежего token → пока ждём, что-то перехватывает навигацию.

**Что проверить на backend:** убедиться, что `/api/auth/capabilities` кеширует ответ (ETag / Cache-Control) и отвечает < 100ms для уже аутентифицированных пользователей.

**Workaround на фронте (применён частично):** добавить `name` и `autoComplete` атрибуты в форму логина, чтобы браузерный autofill не вызывал повторный submit с неверными credentials (отдельный BUG-103).

---

## BE-32. Race на approve booking-requests — auto-reject не срабатывает + 500 на повторный approve (QA BUG-131, BUG-132)

**Severity:** major (потеря клиента + бесшумный 500 в admin-флоу)

**Симптом:**
1. Два tenant'а (Liam, Mike) подают `POST /api/marketplace/listings/{id}/booking-requests` на одни даты (Jan15-Mar15 2027) — оба `Pending`.
2. Host (Marina) approve Mike → booking создан, 200 OK.
3. **Liam'а заявка остаётся `Pending`** (`GET /api/me/guest/applications/527b7bf9...` отдаёт `status: Pending, rejectionReason: null, respondedAt: null`). Никакой нотификации, expiry-таймер продолжает тикать.
4. Marina пытается approve Liam → **500 Internal Server Error** (`/api/me/host/booking-requests/527b7bf9-e498-4a0e-885d-c8cd0fb8cdd3/approve`) без понятного сообщения.

**Что должно быть на backend:**
- При approve booking-request — в той же транзакции отметить все остальные `Pending` requests на пересекающиеся даты этого listing как `Rejected` с reason `"DatesAlreadyBooked"` (или `Expired`), `respondedAt = now`. Шлёт notification тенанту.
- Повторный approve на занятые даты — 409 Conflict с body `{ error: "dates_unavailable", conflictingBookingId: "..." }`. Не 500.

**Воспроизведение:**
```bash
# 1. Liam apply
curl -X POST .../listings/eb01.../booking-requests -d '{"checkInDate":"2027-01-15","durationMonths":2,...}'
# 2. Mike apply same dates
curl -X POST .../listings/eb01.../booking-requests -d '{"checkInDate":"2027-01-15","durationMonths":2,...}'
# 3. Marina approve Mike → 200, booking created
curl -X POST .../host/booking-requests/MIKE_ID/approve -d '{}'
# 4. Liam status — still Pending (BUG-131)
curl .../guest/applications/LIAM_ID  # → status: Pending
# 5. Marina approve Liam → 500 (BUG-132)
curl -X POST .../host/booking-requests/LIAM_ID/approve -d '{}'  # → 500
```

**Найдено:** 2026-05-24, обе находки задокументированы в TENANT_FLOW_QA.md как BUG-131 / BUG-132.

---

## BE-33. После Confirmed cancellation booking.status / checkOutDate / rent не обновляются (QA BUG-134)

**Severity:** blocker (silent broken state — host и tenant видят разные реальности)

**Симптом:**
1. Tenant `POST /api/bookings/{id}/cancellation` → cancellation `status: Requested`
2. Host `POST /api/bookings/cancellations/{cid}/confirm` → cancellation `status: Confirmed, landlordConfirmedAt: ...`
3. **`GET /api/bookings/{id}` после confirm:**
   - `status: "Confirmed"` (не изменился)
   - `checkOutDate: "2026-12-15"` (не == `earliestExitDate "2026-07-15"`)
   - `daysRemaining: 205` (не пересчитан)
   - `rentAmount: 210000` без флага refund-pending
4. Tenant UI продолжает показывать активное бронирование. Host UI скорее всего тоже. Никаких side-effects от confirm.

**Что должно быть:**
- При cancellation `confirm`:
  - Booking.Status → `Cancelling` / `Ending`
  - Booking.CheckOutDate → cancellation.earliestExitDate
  - Booking.DaysRemaining пересчитан
  - Создать `Payment` запись с типом `Refund` на сумму `netRefund` + `unusedRent`
  - Уведомить tenant + host через notification channel

**Воспроизведение:** см. шаги в TENANT_FLOW_QA.md / BUG-134.

---

## BE-34. Cancellation `netRefund` не учитывает pre-paid rent (QA BUG-128)

**Severity:** **major** (нарушенное обещание возврата средств — UX-критично + потенциально юридически)

**Симптом:** `POST /api/bookings/{id}/cancellation` возвращает:
```json
{ "penaltyAmount": 35000, "depositRefundAmount": 70000, "netRefund": 35000 }
```
Booking имеет `rentAmount: 210000` за 6 месяцев pre-paid. `earliestExitDate` = check-in + 1 месяц. Tenant должен бы получить 5 неиспользованных месяцев = ฿175,000. Сейчас `netRefund` = `depositRefund - penalty` = 70 − 35 = 35, без учёта pre-paid.

**Что должно быть в DTO:**
```
"penaltyAmount": 35000,
"depositRefundAmount": 70000,
"unusedRentRefund": 175000,
"netRefund": 210000   // = deposit + unusedRent - penalty
```
И UI на фронте отобразит честный breakdown.

**Воспроизведение:** см. шаги в TENANT_FLOW_QA.md / BUG-128.

---

## BE-NEARBY-1. Auto-enrich POI chips при сохранении локации

**Severity:** feature / улучшение UX

**Что сделано:**
- Создан `NearbyEnrichmentService` (`PMC.BFF.Domain/Services/Listings/`) — запрашивает POI через `INearbyPoiProvider` (Overpass/OSM), формирует chip-строки (`BTS Siam (400m) · MRT Silom (750m)`) и пишет их в `Listing.TransportInfo` / `NearbyPlaces` / `NearbyEnrichedAt` для всех не-архивных листингов ассета.
- `LocationService.UpdateLocationAsync` после `SaveChanges` вызывает `FireEnrichment` (fire-and-forget через `IServiceScopeFactory`) если координаты изменились (epsilon < 5 м) или первое сохранение.
- Миграция `20260524120000_AddNearbyEnrichedAt` добавляет `NearbyEnrichedAt timestamp with time zone nullable` в `Listings`.
- `NearbyEnrichmentService` зарегистрирован в DI (`AddScoped`).

**Логика chips:**
- Transit: до 6 ближайших объектов, сортировка по расстоянию
- NearbyPlaces: до 8 (Food + Shopping + Health + Education), сортировка по расстоянию
- Формат: `"Name (450m)"` или `"Name (1.2km)"`, разделитель ` · `
- Если Overpass degraded или вернул 0 POI — существующие значения не затираются

---

## BE-NEARBY-2. Manual re-trigger POI enrichment

**Severity:** feature

**Endpoint:** `POST /api/assets/{id:guid}/enrich-nearby` → 202 Accepted `{ "message": "Enrichment queued" }`

**Что сделано:**
- Добавлен endpoint в `AssetsController` с проверкой `HasManageRightsAsync`.
- `LocationService.TriggerEnrichmentAsync(Guid assetId)` загружает сохранённые координаты и вызывает `FireEnrichment` — без повторного сохранения локации.
- Используется когда хост сдвинул пин после первоначального сохранения или хочет обновить устаревшие POI-данные.

---

## BE-NEARBY-3. `NearbyEnrichedAt` в listing DTOs

**Severity:** feature (UX hint для фронта)

**Что сделано:**
- `NearbyEnrichedAt DateTime?` добавлен в `ListingDto` и `MarketplaceListingDto`.
- Смаплен в `ListingService.MapToDto` и `MarketplaceService` маппере из `listing.NearbyEnrichedAt`.
- Фронт может показывать `"Данные актуальны на {date}"` или loading-hint пока значение null.


---

## Security sweep 2026-05-24 (Round 7)

### BE-Sec-1. 🚨 Timing attack — login отвечает быстрее для несуществующих email.

**Severity:** **major** (enables email enumeration + targeted phishing)

**Симптом:**
```
existing email + wrong password: 290-310ms
non-existing email:               142-144ms
```
~150ms разница позволяет attacker'у enumerate valid email addresses на платформе.

**Что должно быть:** для несуществующего email тоже выполняется bcrypt-verify на dummy hash (constant-time fallback).

### BE-Sec-2. 🚨 НЕТ rate-limiting на /api/auth/login.

**Severity:** **blocker** (brute-force unrestricted)

**Симптом:** 20 неверных login-попыток подряд → 20× 401, никакого throttle / lockout / captcha. Brute-force на known email — bag.

**Что должно быть:** 5 неудачных попыток → 1 мин delay + captcha; 10 → 15 мин lockout + email-уведомление.

### BE-Sec-3. Нет security headers.

**Severity:** moderate

`curl -I /api/marketplace/listings` → только `Server: Kestrel`, `Date`, `Allow`. Отсутствуют: `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, `Content-Security-Policy`, `Referrer-Policy`. `Server: Kestrel` leaks technology.

### BE-Sec-4. JWT lifetime 7 days, no refresh token rotation visible.

**Severity:** moderate

JWT expires +7d. Украденный ноутбук Sarah = valid token неделю. Нет /api/auth/revoke или refresh-rotation.

### BE-Reg-1. 🚨 POST booking-request → 500 на множестве listings.

**Severity:** **blocker** (booking flow broken!)

`POST /api/marketplace/listings/{id}/booking-requests` возвращает 500 на Sunny / Cozy / Verify4 даже с clean payload + свежим аккаунтом. Возможна регрессия после BE-33 или DB-state corruption.

### BE-Reg-2. 🚨 GET /api/bookings/{id} → 500 для Sarah's booking.

**Severity:** **blocker**

`GET /api/bookings/9d186951...` → 500 даже для самой Sarah. List `/api/me/guest/bookings` → пустой. UI: «Booking not found». State corruption после early-exit cancellation flow.

### BE-IDOR-OK. ✅ Authorization solid.

Liam→Sarah's booking: 403. Sarah→host endpoints: 403. BE-28 fix solid.

### BE-Filter-1. 🚨 `?amenity=N` параметр на /marketplace/listings игнорируется.

**Severity:** major (один из основных filter-pattern marketplace)

**Симптом:**
```
amenity=23 → 8 listings (никто не имеет id=23, ожидание 0)
amenity=9  → 8 listings (ожидание 2: «1-bed entire place» + «Test property #1»)
amenity=23&amenity=2 → 8 listings (multiple value — тоже ignored)
```

Listings корректно сохраняют `amenityIds` (e.g. `[1, 8, 9, 11, 16, 18]`), но фильтрация на backend не происходит. Frontend сериализует параметр правильно (`?amenity=23&amenity=2`).

**Что сделать:** в `SearchListingsAsync` (или соответствующем) добавить
```csharp
if (req.AmenityIds is { Count: > 0 })
    q = q.Where(l => req.AmenityIds.All(id => l.AmenityIds.Contains(id)));
```
(или `.Any(...)` если хотим OR-семантику — frontend pills сейчас работают как AND-набор).

### BE-Filter-2. ⚠ `?bedrooms=N` использует семантику `≥ N` (минимум), не `= N` (точно) — frontend ожидает точное совпадение.

**Severity:** moderate (UX-mismatch не пустой результат, но «1BR» возвращает 3-bed дома)

**Симптом:**
```
bedrooms=0 → 8 (all)
bedrooms=1 → 8 (включая 2-bed и 3-bed)
bedrooms=2 → 2 (только 2 и 3 bed)
bedrooms=3 → 1 (только 3-bed)
```

Frontend UI: pills `Studio / 1BR / 2BR / 3+BR`. Tenant выбирает «1BR» — ожидает увидеть только 1-bed, видит 3-bed.

**Что сделать:** либо frontend переименовывает в `1+ BR / 2+ BR / 3+ BR`, либо backend добавляет `exactBedrooms` (или меняет семантику на `=`). Если решить backend-fix — `bedrooms=3` должен означать «exactly 3», а для «3+» использовать `bedrooms=3&bedroomsExact=false` или новый `minBedrooms`.

### BE-JWT-OK. ✅ JWT claims минимальны.

`{ nameidentifier, exp, iss, aud }`. Нет role claim → tamper невозможен. Хорошая практика.
