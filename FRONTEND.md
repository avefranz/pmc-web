# PMC Web — Frontend Reference

> Текущее состояние кодовой базы. Обновлять при значимых изменениях.

---

## Стек

| Технология | Версия | Зачем |
|------------|--------|-------|
| React | 19 | UI |
| TypeScript | 6.0 | Типизация |
| Vite | 8.0 | Сборка |
| TanStack Query | 5.99 | Серверный стейт, кеш, мутации |
| React Router DOM | 7.14 | Роутинг |
| Zustand | 5.0 | Клиентский стейт (только токен + профиль) |
| React Hook Form | 7.73 | Формы |
| Zod | 4.3 | Валидация схем |
| Tailwind CSS | 3.4 | Стилизация |
| shadcn/ui (Radix) | — | Компоненты |
| Sonner | — | Toast-уведомления |
| Recharts | — | Графики финансов |
| Lucide React | — | Иконки |
| Axios | — | HTTP клиент |

---

## Структура проекта

```
src/
├── App.tsx                     # Все роуты приложения
├── main.tsx                    # Точка входа, QueryClient, BrowserRouter, Toaster
├── lib/
│   ├── api/                    # Axios-клиент + все API-модули
│   ├── hooks/                  # TanStack Query хуки
│   ├── stores/                 # Zustand stores
│   ├── types/                  # TypeScript типы и enum-ы
│   └── utils/                  # Утилиты форматирования
├── components/
│   ├── layout/                 # Шеллы и AuthGuard
│   ├── shared/                 # Переиспользуемые компоненты
│   └── ui/                     # shadcn компоненты (не трогать)
├── features/
│   ├── manager/                # Десктоп-интерфейс (сайдбар)
│   ├── landlord/               # Мобайл лендлорда (bottom nav)
│   └── tenant/                 # Мобайл тенанта (bottom nav)
└── pages/                      # Страницы вне порталов (auth, invite)
```

---

## Роутинг (`App.tsx`)

### Публичные роуты
| Путь | Компонент | Примечание |
|------|-----------|------------|
| `/login` | `LoginPage` | Email/pass + LINE OAuth |
| `/register` | `RegisterPage` | Регистрация |
| `/line-callback` | `LineCallbackPage` | OAuth callback |
| `/role-router` | `RoleRouterPage` | Редирект по роли после логина |
| `/invite` | `InviteAcceptPage` | Принять инвайт (query param: `?token=`) |
| `/invite/:token` | `InviteAcceptPage` | Принять инвайт (path param) |

### Manager (`/manager`) — `AuthGuard` без requiredRole
| Путь | Компонент |
|------|-----------|
| `/manager` | `ManagerDashboard` |
| `/manager/assets` | `AssetsPage` |
| `/manager/assets/:id` | `AssetDetailPage` |
| `/manager/bookings` | `BookingsPage` |
| `/manager/bookings/new` | `CreateBookingPage` |
| `/manager/bookings/:id` | `BookingDetailPage` |
| `/manager/tickets` | `TicketsPage` |
| `/manager/tickets/new` | `CreateTicketPage` |
| `/manager/tickets/:id` | `TicketDetailPage` |
| `/manager/listings/:id` | `ListingDetailPage` |
| `/manager/finance` | `FinancePage` |
| `/manager/team` | `TeamPage` |

### Landlord (`/landlord`) — `AuthGuard requiredRole="Landlord"`
| Путь | Компонент |
|------|-----------|
| `/landlord` | `LandlordPortfolio` |
| `/landlord/assets/:id` | `LandlordAssetDetail` |
| `/landlord/income` | `LandlordIncome` |
| `/landlord/tickets` | `LandlordTickets` |
| `/landlord/tickets/:id` | `LandlordTicketDetail` |
| `/landlord/profile` | `ProfilePage` |

### Tenant (`/tenant`) — `AuthGuard requiredRole="Tenant"`
| Путь | Компонент |
|------|-----------|
| `/tenant` | `TenantHome` |
| `/tenant/tickets` | `TenantTickets` |
| `/tenant/tickets/:id` | `TenantTicketDetail` |
| `/tenant/invoices` | `TenantInvoices` |
| `/tenant/profile` | `ProfilePage` |

