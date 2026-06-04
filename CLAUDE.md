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

- Единственный источник истины — Zustand-стор `useAuthStore` (`lib/stores/auth.store.ts`); persist под ключом `localStorage["pmc_auth"]`
- `apiClient` (axios) на каждом запросе читает токен через `useAuthStore.getState().token` — **не** через `localStorage` напрямую
- 401 interceptor → `useAuthStore.getState().clearAuth()` → `window.location.href = "/login"` (только если у юзера БЫЛ токен; anonymous 401 не редиректит)
- В `client.ts` есть одноразовая миграция: если в localStorage остался старый `pmc_token` — импортируется в стор и legacy-ключ удаляется
- LINE OAuth: `VITE_LINE_CLIENT_ID`, `VITE_LINE_REDIRECT_URI`
- `AuthGuard` с опциональным `requiredRole`

---

## Ключевые правила (нарушать нельзя)

1. **Ticket статусы** — `allowedNextStatuses` из API — единственный источник кнопок смены статуса. Никогда не вычислять переходы на фронте.
2. **Видимость сообщений** — `Internal` видят только Manager. Tenant и Landlord: `messages.filter(m => m.visibility === "Public")`.
3. **Amenities** — секция всегда видна (даже пустая). Порядок: `isPresent=true` сначала.
4. **shadcn/ui** (`components/ui/`) — не модифицировать.
5. **Инвайты** — бэкенд отдаёт `?token=` (query param). `InviteAcceptPage` поддерживает оба формата: `useParams` + `useSearchParams`.
6. **Граница фронт/бэк** — Claude работает только с `pmc-web`. Если что-то не работает из-за бэкенда (5xx, отсутствующее поле, не применённая миграция) — сформулировать ТЗ для бэкенд-команды и передать через пользователя. Не читать и не изменять файлы `PMC.BFF`.

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

## UX-философия платформы

**Максимальная аддиктивность и дофамин.** Пользователь должен испытывать предвкушение, экстаз и ощущение победы при каждом ключевом взаимодействии. Особенно:
- Лендлорд при создании объекта — предвкушение дохода, ощущение старта чего-то большого
- Любое завершение flow — визуальный "фейерверк", celebration
- Прогресс, социальное доказательство, earnings-preview — везде где уместно
- Никакой "бледности" — градиенты, анимации, живые числа, эмоциональный копирайт

Психологические принципы: anticipation, variable reward, completion anxiety, loss aversion (показывай что теряешь без действия), social proof.

---

## Важно для Claude

- Перед правками читать актуальный файл (не полагаться на память)
- При значимых изменениях обновлять этот файл и FRONTEND.md

---

## Bug tracker — единая точка координации FE / BE / QA

**Файл:** [`BUG_TRACKER.md`](BUG_TRACKER.md) в корне проекта. Это **рабочий backlog текущего раунда**; LANDLORD_FLOW_QA / TENANT_FLOW_QA / BACKEND_ISSUES — архив прошлых раундов, читать только для контекста.

**Правила работы Claude с трекером:**

1. **В начале каждой сессии**, когда пользователь говорит «фикси баги» / «по трекеру» / похожее — открыть `BUG_TRACKER.md`, прочитать Index, отфильтровать `Owner: FE` или `Owner: FE+BE` со статусом 🟥 New / 🟥 Reopened.
2. **Перед началом работы над тикетом** — поменять `Status: 🟧 In progress`, в `Assignee` вписать `Claude {дата}`.
3. **По ходу** — TaskCreate в task-tracker'е Claude Code на каждый тикет для прозрачности прогресса в UI.
4. **При завершении** — `Status: 🟩 Done (awaiting QA)`, в `History` добавить строку `{дата} · Claude · {что сделано, какие файлы, какой подход}`. Не сжимать описание — следующий разработчик / QA должны понимать решение без чтения diff'а.
5. **Если фикс требует backend** — `Status: 🟨 Blocked`, в `History` сформулировать **готовое ТЗ** для BE-команды (endpoint, схема DTO, ожидаемое поведение, edge-cases). Не лезть в `PMC.BFF`.
6. **Тикет, требующий продуктового решения** — оставить `🟥 New` с тегом `@PM` в `Open questions`, не угадывать поведение.
7. **В конце сессии** — пройтись по Index, проверить, что иконки в таблице совпадают со статусами в секциях. Обновить Changelog внизу файла одной строкой: что закрыто, что осталось, ссылки на отдельные тикеты.

**Сопутствующие инструкции:**
- [`BACKEND_WORKFLOW.md`](BACKEND_WORKFLOW.md) — для бэкенд-команды (как читать BE-тикеты, что писать в History после деплоя).
- [`QA_WORKFLOW.md`](QA_WORKFLOW.md) — для тестировщика (как верифицировать 🟩 Done, как переоткрывать регрессии).

Эти три файла — единственный канал координации. В чатах, тикетах сторонних трекеров, или Slack-сообщениях ничего параллельно не дублировать.
