# PMC.BFF — API Reference

Base URL (dev): `http://localhost:5149`  
Auth: `Authorization: Bearer <jwt_token>`

---

## Auth Flow

### Email/Password
1. `POST /api/auth/login` → получить токен
2. `GET /api/auth/me` → роль пользователя
3. Redirect по роли: Admin → `/manager`, Landlord → `/landlord`, Tenant → `/tenant`

### LINE OAuth
1. Редирект на `https://access.line.me/oauth2/v2.1/authorize` (client-side)
2. LINE callback → `POST /api/auth/line-login` с `{ Code, RedirectUri }` → токен
3. Тот же flow что email/pass

### JWT
- Хранить в localStorage
- Передавать в каждом запросе: `Authorization: Bearer <token>`

---

## 1. Auth — `/api/auth`

### `POST /api/auth/register`
> Публичный
```json
// Request
{ "email": "string", "password": "string" }

// Response
{ "token": "string" }
```

### `POST /api/auth/login`
> Публичный
```json
// Request
{ "email": "string", "password": "string" }

// Response
{ "token": "string" }
```

### `POST /api/auth/line-login`
> Публичный
```json
// Request
{ "code": "string", "redirectUri": "string" }

// Response
{ "token": "string" }
```

### `GET /api/auth/me`
> 🔒 Requires Auth
```json
// Response
{
  "id": "guid",
  "email": "string",
  "lineName": "string | null",
  "firstName": "string | null",
  "lastName": "string | null",
  "lineUserId": "string | null",
  "roles": ["Admin" | "Landlord" | "Tenant"]
}
```

---

## 2. References — `/api/references`

> Все публичные. Загружать один раз при старте (`staleTime: Infinity`).

| Endpoint | Response |
|----------|----------|
| `GET /api/references/all` | Всё сразу: UnitTypes, PropertyCategories, RoomSegments, HouseRules, AmenitiesTree |
| `GET /api/references/unit-types` | `UnitType[]` |
| `GET /api/references/property-categories` | `PropertyCategory[]` |
| `GET /api/references/room-segments` | `RoomSegmentDefinition[]` |
| `GET /api/references/house-rules` | `HouseRuleDefinition[]` |
| `GET /api/references/amenities` | `AmenityDefinition[]` (flat) |
| `GET /api/references/amenity-categories` | `AmenityCategory[]` |
| `GET /api/references/amenities/tree` | `{ category: AmenityCategory, items: AmenityDefinition[] }[]` |

---

## 3. Assets — `/api/assets`

> 🔒 Все требуют авторизацию

### `POST /api/assets`
```json
// Request
{
  "internalName": "string",
  "assetTypeId": "guid",
  "maxOccupancy": 0,
  "bathrooms": 0,
  "bedrooms": 0,
  "beds": 0,
  "parentAssetId": "guid | null"
}

// Response
{ "id": "guid" }
```

### `GET /api/assets`
```json
// Response: AssetDto[]
[{
  "id": "guid",
  "internalName": "string",
  "occupancyStatus": "Occupied | Vacant | ActionRequired",
  "primaryImageUrl": "string | null",
  "currentTenantName": "string | null",
  "bedrooms": 0,
  "bathrooms": 0,
  "maxOccupancy": 0
}]
```

### `GET /api/assets/{id}`
```
Response: AssetDto (полный объект)
```

### `GET /api/assets/{id}/summary`
```
Query: from?: DateOnly, to?: DateOnly (по умолчанию YTD)

Response: AssetSummaryDto {
  assetId, assetName,
  totalRevenue, totalExpenses, netProfit,
  currentTenantName, leaseEnd
}
```

### `PUT /api/assets/location`
```json
// Request
{
  "assetId": "guid",
  "cityId": "guid",
  "streetAddress": "string",
  "latitude": 0.0,
  "longitude": 0.0,
  "timezone": "string | null"
}

// Response
{ "message": "string" }
```

---

## 4. Listings — `/api/listings`

> 🔒 Все требуют авторизацию

### `POST /api/listings`
```json
// Request
{
  "assetId": "guid",
  "title": "string",
  "description": "string",
  "houseRules": "string",
  "wifiName": "string",
  "wifiPassword": "string",
  "propertyCategoryId": "guid",
  "instantBookEnabled": true,
  "basePrice": 0.0
}

// Response
{ "id": "guid" }
```