**Catch-all:** `/` и `*` → `/role-router`

---

## Auth Flow

### Инициализация
1. `main.tsx` — `QueryClient` с `staleTime: 30s`, `retry: 1`
2. `auth.store.ts` — Zustand, persist только `token` в localStorage под ключом `pmc_token`
3. `apiClient` (axios) — при каждом запросе берёт токен из `localStorage.getItem("pmc_token")`

### Email/Password
```
POST /api/auth/login → token
→ setToken(token) в store + localStorage
→ GET /api/auth/me → user
→ setUser(user) в store
→ navigate("/role-router")
```

### LINE OAuth
```
handleLine() → redirect на access.line.me (VITE_LINE_CLIENT_ID, VITE_LINE_REDIRECT_URI)
→ /line-callback?code=xxx
→ POST /api/auth/line-login { code, redirectUri } → token
→ тот же flow
```

### Env переменные
```
VITE_LINE_CLIENT_ID       — LINE OAuth App ID
VITE_LINE_REDIRECT_URI    — (опционально) дефолт: origin + /line-callback
```

### 401 handling
`apiClient` response interceptor: удаляет `pmc_token` из localStorage и делает `window.location.href = "/login"` (если уже не на /login).

### AuthGuard
- Проверяет токен в localStorage
- `requiredRole` — опциональная проверка роли из `useAuthStore().user.roles`
- Нет токена → `/login`
- Не та роль → `/role-router`

### role-router
- Вызывает `useMe()` → `GET /api/auth/me`
- Роли: `Admin` → `/manager`, `Landlord` → `/landlord`, `Tenant` → `/tenant`
- Пока грузится — спиннер

---

## Zustand Store (`lib/stores/auth.store.ts`)

```ts
interface AuthState {
  token: string | null;
  user: UserDto | null;
  setToken: (token: string) => void;
  setUser: (user: UserDto) => void;
  clearAuth: () => void;
}
```

Persists: только `token` → `localStorage["pmc_token"]`

---

## API Client (`lib/api/client.ts`)

```ts
const apiClient = axios.create({ baseURL: "" });

// Request: добавляет Authorization: Bearer <token>
// Response 401: чистит localStorage, редирект на /login
```

---

## API модули (`lib/api/`)

### `auth.api.ts`
- `register(email, password)` → `{ token }`
- `login(email, password)` → `{ token }`
- `lineLogin(code, redirectUri)` → `{ token }`
- `me()` → `UserDto`

### `assets.api.ts`
- `getAll()` → `AssetDto[]`
- `getById(id)` → `AssetDto`
- `getSummary(id, from?, to?)` → `AssetSummaryDto`
- `create(data: CreateAssetRequest)` → `{ id }`
- `updateLocation(data: UpdateLocationRequest)`

### `listings.api.ts`
- `getById(id)` → `ListingDto`
- `getByAsset(assetId)` → `ListingDto[]`
- `create(data: CreateListingRequest)` → `{ id }`
- `update(id, data)` → response
- `uploadMedia(listingId, file, roomSegmentId?)` → `{ mediaId }`
- `reorderMedia(listingId, sortedMediaIds[])`
- `updateAmenities(listingId, selectedAmenities[])`

### `bookings.api.ts`
- `create(data)` → `{ id }`
- `getAll()`, `getMy()`, `getById(id)`, `getByAsset(assetId)` → `BookingDto[]`
- `getTickets(id)` → `TicketDto[]`
- `getInvoices(id)` → `InvoiceDto[]`
- `updateStatus(id, status)`
- `uploadContract(id, file)` → `{ url }`
- `getGuests(id)` → `BookingGuestDto[]`
- `addGuest(id, data)`, `removeGuest(id, guestId)`
- `getTm30(id)`, `uploadTm30(id, file)`

