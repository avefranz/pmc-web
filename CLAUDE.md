# PMC Web — Claude Context

> Подробная документация: FRONTEND.md и API.md. Этот файл — быстрый ориентир по проекту.

---

## Стек

React 19 · TypeScript 6 · Vite 8 · TanStack Query 5 · React Router 7 · Zustand 5 · React Hook Form + Zod · Tailwind CSS 3 · shadcn/ui (Radix) · Sonner · Recharts · Lucide · Axios

---

## Структура

```
src/
├── App.tsx                 # все роуты
├── main.tsx                # точка входа
├── lib/
│   ├── api/                # axios клиент + модули (assets, bookings, tickets, finance…)
│   ├── hooks/              # TanStack Query хуки поверх api/
│   ├── stores/             # Zustand: только auth (token + user)
│   ├── types/              # DTOs + enums (index.ts, enums.ts)
│   └── utils/              # cn, format, ticket-status, amenity-definitions
├── components/
│   ├── layout/             # AuthGuard, ManagerShell (сайдбар), MobileShell (bottom nav)
│   ├── shared/             # EmptyState, PageHeader, StatCard, FileUploadButton, AmenityToggleGrid
│   └── ui/                 # shadcn — НЕ ТРОГАТЬ
├── features/
│   ├── manager/            # десктоп (Admin): assets, bookings, tickets, finance, team, listings, dashboard
│   ├── landlord/           # мобайл (Landlord): portfolio, assets/detail, income, tickets
│   └── tenant/             # мобайл (Tenant): home, tickets, invoices
└── pages/                  # login, register, line-callback, role-router, invite, profile
```

---

## Роли и порталы

| Роль | Путь | Shell | Интерфейс |
|------|------|-------|-----------|
| Admin | `/manager/*` | ManagerShell (сайдбар) | Десктоп |
| Landlord | `/landlord/*` | LandlordShell (bottom nav) | Мобайл |
| Tenant | `/tenant/*` | TenantShell (bottom nav) | Мобайл |

Catch-all → `/role-router` → `GET /api/auth/me` → редирект по роли.

---

## Auth

- Токен хранится в `localStorage["pmc_token"]` через Zustand persist
- `apiClient` (axios) читает токен при каждом запросе из localStorage
- 401 interceptor → чистит токен → `window.location.href = "/login"`
- LINE OAuth: `VITE_LINE_CLIENT_ID`, `VITE_LINE_REDIRECT_URI`
- `AuthGuard` с опциональным `requiredRole`

---

## Ключевые правила (нарушать нельзя)

1. **Ticket статусы** — `allowedNextStatuses` из API — единственный источник кнопок смены статуса. Никогда не вычислять переходы на фронте.
2. **Видимость сообщений** — `Internal` видят только Manager. Tenant и Landlord: `messages.filter(m => m.visibility === "Public")`.
3. **Amenities** — секция всегда видна (даже пустая). Порядок: `isPresent=true` сначала.
4. **shadcn/ui** (`components/ui/`) — не модифицировать.
5. **Инвайты** — бэкенд отдаёт `?token=` (query param). `InviteAcceptPage` поддерживает оба формата: `useParams` + `useSearchParams`.

---

## API модули (lib/api/)

| Файл | Ключевые методы |
|------|----------------|
| `auth.api.ts` | login, register, lineLogin, me |
| `assets.api.ts` | getAll, getById, getSummary, create, updateLocation |
| `listings.api.ts` | getById, getByAsset, create, update, uploadMedia, deleteMedia, reorderMedia, updateAmenities |
| `bookings.api.ts` | create, getAll, getById, getByAsset, updateStatus, uploadContract, addGuest, removeGuest, getTm30, uploadTm30 |
| `tickets.api.ts` | getAll, getAttention, create, updateStatus, updateAssignee, updatePriority, uploadMedia, spawnChild, getMessages, postMessage, addChecklistItem, toggleChecklistItem |
| `finance.api.ts` | pay, getCashOnHand, createRemittance, confirmRemittance, createCustomInvoice, getSummary, getOverview, getAnalytics |
| `invites.api.ts` | generate, accept |
| `utilities.api.ts` | getByAsset, create, delete |
| `calendars.api.ts` | get(listingId, startDate, endDate) |
| `references.api.ts` | getAll → staleTime Infinity |

---

## TanStack Query — соглашения

- Default `staleTime: 30s`, `retry: 1`
- References: `staleTime: Infinity, gcTime: Infinity`
- Summary/finance/utilities: `staleTime: 60s`
- Optimistic updates: только `useToggleChecklistItem` (с rollback)
- Query keys: `["assets"]`, `["assets", id]`, `["listings", id]`, `["bookings"]`, `["tickets"]` и т.д.

---

## Главные типы (lib/types/)

**Enums**: `UserRole`, `TicketStatus` (v2: Draft→Reported→Triaging→Quoted→PendingApproval→InProgress→Blocked→Verified→Closed→Reopened→Cancelled), `TicketKind`, `TicketType`, `TicketPriority`, `MessageVisibility`, `BookingStatus`, `InvoiceStatus`, `InvoiceType`, `PaymentMethod`, `InviteType`, `VisaType`, `UtilityType`, `CalendarStatus`, `Tm30Status`

**Ключевые DTOs**: `UserDto`, `AssetDto`, `ListingDto`, `BookingDto`, `BookingGuestDto`, `TicketDto`, `TicketDetailsDto` (+ events, messages, children, allowedNextStatuses, checklistItems), `InvoiceDto`, `UtilityContractDto`

---

## Утилиты (lib/utils/)

```ts
cn(...)                     // clsx + tailwind-merge
formatThb(amount)           // "฿50,000"
formatDate(str)             // "15 Jan 2025"
formatDateTime(str)         // "15 Jan 2025 14:30"
formatRelative(str)         // "5m ago" / "2h ago" / дата
initials(name)              // "JD"
changePercentColor(pct)     // text-green-600 / text-red-500 / text-muted-foreground
ticketStatusColor(status)   // CSS классы для Badge
ticketPriorityColor(p)
ticketKindIcon(kind)        // "🔥" / "🔧" / "💸" / "✅"
```

---

## Layout объектов (manager/assets/detail.tsx)

```
Header (название, specs, occupancy, delete)
Photos — полная ширина (grid-cols-4 sm:5 lg:6)
─────────────────────────────────────────────
grid [1fr 340px]:
  LEFT:  Booking → Tickets
  RIGHT: Rental details → Financials → Landlord → Utilities
─────────────────────────────────────────────
Amenities — полная ширина (toggle grid, всегда видна)
```

## Layout бронирования (manager/bookings/detail.tsx)

```
Header (tenant, даты, статус, unlink)
3 stat cards: Rent / Deposit / Contract — полная ширина
─────────────────────────────────────────────
grid [1fr 380px]:
  LEFT:  Guests (passport, TM-30, invite)
  RIGHT: Invoices → Tickets
```

---

## Tech debt

| Проблема | Файл |
|----------|------|
| JWT в localStorage | `auth.store.ts`, `client.ts` |
| `useUploadListingMedia` hook vs прямой вызов API | `assets/detail.tsx` |

---

## Команды

```bash
npm run dev      # Vite dev server
npm run build    # tsc -b && vite build
npm run lint     # ESLint
```

## Важно для Claude

- **Не запускать dev server** для проверки изменений
- Перед правками читать актуальный файл (не полагаться на память)
- При значимых изменениях обновлять этот файл и FRONTEND.md