### `GET /api/listings/{id}`
```json
// Response: ListingDto
{
  "id": "guid",
  "title": "string",
  "description": "string",
  "basePrice": 0.0,
  "wifiName": "string",
  "wifiPassword": "string",
  "houseRules": "string",
  "media": [{ "id": "guid", "url": "string", "sortOrder": 0, "caption": "string | null" }],
  "amenities": [{ "amenityId": "guid", "name": "string", "isPresent": true }]
}
```

### `GET /api/listings/asset/{assetId}`
```
Response: ListingDto[]
```

### `POST /api/listings/{listingId}/media`
```
Content-Type: multipart/form-data
Body: file (IFormFile), roomSegmentId?: guid

Response: { "mediaId": "guid" }
```

### `PUT /api/listings/media/reorder`
```json
// Request
{
  "listingId": "guid",
  "sortedMediaIds": ["guid", "guid"]
}
```

### `PUT /api/listings/amenities`
```json
// Request
{
  "listingId": "guid",
  "selectedAmenities": [
    { "amenityId": "guid", "isPresent": true, "detailsJson": "string | null" }
  ]
}
```

---

## 5. Calendar — `/api/listings/{listingId}/calendar`

> 🔒 Требует авторизацию

### `GET /api/listings/{listingId}/calendar`
```
Query: startDate (DateOnly, required), endDate (DateOnly, required)
Max span: 1 год

Response: CalendarDayDto[] [{
  date: "DateOnly",
  price: 0.0,
  status: "Available | Booked | Blocked"
}]
```

---

## 6. Bookings — `/api/bookings`

> 🔒 Все требуют авторизацию

### `POST /api/bookings`
```json
// Request
{
  "listingId": "guid",
  "checkInDate": "DateOnly",
  "checkOutDate": "DateOnly",
  "depositAmount": 0.0
}

// Response
{ "id": "guid" }
```

### `GET /api/bookings/my`
```
Response: BookingDto[] — только бронирования текущего тенанта
```

### `GET /api/bookings/{id}`
```json
// Response: BookingDto
{
  "id": "guid",
  "assetId": "guid",
  "listingId": "guid",
  "tenantId": "guid | null",
  "checkInDate": "DateOnly",
  "checkOutDate": "DateOnly",
  "rentAmount": 0.0,
  "depositAmount": 0.0,
  "status": "BookingStatus",
  "hasContract": true,
  "tenantName": "string | null",
  "listingTitle": "string | null",
  "primaryImageUrl": "string | null",
  "daysRemaining": 0
}
```

### `GET /api/bookings/asset/{assetId}`
```
Response: BookingDto[]
```

### `GET /api/bookings/{id}/tickets`
```
Response: TicketDto[]
```

### `GET /api/bookings/{id}/invoices`
```
Response: InvoiceDto[]
```

### `PATCH /api/bookings/{id}/status`
```json
// Request
{ "newStatus": "BookingStatus" }
```

### `GET /api/bookings/{id}/contract`
```json
// Response
{ "url": "string" }
```

### `POST /api/bookings/{id}/contract`
```
Content-Type: multipart/form-data
Body: file (PDF)

Response: { "url": "string" }
```

### `GET /api/bookings/{id}/guests`
```json
// Response: BookingGuestDto[]
[{
  "id": "guid",
  "bookingId": "guid",
  "userId": "guid | null",
  "isMainTenant": true,
  "firstName": "string | null",
  "lastName": "string | null",
  "dateOfBirth": "DateOnly | null",
  "nationality": "string | null",
  "passportNumber": "string | null",
  "passportExpiry": "DateOnly | null",
  "visaType": "string | null",
  "entryDate": "DateOnly | null",
  "entryPort": "string | null",
  "passportUpdatedAt": "DateTime | null",
  "tm30Filing": "Tm30FilingDto | null"
}]
```

### `POST /api/bookings/{id}/guests`
```json
// Request (все поля опциональны)
{
  "firstName": "string",
  "lastName": "string",
  "dateOfBirth": "DateOnly",
  "nationality": "string",
  "passportNumber": "string",
  "passportExpiry": "DateOnly",
  "visaType": "string",
  "entryDate": "DateOnly",
  "entryPort": "string"
}

// Response: BookingGuestDto
```