### `tickets.api.ts`
- `getAll()`, `getAttention()`, `getById(id)`, `getByAsset(assetId)`
- `create(data)` → `{ id }`
- `updateStatus(id, status)`, `updateAssignee(id, id?)`, `updatePriority(id, priority)`
- `uploadMedia(id, file, assetId)` → `{ url }`
- `spawnChild(parentId, data)` → `{ id }`
- `getEvents(id)`, `getMessages(id)`, `postMessage(id, data)` → `{ id }`
- `uploadMessageAttachment(id, messageId, file)` → `{ id, url }`
- `addChecklistItem(ticketId, title)`
- `toggleChecklistItem(ticketId, itemId, done, photoUrl?)`
- `removeChecklistItem(ticketId, itemId)`

### `finance.api.ts`
- `pay(invoiceId, { method, amount })`
- `getCashOnHand()` → `CashOnHandResponse`
- `createRemittance()` → `{ batchId }`
- `confirmRemittance(batchId, slipUrl)`
- `createCustomInvoice(data)` → `{ invoiceId, message }`
- `getSummary(from?, to?)` → `FinanceSummaryDto`
- `getTicketInvoices(ticketId)` → `InvoiceDto[]`
- `getOverview()` → `LandlordOverviewDto`
- `getAnalytics(period)` → `AssetAnalyticsDto`
- `getAssetAnalytics(assetId, period)` → `AssetAnalyticsDto`

### `invites.api.ts`
- `generate(data)` → `InviteResponseDto { token, link, expiresAt }`
- `accept(token)` → `{ message }`

### `utilities.api.ts`
- `getByAsset(assetId)` → `UtilityContractDto[]`
- `create(data)` → `{ id }`
- `delete(contractId)`

### `calendars.api.ts`
- `get(listingId, startDate, endDate)` → `CalendarDayDto[]`

### `references.api.ts`
- `getAll()` → `ReferencesAll`

---

## TanStack Query Hooks (`lib/hooks/`)

### Соглашения
- Default `staleTime: 30s`
- References: `staleTime: Infinity, gcTime: Infinity`
- Asset summary, finance, utilities: `staleTime: 60s`
- Оптимистичные обновления: только `useToggleChecklistItem`

### `use-auth.ts`
- `useMe()` — query `["me"]`
- `useLogin()` — mutation: setToken + setUser + setQueryData(["me"])
- `useRegister()` — mutation
- `useLineLogin()` — mutation: тот же flow что login

### `use-assets.ts`
- `useAssets()` — `["assets"]`
- `useAsset(id)` — `["assets", id]`
- `useAssetSummary(id)` — `["assets", id, "summary"]`, stale 60s
- `useCreateAsset()` — invalidates `["assets"]`
- `useUpdateLocation()` — invalidates `["assets", id]`

### `use-listings.ts`
- `useListing(id)` — `["listings", id]`
- `useListingsByAsset(assetId)` — `["listings", "asset", assetId]`
- `useCreateListing()` — invalidates `["listings"]`
- `useUpdateAmenities(listingId)` — invalidates `["listings"]`
- `useUploadListingMedia(listingId)` — invalidates `["listings"]`

### `use-bookings.ts`
- `useBookings()`, `useMyBookings()`, `useBooking(id)`, `useBookingsByAsset(assetId)`
- `useBookingGuests(id)`, `useBookingInvoices(id)`, `useBookingTickets(id)`, `useBookingTm30(id)`
- `useCreateBooking()`, `useUpdateBookingStatus(id)`, `useAddGuest(bookingId)`, `useRemoveGuest(bookingId)`, `useUploadTm30(bookingId)`

### `use-tickets.ts`
- `useTickets()`, `useAttentionTickets()`, `useTicket(id)`, `useTicketsByAsset(assetId)`
- `useCreateTicket()`, `useUpdateTicketStatus()`, `useUpdateTicketPriority()`, `useUpdateTicketAssignee()`
- `usePostTicketMessage(ticketId)`, `useSpawnChildTicket(parentId)`
- `useToggleChecklistItem(ticketId)` — **оптимистичные обновления** с rollback
- `useAddChecklistItem(ticketId)`

