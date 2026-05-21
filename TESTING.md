# E2E Test Plan — Siamo

Сквозной end-to-end сценарий: landlord регистрируется → создаёт объект → tenant регистрируется → бронирует → landlord одобряет → tenant подписывает контракт → tenant оплачивает.

Тестируется как реальные пользователи без априорных знаний о коде. UX и понятность важны наравне с функциональностью.

---

## Легенда

**severity:** blocker / major / minor / polish
**scope:** frontend / backend / ux / a11y
**status:** open / fixed / partial / wontfix

---

## Окружение

- Frontend: http://localhost:5173
- Backend: http://localhost:5149
- Landlord: `landlord-e2e-2026@pmc.test` / `Test1234!`
- Tenant: будет создан позже

---

## Backend issues

Все backend-находки — в отдельном файле [BACKEND_ISSUES.md](BACKEND_ISSUES.md), его можно целиком отдать команде PMC.BFF.

---

## Bug log — frontend

### S1. Регистрация landlord (`/register`)

| # | Что | Severity | Scope | Status |
|---|-----|----------|-------|--------|
| B-1 | Только First name. Для контракта нужна фамилия. | major | frontend/ux | **fixed** — добавил поле Last name (`pages/register.tsx`, `api/auth.api.ts`, `hooks/use-auth.ts`). Backend `register` принимает lastName. |
| B-2 | Нет чекбокса Terms / Privacy. | major | frontend/legal | **fixed** — добавил required checkbox со ссылками `/terms` и `/privacy`. NB: сами страницы `/terms`, `/privacy` ещё нужно создать. |
| B-3 | На `/login` есть LINE OAuth, на `/register` — нет. | minor | frontend | open |
| B-4 | Пароль только «At least 8 characters», без требований сложности. | minor | frontend | open |
| B-5 | Валидация только при submit, нет on-blur. | polish | frontend | open |

### S2. Onboarding intent (`/me/onboarding/intent`)

| # | Что | Severity | Scope | Status |
|---|-----|----------|-------|--------|
| B-7 | «Get started →» не выглядит как primary CTA. | minor | ux/frontend | open |
| B-8 | Нет welcome-обращения после регистрации. | polish | ux | open |

### S3. Editor — Property type & size (1/11)

| # | Что | Severity | Scope | Status |
|---|-----|----------|-------|--------|
| B-9 | «2 of 11 required steps» показано до того как юзер что-то заполнил. | major | frontend | **fixed** — снял `required: true` с секций `cancel.tsx` и `utilities.tsx` (у них trivial isComplete и валидные дефолты). Теперь счётчик начинается с 0/9 (число настоящих required секций уменьшилось). |
| B-10 | Иконки Property type все одинаковые (куб). | minor | polish | open |
| B-11 | Bedrooms = 0 по умолчанию, нет подсказки что это Studio. | minor | ux | open |
| B-12 | «Floors in building» специфично для тайских кондо, нужен тултип. | polish | ux | open |
| B-13/B-23 | CTA «Fill required fields» disabled, не указывает какие именно поля. | minor | ux/frontend | **partial** — обновил текст на «Fill required fields (marked *)». Глубокий фикс требует API в SectionDef для inline-errors по конкретным полям — отдельная задача. |
| B-14 | Floating bottom-right «3/11 required steps · keep going» дублирует верхний прогресс. | polish | frontend | open |
| B-15 | Unit floor / Floors in building — нет валидации (floor может быть > floors). | minor | frontend | open |
| B-16 | Area (m²) без дефолта и без min validation. | polish | frontend | open |
| B-17 | Number-поля имеют `type="text"` — на mobile keyboard alphanumeric. | minor | frontend/a11y | open |
| B-18 | Required-mark `*` маленькая и плохо заметная. | polish | frontend | open |

### S3. Editor — Address & location (2/11)

| # | Что | Severity | Scope | Status |
|---|-----|----------|-------|--------|
| B-20 | Карта по дефолту центрирована на Бангкоке, хотя cities только Chiang Mai. | minor | frontend | open |
| B-21 | Postal code prefilled = `10110` (Bangkok ZIP) по дефолту. | minor | frontend | open |
| B-22 | Address autocomplete не имеет `role="option"`/aria — screen reader не увидит. | minor | a11y | open |
| B-23 | (см. выше) | | | |

### S3. Editor — секции 3-11 (Pricing → Listing title) ✅ + Save Property ✅