### `DELETE /api/bookings/{id}/guests/{guestId}`
```
Response: 204 No Content
```

### `PUT /api/bookings/{id}/guests/{guestId}/passport`
```json
// Request (все поля обязательны)
{
  "firstName": "string",
  "lastName": "string",
  "dateOfBirth": "DateOnly",
  "nationality": "string",
  "passportNumber": "string",
  "passportExpiry": "DateOnly",
  "visaType": "string",
  "entryDate": "DateOnly",
  "entryPort": "string"
}
```

### TM30
```
GET  /api/bookings/{id}/guests/{guestId}/tm30
  Response: Tm30FilingDto { id, bookingGuestId, status: Tm30Status, filedAt?, documentUrl? }

POST /api/bookings/{id}/guests/{guestId}/tm30
  Body: multipart/form-data, file (PDF)
  Response: Tm30FilingDto
```

---

## 7. Tickets — `/api/tickets`

> 🔒 Все требуют авторизацию

### `GET /api/tickets`
```
Response: TicketDto[] — все тикеты по активам пользователя, сортировка по priority/urgency
```

### `GET /api/tickets/attention`
```
Response: TicketDto[] — unassigned >24ч, pending >48ч, overdue, urgent
```

### `POST /api/tickets`
```json
// Request
{
  "assetId": "guid",
  "bookingId": "guid | null",
  "title": "string",
  "description": "string",
  "type": "TicketType",
  "kind": "TicketKind | null",
  "priority": "TicketPriority | null",
  "estimatedCost": 0.0,
  "assigneeId": "guid | null",
  "parentTicketId": "guid | null",
  "scheduledFor": "DateTime | null",
  "dueDate": "DateTime | null",
  "detailsJson": "string | null"
}

// Response
{ "id": "guid" }
```

### `GET /api/tickets/{id}`
```json
// Response: TicketDetailsDto (extends TicketDto)
{
  // ...все поля TicketDto...
  "events": "TicketEventDto[]",
  "messages": "TicketMessageDto[]",
  "children": "TicketDto[]",
  "allowedNextStatuses": ["TicketStatus"],
  "checklistItems": "ChecklistItemDto[] | null"
}
```

### `GET /api/tickets/asset/{assetId}`
```
Response: TicketDto[]
```

### `PATCH /api/tickets/{id}/status`
```json
{ "newStatus": "TicketStatus" }
```

### `PATCH /api/tickets/{id}/assignee`
```json
{ "assigneeId": "guid | null" }
```

### `PATCH /api/tickets/{id}/priority`
```json
{ "priority": "TicketPriority" }
```

### `POST /api/tickets/{id}/media`
```
Body: multipart/form-data, file
Response: { "url": "string" }
```

### `POST /api/tickets/{parentId}/spawn`
```json
// Request
{
  "kind": "TicketKind",
  "title": "string",
  "description": "string",
  "type": "TicketType",
  "priority": "TicketPriority | null",
  "estimatedCost": 0.0,
  "assigneeId": "guid | null",
  "scheduledFor": "DateTime | null",
  "dueDate": "DateTime | null",
  "detailsJson": "string | null"
}

// Response
{ "id": "guid" }
```

### `GET /api/tickets/{id}/events`
```json
// Response: TicketEventDto[]
[{
  "id": "guid",
  "ticketId": "guid",
  "actorId": "guid | null",
  "eventType": "TicketEventType",
  "fromValue": "string | null",
  "toValue": "string | null",
  "comment": "string | null",
  "createdAt": "DateTime"
}]
```

### `GET /api/tickets/{id}/messages`
```json
// Response: TicketMessageDto[]
// Internal сообщения видны только менеджеру/лендлорду
[{
  "id": "guid",
  "ticketId": "guid",
  "authorId": "guid",
  "authorName": "string | null",
  "body": "string",
  "visibility": "Public | Internal",
  "replyToMessageId": "guid | null",
  "createdAt": "DateTime",
  "attachments": [{ "id": "guid", "url": "string" }]
}]
```