### `use-finance.ts`
- `useFinanceOverview()`, `useFinanceSummary()`, `useFinanceAnalytics(period)`, `useAssetAnalytics(assetId, period)`, `useCashOnHand()`
- `usePayInvoice()`, `useCreateInvoice()`, `useCreateRemittance()`, `useConfirmRemittance()`

### `use-references.ts`
- `useReferences()` — staleTime/gcTime Infinity, загружается один раз при старте

### `use-invites.ts`
- `useGenerateInvite()`, `useAcceptInvite()`

### `use-utilities.ts`
- `useUtilitiesByAsset(assetId)` — stale 60s
- `useCreateUtility()`, `useDeleteUtility(assetId)`

### `use-calendars.ts`
- `useCalendar(listingId, startDate, endDate)` — stale 60s, enabled только когда все параметры заполнены

---

## Типы (`lib/types/`)

### Enums (`enums.ts`)

```ts
enum UserRole { Admin = "Admin", Landlord = "Landlord", Tenant = "Tenant" }

enum TicketStatus {
  // v2 (использовать в UI)
  Draft, Reported, Triaging, Quoted, PendingApproval,
  InProgress, Blocked, Verified, Closed, Reopened, Cancelled
  // legacy v1 — НЕ использовать: Pending, Approved, Rejected, Completed
}

enum TicketKind { Incident, WorkOrder, Expense, Checklist }

enum TicketType { Maintenance, Cleaning, Utilities, Other, Complaint, Request, Inspection }

enum TicketPriority { Low, Normal, High, Urgent }

enum MessageVisibility { Public = "Public", Internal = "Internal" }

enum BookingStatus { Draft, Confirmed, Active, Completed, Cancelled, Pending }

enum InvoiceStatus { Pending, PartiallyPaid, Paid, Cancelled }

enum InvoiceType { Rent, Deposit, Utilities, Cleaning, Damage, Other }

enum PaymentMethod { Cash, PromptPay, BankTransfer }

enum InviteType { TenantInvite, OwnerInvite, ManagerInvite }

enum VisaType { VisaExempt, Tourist, NonImmigrantB, NonImmigrantO, NonImmigrantOA, Education, SpecialTourist, Other }

enum UtilityType { Electricity, Water, Internet, CommonAreaFee, Other }

enum CalendarStatus { Available, Booked, Blocked, Maintenance }

enum Tm30Status { Pending, Filed }
```

### DTOs (`index.ts`)

**UserDto**: `{ id, email, lineName, firstName, lastName, lineUserId, roles[] }`

**AssetDto**: `{ id, internalName, occupancyStatus, primaryImageUrl?, currentTenantName?, bedrooms, bathrooms, maxOccupancy, beds, location?, ... }`

**AssetSummaryDto**: `{ assetId, assetName, totalRevenue, totalExpenses, netProfit, currentTenantName?, leaseEnd? }`

**ListingDto**: `{ id, assetId, title, description, houseRules, wifiName, wifiPassword, basePrice, instantBookEnabled, media: ListingMediaDto[], amenities: AmenityDto[] }`

**ListingMediaDto**: `{ id, url, sortOrder, caption? }`

**AmenityDto**: `{ amenityId, name, isPresent }`

**BookingDto**: `{ id, assetId, listingId, tenantId?, checkInDate, checkOutDate, rentAmount, depositAmount, status, hasContract, tenantName?, listingTitle?, primaryImageUrl?, daysRemaining? }`

**BookingGuestDto**: `{ id, bookingId, userId?, isMainTenant, firstName?, lastName?, dateOfBirth?, nationality?, passportNumber?, passportExpiry?, visaType?, entryDate?, entryPort?, passportUpdatedAt?, tm30Filing? }`

**Tm30FilingDto**: `{ id, bookingGuestId, status: Tm30Status, filedAt?, documentUrl? }`

**TicketDto**: `{ id, displayId, assetId, assetName?, bookingId?, title, description, type, kind, priority, status, estimatedCost, actualCost?, assigneeId?, dueDate?, scheduledFor?, createdAt, mediaUrls[] }`