Объект создан: UUID `da2093c7-1439-49b8-9b8f-cb9cc025871e`. Все required секции зелёные, кроме Photos (editOnly, доступны после Save).

**Дополнительные находки (S3 продолжение):**

| # | Где | Что увидел | Severity | Scope |
|---|----------|------------|----------|-------|
| B-26 | Address & location | CTA Update остаётся disabled даже если Street, Legal, Postal заполнены — чтобы секция считалась complete, нужно либо выбрать адрес из autocomplete (для координат), либо кликнуть на карте. Подсказки нет. | major | ux/frontend |
| B-27 | Photos (create-mode) | «Save your property first to upload photos» — но Save сверху disabled пока не все секции заполнены. Юзер может запутаться. | minor | ux |
| B-28 | Country code +66 в Contact | Не понятно как сменить (для не-тайских хостов). | polish | frontend |
| B-29 | Pets section | Только Not allowed / Pets welcome. Нет деталей: размер, тип, кол-во. | minor | ux |
| B-30 | AI «draft for me» | **Hallucinates**: я не указывал «corner unit», «mountain view» — AI их вставил. Юзер может сохранить с ложными данными → жалобы tenant. | **major** | backend/AI |
| B-31 | AI description раскрывает точный адрес | «Located on 133/1/1 Sri Poom Road» — точный адрес в публичном description. Privacy issue. | **major** | backend/AI |
| B-32 | После Save property | Кнопка остаётся в «Saving…» после успешного создания (URL уже сменился на UUID). `isSaving` не сбрасывается. | minor | frontend |
| B-33 | Account number в Payment | Placeholder «123-4-56789-0» — формат разный для каждого банка. Хорошо бы подсказывать после выбора банка. | polish | ux |
| B-34 | LIVE PREVIEW без фото | Карточка показывает placeholder. Юзер не понимает что tenant ничего не увидит без фото. Подсказка «Add photos to publish». | polish | ux |

### S3. Deep-investigation editor (продолжение)

Пользователь указал: я пробегал поверхностно. Возвращаюсь, тыкаю каждую интеракцию.