### `POST /api/tickets/{id}/messages`
```json
// Request
{
  "body": "string",
  "visibility": "Public | Internal",
  "replyToMessageId": "guid | null"
}

// Response
{ "id": "guid" }
```

### `POST /api/tickets/{id}/messages/{messageId}/attachments`
```
Body: multipart/form-data, file
Response: { "id": "guid", "url": "string" }
```

### Checklist
```
POST   /api/tickets/{id}/checklist/items
  Request: { "title": "string" }

PATCH  /api/tickets/{id}/checklist/items/{itemId}
  Request: { "done": true, "photoUrl": "string | null" }

DELETE /api/tickets/{id}/checklist/items/{itemId}
```

---

## 8. Finance — `/api/finance`

> 🔒 Все требуют авторизацию

### `GET /api/finance/summary`
```
Query: from?: DateOnly, to?: DateOnly (YTD по умолчанию)

Response: FinanceSummaryDto {
  totalRevenue, totalExpenses, netProfit,
  revenueByType: FinanceCategoryDto[],
  expensesByType: FinanceCategoryDto[]
}
```

### `GET /api/finance/overview`
```json
// Response: LandlordOverviewDto
{
  "currentMonthIncome": 0.0,
  "previousMonthIncome": 0.0,
  "changePercent": 0.0,
  "projectedEndOfMonth": 0.0,
  "currency": "THB"
}
```

### `GET /api/finance/analytics`
```
Query: period = "1m" | "3m" | "6m" | "year"
Response: AssetAnalyticsDto (агрегировано по всем активам)
```

### `GET /api/finance/analytics/{assetId}`
```json
// Query: period = "1m" | "3m" | "6m" | "year"
// Response: AssetAnalyticsDto
{
  "assetId": "guid",
  "assetName": "string",
  "profit": 0.0,
  "profitYear": 0.0,
  "roi": 0.0,
  "revenue": 0.0,
  "expenses": 0.0,
  "expenseStructure": [{ "category": "string", "amount": 0.0 }],
  "unitPerformance": "UnitPerformanceDto[]"
}
```

### `GET /api/finance/cash-on-hand`
```json
// Response
{ "amount": 0.0, "currency": "THB" }
```

### `GET /api/finance/tickets/{ticketId}/invoices`
```
Response: InvoiceDto[]
```

### `POST /api/finance/bookings/{bookingId}/generate-invoices`
```json
// Response
{ "message": "string" }
```

### `POST /api/finance/invoices/{id}/pay`
```json
// Request
{ "method": "PaymentMethod", "amount": 0.0 }

// Response
{ "message": "string" }
```

### `POST /api/finance/invoices/custom`
```json
// Request
{
  "assetId": "guid",
  "bookingId": "guid | null",
  "ticketId": "guid | null",
  "amount": 0.0,
  "dueDate": "DateOnly | null",
  "type": "InvoiceType",
  "description": "string | null"
}

// Response
{ "invoiceId": "guid", "message": "string" }
```

### Remittance
```
POST /api/finance/remittance/create
  Response: { "batchId": "guid" }

POST /api/finance/remittance/{id}/confirm
  Request: { "slipUrl": "string" }
  Response: { "message": "string" }
```

---

## 9. Invites — `/api/invites`

> 🔒 Требует авторизацию

### `POST /api/invites/generate`
```json
// Request
{
  "entityId": "guid",         // bookingId или assetId
  "type": "InviteType",       // TenantInvite | OwnerInvite
  "recipientEmail": "string | null",
  "recipientName": "string | null"
}

// Response: InviteResponseDto
{
  "token": "guid",
  "link": "http://localhost:5173/invite?token=<guid>",  // готовая ссылка
  "expiresAt": "DateTime"
}
```

### `POST /api/invites/accept`
```json
// Request
{ "token": "guid" }

// Response
{ "message": "string" }
```

---

## 10. Utilities — `/api/utilities`

> 🔒 Требует авторизацию

### `GET /api/utilities/asset/{assetId}`
```json
// Response: UtilityContractDto[]
[{
  "id": "guid",
  "assetId": "guid",
  "utilityType": "string",
  "providerName": "string",
  "accountNumber": "string"
}]
```