**TicketDetailsDto** (extends TicketDto): `{ ...TicketDto, events: TicketEventDto[], messages: TicketMessageDto[], children: TicketDto[], allowedNextStatuses: TicketStatus[], checklistItems?: ChecklistItemDto[] }`

**ChecklistItemDto**: `{ id, ticketId, title, done, photoUrl? }`

**TicketMessageDto**: `{ id, ticketId, authorId, authorName?, body, visibility: MessageVisibility, replyToMessageId?, createdAt, attachments: { id, url, fileName? }[] }`

**TicketEventDto**: `{ id, ticketId, actorId?, eventType: TicketEventType, fromValue?, toValue?, comment?, createdAt }`

**InvoiceDto**: `{ id, type, status, amount?, description?, dueDate?, bookingId?, ticketId? }`

**FinanceSummaryDto**: `{ totalRevenue, totalExpenses, netProfit, revenueByType: FinanceCategoryDto[], expensesByType: FinanceCategoryDto[] }`

**LandlordOverviewDto**: `{ currentMonthIncome, previousMonthIncome, changePercent, projectedEndOfMonth, currency: "THB" }`

**CashOnHandResponse**: `{ amount, currency: "THB" }`

**AssetAnalyticsDto**: `{ assetId, assetName, profit, profitYear, roi, revenue, expenses, expenseStructure: ExpenseCategoryDto[], unitPerformance: UnitPerformanceDto[] }`

**UtilityContractDto**: `{ id, assetId, utilityType, providerName, accountNumber }`

**InviteResponseDto**: `{ token, link, expiresAt }`  
> ⚠️ Бэкенд генерирует link в формате `http://localhost:5173/invite?token=<guid>` (query param, не path param)

**AmenityDefinition**, **AmenityCategory**, **ReferenceItem**, **ReferencesAll** — для справочников

---

## Утилиты (`lib/utils/`)

### `cn.ts`
```ts
cn(...classes) // clsx + tailwind-merge
```

### `format.ts`
```ts
formatThb(amount)          // "฿50,000" (без дробей)
formatDate(dateStr)        // "15 Jan 2025"
formatDateTime(dateStr)    // "15 Jan 2025 14:30"
formatRelative(dateStr)    // "5m ago" / "2h ago" / "3d ago" / дата
multiLangText(obj)         // из { en, th } → en или th по locale
initials(name)             // "John Doe" → "JD"
changePercentColor(pct)    // "text-green-600" / "text-red-500" / "text-muted-foreground"
```

### `ticket-status.ts`
```ts
ticketStatusColor(status)   // CSS классы для Badge (bg-xxx text-xxx)
ticketPriorityColor(priority) // CSS классы для Badge
ticketKindIcon(kind)        // "🔥" Incident / "🔧" WorkOrder / "💸" Expense / "✅" Checklist
ticketKindLabel(kind)       // текстовый лейбл
priorityLabel(p)            // текстовый лейбл приоритета
```

**Цвета статусов тикетов:**
- Draft → gray
- Reported → blue
- Triaging → sky
- Quoted → purple
- PendingApproval → amber
- InProgress → indigo
- Blocked → red
- Verified → teal
- Closed → slate
- Reopened → orange
- Cancelled → gray

---

## Компоненты

### Layout (`components/layout/`)

#### `auth-guard.tsx`
```tsx
<AuthGuard requiredRole="Landlord">  // requiredRole опционален
```
- Нет токена → `/login`
- Не та роль → `/role-router`

#### `manager-shell.tsx`
Десктоп-лейаут с боковым сайдбаром:
- Логотип + навигация: Dashboard, Properties, Tickets, Finance, Team
- Cash-on-hand badge (`useCashOnHand()`)
- Профиль пользователя + кнопка Logout
- `<Outlet />` для вложенных роутов

#### `mobile-shell.tsx`
Мобайл-лейаут с нижней навигацией:
- Заголовок сверху + `pb-20` для контента (отступ для нижнего бара)
- Фиксированный bottom nav bar
- **LandlordShell**: Portfolio, Income, Tickets, Profile
- **TenantShell**: Home, Tickets, Invoices, Profile