| # | Где | Что увидел | Severity | Scope | Status |
|---|----------|------------|----------|-------|--------|
| B-35 | Editor sidebar (Basics / Media / Stay details / What's included / Your details) | Кнопки кликались но **не делали ничего** — `onGroupClick` не пробрасывался из `property-editor-page.tsx` в `EditorSidebar`. Optional chaining `onGroupClick?.()` делало no-op. | major | frontend | **fixed** |
| B-36 | После Save → reload | **Потеря данных**: `Area (m²)`, `Unit floor`, `Floors in building`, `Furnished`, `Parking` исчезали. Причина: `toCreateAssetRequest` отправляет только 7 полей (internalName/typeId/bedrooms/bathrooms/beds/maxOccupancy), а backend `CreateAssetRequest` принимает только их. Остальные поля **молча терялись** при create. | **major (data loss)** | frontend + backend | **fixed (frontend phase 1.5 PATCH)** + BE-5 |
| B-37 | Sidebar «Delete property» | Кнопка прямо в sidebar, без выделения опасности. Очень легко кликнуть случайно. Хорошо что есть confirm dialog, но место — спорное. | minor | ux | open |
| B-38 | Smooth scroll сломан | `body { overflow-x: hidden }` (в tokens.css) ломает `behavior: "smooth"` в `scrollTo`/`scrollIntoView` — scroll просто не происходит. Сейчас используем instant scroll. Долгосрочно — fix CSS, scroll по странице везде должен быть smooth. | minor | frontend | partial (fallback на instant) |
| B-39 | Карта Chiang Mai | По умолчанию map центрирован на Bangkok, хотя из городов только Chiang Mai. Юзер видит Bangkok, выбирает Chiang Mai в dropdown, карта прыгает. | minor | frontend | open |
| B-40 | Map drag/zoom | Не проверил — может ли юзер двигать pin после drop? Может ли увеличить map чтобы точнее? | open | ux | not investigated |
| B-41 | Postal code prefilled 10110 | До выбора адреса postal=10110 (Bangkok). После выбора autocomplete обновляется. Странный дефолт — должен быть пустой или взят из выбранного города. | minor | frontend | open |
| B-42 | **Listings без фото показывают чужие Unsplash-картинки** | На `/listings`, landing и host detail — если у listing нет `coverImageUrl`, фронт вставлял стоковую фотку из Unsplash. **Tenant видит несуществующую квартиру** → бронирует → приезжает → разочарован → 1★ + жалоба. Fraud-risk. | **major (business)** | frontend | **fixed** (`<PhotoPlaceholder>`) |
| B-43 | LIVE PREVIEW placeholder в editor — beige gradient (#e7e0d4→#c2b8a3), не реагирует на тёмную тему | minor | frontend | **fixed** (theme-aware bg-bg-subtle) |

### Phase B: business-critical (деньги/даты/контракты/TM-30/фото/payment)

| # | Где | Что | Severity | Status |
|---|----------|-----|----------|--------|
| B-44 | Pricing — Monthly rent | Принимало любую сумму (включая 0 и 99999999). Сейчас: min ฿1000 + max ฿2,000,000 с inline ошибкой. | major | **fixed** |
| B-45 | Pricing — Deposit | Юзер мог поставить deposit 10×rent. Сейчас: warning если deposit > 3×rent. | minor | **fixed** |
| B-46 | Pricing — formatting | Поле показывало `22000` вместо `22,000` (placeholder с запятой не совпадал). Сейчас: thousands separator в value. | polish | **fixed** |
| B-47 | **Booking widget — Refundable deposit показывает rent вместо реального deposit** | В `booking-widget.tsx` `Refundable deposit = monthRate` (== monthly rent), но landlord в editor указывает свой deposit (может быть 2 месяца). Tenant видит несовпадающую сумму. Marketplace DTO не передаёт `depositAmount` вообще. | **major (business)** | open — нужна политика |
| B-48 | Booking widget — maxMonths cap | `Math.min(availability.maxMonths ?? 12, 12)` — даже если landlord allow 24 месяца, slider ограничен 12. | minor | open |
| B-49 | Booking widget — move-in window | `moveInDeadline = +30 days` — нельзя выбрать move-in более чем через 30 дней. Tenant хочет book на 6 месяцев вперёд — невозможно. | major | open — нужна политика |
| B-50 | Passport expiry | Допускается дата в прошлом. Expired passport не подходит для TM-30. | major | **fixed** (валидация + 6-month warning) |
| B-51 | Passport number | Нет валидации формата/длины. | minor | **fixed** (≥6 alphanumeric) |
| B-52 | Passport skip | «Skip for now» без предупреждения о невозможности TM-30. | minor | **fixed** (window.confirm с объяснением) |
| B-53 | Photos upload | Нет валидации размера/типа файла. 50MB jpeg или .heic могут не работать. | minor | **fixed** (15 MB cap, .heic/heif → ошибка, accept ограничен) |
| B-54 | Photos partial fail | При ошибке upload — toast «Couldn't upload some photos» без указания которые именно. | minor | **fixed** (отчёт по каждому файлу) |
| B-55 | Photos reorder | Cover = первое. Нельзя перетащить чтобы изменить порядок. | minor | **fixed** (на hover — кнопка «Set cover», использует reorderMedia API) |
| B-56 | PromptPay ID | Нет валидации формата (должно быть 10-digit phone или 13-digit national ID). | minor | **fixed** (validator + inline error) |
| B-57 | Bank account name | Никак не связан с registered firstName+lastName юзера. | minor | **fixed** (сравнивает с `me.firstName+lastName`, warning при несовпадении) |
| B-58 | Bank account number | Нет валидации формата (9-15 digits depending on bank). | minor | **fixed** (digits-only, 9–15 range) |

### Phase 3 (autonomous session) — найдено + чинено

| # | Где | Что | Severity | Status |
|---|----------|-----|----------|--------|
| B-59 | Broken image fallback | Если cover image 404/невалидно — раньше отображался broken-icon; теперь автоматический `<PhotoPlaceholder>` через onError | minor | **fixed** (новый `<ListingImage>`) |
| B-60 | Photo guidelines | В Photos editor добавлен hint про cover photo (avoid pets, signage, appliances, QR codes — реальные кейсы из seed-данных) | polish | **fixed** (inline hint) |
| B-61 | Booking submit generic error | После Continue в booking modal: если visa/entry port/last entry date пустые → backend 4xx, фронт показывает «Failed to send request. Please try again.» без указания что заполнить. Нужны inline field errors. | major | open |
| B-62 | Booking modal — Continue disabled silently | После заполнения message Continue остаётся disabled пока не выбрана pets опция. Disabled-state не указывает что надо выбрать. | minor | open |
| B-63 | Booking modal step 2 «Save & send request» enabled без visa/entry data | Для не-TH нужны visa+entry — но кнопка не disabled пока эти поля пустые. Сабмит → backend 4xx (B-61). | major | open |
| B-64 | Public-shell anonymous avatar | Был `bg-[#717171]` хардкод — заменил на `bg-fg-muted + fill-bg-card`, theme-aware | polish | **fixed** |

### Hardcoded colors audit (для бэклога)

Sub-agent проаудитил `src/` (без `components/ui/` и `pages/landing.tsx`). Топ нарушителей:

- **create-wizard.tsx** — 8+ хардкод hex-gradients (worst offender)
- **detail-page.tsx (host properties)** — 5+ gradients + inline `#ececf0/#fafafa/#a1a1aa`
- **ticket-status.ts** — 7 status color pairs (blue-100/700, amber, indigo, red, orange) без переменных
- **booking-request-modal.tsx / listing-detail-page.tsx** — `bg-black/60`, `bg-black/95` для overlays
- **gateway-overlay.tsx / payment-page.tsx** — `bg-yellow-400 text-black` SANDBOX badge

Полный список — см. audit-вывод sub-agent. Не критично для core flow, но для тёмной темы создаёт визуальные glitch'и. **35+ хардкодов + 50+ статус-цветов без переменных**.

### Дополнительно проверено и работает корректно

- Cancellation policy: 4 чёткие политики (Flexible/Moderate/Strict/Non-refundable), default = Moderate
- TM-30 базовый flow: landlord видит badge «File TM-30 — 24h window», может загрузить PDF; guest видит status в `/me/guest/tm30` с урgency-level (future/open/overdueMinor/overdueSerious)
- Booking modal требует passport+visa+entry port для не-TH

### S3. Что в editor получилось хорошо

- ✅ AI-assisted title «2-bed entire place \| Chiang Mai»
- ✅ Character counter 31/60
- ✅ LIVE PREVIEW обновляется в реальном времени
- ✅ Confetti animation после Update & continue — приятный feedback
- ✅ Сводки секций «2 bed · 1 bath · 85 m²»
- ✅ Reassurance в Contact: «Shared with tenants only after booking is confirmed»
- ✅ Warning в Payment: «without this, bookings stall»
- ✅ Hero «6 quick steps, finish in 6 min» с шагами и social proof
- ✅ После сохранения top-nav обновляется (Properties / Requests / Reservations / Finance)
- ✅ RoleToggle «Hosting · 1» — счётчик объектов

### S3. Publish flow ⏳

Не начат — нужно опубликовать объект (сейчас status «Vacant»). Найти Publish CTA в edit-mode.

### S4–S10. Tenant flow ⏳

Не начат.

---

## Сводка

**Frontend-багов:** 32 найдено, 4 fixed (B-1, B-2, B-9, B-13/B-23 partial), 28 open.

**Backend-issues:** см. [BACKEND_ISSUES.md](BACKEND_ISSUES.md) — BE-1 (login 500), BE-2 (cities), BE-3 (assets/), BE-4 (capabilities × 5). Плюс к ним добавить B-30 и B-31 (AI hallucinations + privacy) — это тоже backend/AI.

**Приоритеты для следующей сессии:**
1. **B-30 + B-31** — AI hallucinations в description. Major, влияет на репутацию (false claims в listing → плохие отзывы tenants).
2. **B-26** — Address без координат disable CTA без подсказки. Major UX.
3. **B-32** — Stuck «Saving…» после успешного create. Minor но раздражает.
4. **B-10** + **B-17** + **B-3** — quick polish-фиксы (иконки, type=number, LINE OAuth).

**Что ещё пройти:**
- S3 Publish flow (как landlord публикует объект из «Vacant» в «Listed»?)
- Photos upload в edit-mode
- S4-S10 весь tenant-flow

---

## Cross-cutting checks (отложено)

- [ ] Тёмная и светлая тема — нет «бледных» элементов
- [ ] EN / TH / RU — переводы есть, ничего не обрезается
- [ ] Mobile (375px) и desktop (1440px)
- [ ] Сетевая ошибка — есть понятный fallback
- [ ] Пустые состояния — есть подсказка