### `POST /api/utilities`
```json
// Request
{
  "assetId": "guid",
  "utilityType": "string",
  "providerName": "string",
  "accountNumber": "string"
}

// Response: UtilityContractDto
```

### `DELETE /api/utilities/{contractId}`
```
Response: 204 No Content
```

---

## Enums

### UserRole
| Value | Int |
|-------|-----|
| Admin | 1 |
| Landlord | 2 |
| Tenant | 3 |

### TicketStatus
| Status | Int | Описание |
|--------|-----|----------|
| Draft | 10 | Черновик |
| Reported | 11 | Подан |
| Triaging | 12 | Разбор |
| Quoted | 13 | Оценён |
| PendingApproval | 14 | Ожидает согласования лендлорда |
| InProgress | 15 | В работе |
| Blocked | 16 | Заблокирован |
| Verified | 17 | Проверен |
| Closed | 18 | Закрыт |
| Reopened | 19 | Переоткрыт |
| Cancelled | 20 | Отменён |

> ⚠️ Legacy статусы (1-5) — не использовать в UI

### TicketKind
| Value | Int |
|-------|-----|
| Incident | 1 |
| WorkOrder | 2 |
| Expense | 3 |
| Checklist | 4 |

### TicketType
| Value | Int |
|-------|-----|
| Rent | 1 |
| Utilities | 2 |
| Maintenance | 3 |
| Cleaning | 4 |
| Other | 5 |
| Complaint | 6 |
| Request | 7 |
| Inspection | 8 |

### TicketPriority
| Value | Int |
|-------|-----|
| Low | 1 |
| Normal | 2 |
| High | 3 |
| Urgent | 4 |

### TicketEventType
| Value | Int |
|-------|-----|
| Created | 1 |
| StatusChanged | 2 |
| AssigneeChanged | 3 |
| PriorityChanged | 4 |
| CostUpdated | 5 |
| MediaAdded | 6 |
| MessagePosted | 7 |
| Reopened | 8 |
| ChildSpawned | 9 |
| ChecklistItemToggled | 10 |
| FieldUpdated | 11 |

### MessageVisibility
| Value | Int | Кто видит |
|-------|-----|-----------|
| Public | 1 | Все (тенант, менеджер, лендлорд) |
| Internal | 2 | Только менеджер и лендлорд |

### PaymentStatus
| Value | Int |
|-------|-----|
| NotApplicable | 1 |
| Unpaid | 2 |
| PendingVerify | 3 |
| Paid | 4 |
| Overdue | 5 |

### BookingStatus
`Inquiry → Confirmed → Active → Completed → Cancelled`

### InviteType
| Value | Описание |
|-------|----------|
| TenantInvite | Приглашение арендатора (entityId = bookingId) |
| OwnerInvite | Приглашение лендлорда (entityId = assetId) |

---

## Ticket UI Rules

1. **`allowedNextStatuses`** — единственный источник кнопок смены статуса. Не вычислять на фронте.
2. **`kind`** определяет какие панели рендерить:
   - `WorkOrder` → показывать Checklist
   - `Expense` → показывать EstimatedCost, подрядчик
   - `Checklist` → показывать ChecklistItems panel
3. **Internal messages** — скрывать от тенанта (`visibility === "Internal"`)
4. **Thread** = Events + Messages, смешанные хронологически
5. **Статусы в UI** (цвета):
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

## Access Control Rules

| Операция | Требует |
|----------|---------|
| Просмотр актива | CanAccessAsset — владелец или менеджер |
| Редактирование актива | CanManageAsset — только менеджер |
| Просмотр бронирования | CanAccessBooking — тенант (своё) или менеджер/лендлорд |
| Управление бронированием | CanManageBooking — только менеджер |
| Internal-сообщения | CanViewInternalMessages — менеджер и лендлорд |
| Invites: TenantInvite | entityId = bookingId |
| Invites: OwnerInvite | entityId = assetId |

---

## Error Responses

```json
// 400 Bad Request (validation)
{ "errors": { "fieldName": ["error message"] } }

// 401 Unauthorized
{ "type": "...", "title": "Unauthorized", "status": 401 }

// 404 Not Found
{ "type": "...", "title": "Not Found", "status": 404 }
```