### Shared (`components/shared/`)

#### `empty-state.tsx`
```tsx
<EmptyState icon={<Icon />} title="..." description="..." action={<Button />} />
```

#### `page-header.tsx`
```tsx
<PageHeader title="..." description="..." action={<Button />} />
```

#### `stat-card.tsx`
```tsx
<StatCard label="..." value="..." sub="..." subColor="..." icon={<Icon />} loading={false} />
```

#### `file-upload-button.tsx`
```tsx
<FileUploadButton onFile={(file) => {}} accept="image/*" loading={false} label="Upload" />
```
Скрытый `<input type="file" />`, клик по кнопке.

---

## Feature модули

### MANAGER — десктоп (`features/manager/`)

#### `dashboard/index.tsx`
- Stats: доход этого месяца, прогноз EOM, кол-во объектов
- Список attention tickets (priority-sorted, unresolved)
- Данные: `useFinanceOverview`, `useTickets`, `useAssets`

#### `assets/index.tsx`
- Grid карточек объектов (sm: 2 col, lg: 3 col)
- Каждая карточка (`PropertyCard`):
  - Фото (h-40) с `primaryImageUrl` или placeholder-иконка
  - Hover zoom (`group-hover:scale-105`)
  - Бейдж статуса (`OccupancyBadge`) поверх фото
  - Имя объекта, tenant name (или "No tenant"), иконки beds/baths/maxOccupancy
- Кнопка "Add property" → `CreatePropertyWizard`
- Пустое состояние с `EmptyState`

#### `assets/create-wizard.tsx`
3-шаговый wizard в Dialog:
1. **Тип объекта** — 6 типов с эмодзи (Apartment, Studio, House, Villa, Condo, Room)
2. **Комнаты и вместимость** — bedrooms, beds, bathrooms, maxOccupancy (числовые поля)
3. **Описание** — title (internalName), description, basePrice (rent), wifiName, wifiPassword, houseRules

При завершении:
1. `POST /api/assets` → `{ assetId }`
2. `POST /api/listings` → `{ listingId }`
3. Экран успеха: кнопки "Open property" → `/manager/assets/:id` и "Close"

#### `assets/detail.tsx`
Страница деталей объекта. Разделы (сверху вниз):

1. **Заголовок** — internalName, иконки beds/baths/maxOccupancy, кнопка Edit
2. **Photos** (`MediaSection`) — сетка фото 3–4 col + кнопка Upload (через `listingsApi.uploadMedia`)
3. **Financial Summary** — revenue, expenses, net profit (данные `useAssetSummary`)
4. **Rental Details** — title, description, rent (xl), WiFi в выделенном блоке
5. **Amenities** — показывается всегда (даже если пустой список), сначала present, потом absent; счётчик "X of Y available"
6. **Bookings** — активные и upcoming бронирования
7. **Open Tickets** — незакрытые тикеты
8. **Utilities** — контракты с кнопками Add/Delete

Диалоги:
- **Edit Settings** — редактирование title, description, price, wifi, houseRules
- **Add Utility** — тип, провайдер, номер счёта

#### `tickets/index.tsx`
- Список всех тикетов с фильтрами (status, kind, priority)
- Иконки по kind, бейджи статуса/приоритета
- Кнопка "New ticket" → `/manager/tickets/new`

#### `tickets/create.tsx`
Форма создания тикета (max-w-2xl Card):
- Поля: Property (select), Kind, Type, Priority, Est. cost, Title, Description
- Читает `?assetId=` из URL → предвыбирает property
- После создания → `/manager/tickets/:id`

#### `tickets/detail.tsx`
3-колоночный лейаут (lg):

**Левая колонка (1/3):**
- Мета: description, estimatedCost, actualCost, dueDate, scheduledFor, createdAt, ссылка на Booking
- Sub-tickets (если есть children)
- Media gallery (если есть mediaUrls)

**Правая (2/3):**
- `ChecklistPanel` — только если `kind === TicketKind.Checklist`
  - Progress bar, чекбоксы, счётчик done/total, поле добавления
  - Оптимистичные обновления при toggle
- `TicketThread` — хронологический timeline events + messages
  - Events как разделители с текстом перехода
  - Internal сообщения — amber фон + бейдж "Internal"
  - Compose: textarea, visibility toggle (Public/Internal), attach images
  - Изображения загружаются через `ticketsApi.uploadMedia`, URL вставляется в body

**Заголовок:**
- Kind icon (emoji), displayId, kind/status/priority бейджи, title, assetName
- DropdownMenu "Change status" → показывает `ticket.allowedNextStatuses`

#### `bookings/index.tsx`
- Список бронирований, сгруппированный по активам
- Карточки: tenant, даты, сумма, статус
- Кнопка "New booking" → `/manager/bookings/new`

#### `bookings/create.tsx`
Форма (max-w-2xl Card):
- Property (select) → динамически загружает Listings для этого asset
- Listing (select, disabled пока нет property)
- Check-in / Check-out dates (date inputs)
- Security deposit (number)
- Читает `?assetId=` → предвыбирает property
- После создания → `/manager/bookings/:id`

#### `bookings/detail.tsx`
Заголовок: tenantName/listingTitle, даты, daysRemaining, статус-бейдж.  
3 stat-карточки: Rent, Deposit, Contract (upload кнопка если нет контракта).

Вкладки (`Tabs`):
- **Invoices** — список InvoiceDto, кнопка "Pay" → диалог оплаты
- **Guests** — список BookingGuestDto, кнопка "Add guest", delete
- **Tickets** — список тикетов, ссылка "New ticket" с `?assetId&bookingId`
- **TM-30** — загрузка PDF подтверждения TM30

Диалоги: Add Guest (firstName, lastName), Register Payment (amount, method).

#### `listings/detail.tsx`
- Заголовок: listing.title, basePrice
- 2-col grid: WiFi card (name + password с show/hide) | Photos card (grid + upload)
- Amenities (col-span-2) — toggle кнопки (present: primary/10, absent: gray)
- Description (col-span-2) — если есть

Путь: `/manager/listings/:id` (НЕ вложен в asset detail)

#### `finance/index.tsx`
- 4 stat-карточки: This month, Projected EOM, Total Revenue, Net Profit
- Recharts графики: Revenue by type (Bar), Expense breakdown (Stacked Bar)
- Кнопка Create Remittance → диалог с загрузкой slip

#### `team/index.tsx`
- Toggle: Landlord invite (entityId = assetId) / Tenant invite (entityId = bookingId)
- Select нужного asset или booking
- Опционально: recipientName, recipientEmail
- Кнопка Generate → показывает ссылку + кнопка Copy + дата истечения
- ⚠️ Ссылки генерируются в формате `http://localhost:5173/invite?token=<guid>`

---

### LANDLORD — мобайл (`features/landlord/`)

#### `portfolio/index.tsx`
- Stats: доход месяца (с % изменением), кол-во активных объектов
- Список активов с occupancy status
- Клик → `/landlord/assets/:id`

#### `assets/detail.tsx`
- Мобайл-версия детальной страницы объекта
- Заголовок + occupancy badge
- 3 mini stat-cards: Revenue, Expenses, Net (зелёный/красный)
- Tabs: **Bookings** (список карточек), **Tickets** (список с иконками, ссылки на `/landlord/tickets/:id`)

#### `income/index.tsx`
- Финансовый дашборд лендлорда
- Overview + аналитика по периодам (1m, 3m, 6m, year)

#### `tickets/index.tsx`
- Список тикетов по активам лендлорда
- Фильтры, клик → `/landlord/tickets/:id`

#### `tickets/detail.tsx`
- Мобайл-версия детали тикета
- Заголовок с kind icon, displayId, title, assetName
- Статус/Priority/Kind бейджи
- **Кнопка Change Status** (full-width) — доступна если есть `allowedNextStatuses`
- Description card
- Messages — только **Public** сообщения (Internal скрыты)
- ⚠️ Лендлорд НЕ может писать сообщения (только читать)

---

### TENANT — мобайл (`features/tenant/`)

#### `home/index.tsx`
- Активная аренда: фото объекта, title, check-in/out даты, daysRemaining
- WiFi credentials (из listing)
- Amenities — только те где `isPresent: true`
- Если нет активного бронирования → EmptyState

#### `tickets/index.tsx`
- Список тикетов тенанта
- Кнопка "Report issue" → Dialog создания тикета
  - Поля: Category (Maintenance/Cleaning/Utilities/Complaint/Request/Other), Title, Details
  - Доступна только если есть активное бронирование (иначе disabled с подсказкой)

#### `tickets/detail.tsx`
- Мобайл-деталь тикета
- kind icon, title, createdAt, статус/тип бейджи
- Description ("Your report")
- Public messages (Internal скрыты)
- Compose textarea + кнопка Send (Public visibility, hardcoded)

#### `invoices/index.tsx`
- 2 stat-cards: Pending amount, Total amount
- Список InvoiceDto: type, dueDate, amount, статус-бейдж
- Только просмотр (оплата — через менеджера)

---

## Ключевые паттерны

### Ticket flow (правило #1)
```
allowedNextStatuses из API = единственный источник кнопок смены статуса
Никогда не вычислять переходы на фронте
```

### Видимость сообщений
```
MessageVisibility.Public  → все видят (менеджер, лендлорд, тенант)
MessageVisibility.Internal → только менеджер и лендлорд
Тенант: фильтровать messages.filter(m => m.visibility === "Public")
Лендлорд: фильтровать так же (читает, не пишет)
```

### Upload паттерн (листинг медиа)
```ts
const inputRef = useRef<HTMLInputElement>(null);
// После upload: inputRef.current.value = "" — сброс для повторного выбора того же файла
// invalidateQueries(["listings"]) — обновить данные
```

### Инвайты — два формата URL
```
Бэкенд генерирует: /invite?token=<guid>  (query param)
Legacy поддержка:   /invite/:token        (path param)
InviteAcceptPage читает оба:
  const { token: tokenParam } = useParams();
  const [searchParams] = useSearchParams();
  const token = tokenParam ?? searchParams.get("token");
```

### Создание объекта
```
Wizard → POST /api/assets → POST /api/listings (создаётся сразу)
AssetDto.primaryImageUrl берётся из первого медиа листинга
```

### Amenities всегда показывать
```
Даже если amenities.length === 0 — секция видна
Порядок: сначала isPresent=true, потом false
```

---

## Known Issues / Tech Debt

| Проблема | Файл | Статус |
|----------|------|--------|
| JWT в localStorage | `auth.store.ts`, `client.ts` | Задокументировано как tech debt |
| Нет удаления медиа листинга | `assets/detail.tsx`, `listings/detail.tsx` | Эндпоинт DELETE /api/listings/{id}/media отсутствует в бэкенде |
| Изображения в тикет-сообщениях вставляются как URL в body текста | `tickets/detail.tsx` `TicketThread` | Нет отдельного поля attachments при postMessage |
| `useUploadListingMedia` hook vs `listingsApi.uploadMedia` напрямую | `assets/detail.tsx` | В detail.tsx используется API напрямую, в `listings/detail.tsx` — hook |

---

## Shadcn компоненты (components/ui/)

Не модифицировать. Используемые компоненты:

`badge`, `button`, `card`, `dialog`, `dropdown-menu`, `input`, `label`, `select`, `separator`, `sheet`, `skeleton`, `tabs`, `textarea`

---

## Переменные окружения

```env
VITE_LINE_CLIENT_ID=        # LINE OAuth App ID (обязательно для LINE login)
VITE_LINE_REDIRECT_URI=     # Дефолт: window.location.origin + /line-callback
```

---

## Команды

```bash
npm run dev       # Dev server (Vite)
npm run build     # tsc -b && vite build
npm run lint      # ESLint
npm run preview   # Preview production build
```
