# Frontend ТЗ — Siamo (pmc-web)

**Дата:** 2026-05-24
**Аудитория:** Claude Code (как исполнитель) + human reviewer.

> ⚠️ **Важно:** Claude Code плох в дизайне с нуля. Поэтому это ТЗ построено по принципу **«копируй существующие референсы»** — каждая задача ссылается на уже работающий красивый паттерн в репо. Не выдумывай layout — переиспользуй.

## Содержание

1. [Используй существующие референсы](#0-используй-существующие-референсы-обязательно-к-чтению)
2. [Design tokens (что использовать всегда)](#1-design-tokens)
3. [Reusable component recipes](#2-reusable-component-recipes)
4. [P0 — Production blockers](#3-p0--production-blockers)
5. [P1 — UX gaps](#4-p1--ux-gaps)
6. [P2 — Polish](#5-p2--polish)
7. [Backend dependencies](#6-backend-dependencies)
8. [Definition of Done](#7-definition-of-done)

---

## 0. Используй существующие референсы (ОБЯЗАТЕЛЬНО К ЧТЕНИЮ)

В репо есть несколько экранов, которые QA пометил как **gold standard**. Они уже красивые. **Любой новый экран должен сначала прочитать соответствующий референс и сэмулировать его layout/tone/spacing.**

| Reference | Файл | Что взять оттуда |
|-----------|------|------------------|
| **Property creation wizard** | `src/features/me/host/properties/editor/property-editor-page.tsx` | Hero copy + progress bar + numbered step chips + per-section time estimates + sticky bottom CTA + LIVE PREVIEW sidebar. Tone: «А few quick steps — most hosts finish in under 6 minutes». |
| **Reject application modal** | `src/features/me/host/requests/detail-page.tsx` (где `Reject` button) | Pre-canned reason templates + custom textarea + empathy-copy. Pattern для всех reason-required dialogs. |
| **Payment gateway overlay** | `src/features/me/guest/bookings/gateway-overlay.tsx` | Lock-icon + `SANDBOX` badge + `2C2P` brand + processing spinner + graceful 30s timeout copy. Pattern для всех high-stakes confirmation moments. |
| **TM-30 filing UI** | `src/features/me/host/bookings/detail-page.tsx` Guests tab | Big banner + 3 action CTAs + per-guest cards. Pattern для compliance/regulatory flows. |
| **Listing detail cancellation policy** | `src/features/marketplace/listing-detail-page.tsx` (search `Two windows`) | Twin-card pattern (Grace / After grace), uses `success/warning` token bg + clean grid. |
| **Booking detail header (host)** | `src/features/me/host/bookings/detail-page.tsx` | KPI strip (4 cards: Monthly rent / Deposit / Contract / TM-30) с цветовой кодировкой статусов. |

**Правило:** перед началом любой задачи P1-* — `Read` соответствующий референс целиком. Не угадывай.

---

## 1. Design tokens

**Все цвета только через токены.** Никаких хардкод `#hex` в новых компонентах.

### Поверхности и текст

| Использование | Class |
|---|---|
| Page background | `bg-bg` |
| Card background | `bg-bg-card` |
| Subtle/muted background (chip, inset) | `bg-bg-subtle` |
| Primary text | `text-fg` |
| Secondary text | `text-fg-muted` |
| Disabled / placeholder | `text-fg-subtle` |
| Border | `border-border` (тонкий) / `border-border-strong` (выраженный) |

### Цвета акцентов

| Семантика | Class | When |
|---|---|---|
| Brand (primary CTAs, links) | `bg-brand text-brand-fg hover:bg-brand-hover` | Главное действие на странице |
| Success | `text-success` / `bg-success-bg` / `border-success/30` | Подтверждения, completed |
| Warning | `text-warning` / `bg-warning-bg` / `border-warning/30` | Внимание, soft urgency |
| Danger | `text-danger` / `bg-danger-bg` / `border-danger/30` | Ошибки, destructive |
| Info | `text-info` / `bg-info-bg` | Нейтральная информация |

### Типографика

```ts
font-display = Playfair Display   // hero headings only (h1 уровень landing)
font-sans    = Plus Jakarta Sans  // всё остальное
font-mono    = JetBrains Mono     // числа в финансах, IDs, passport numbers
```

Размеры через Tailwind: `text-xs` (12) → `text-sm` (14) → `text-base` (16) → `text-lg` (18) → `text-xl` (22) → `text-2xl` (28) → `text-3xl` (36) → `text-hero` (64).

### Радиусы

- Кнопки, чипы: `rounded-pill` или `rounded-xl`
- Cards: `rounded-2xl`
- Modals/dialogs: `rounded-3xl`
- Inputs: `rounded-lg`

### Тени

- Cards: `shadow-card`
- Hover lift: `shadow-hover` (применять `transition-shadow`)
- Modals/popovers: `shadow-pop`

### Spacing (8pt grid)

Используй стандартный Tailwind scale. Между sections — `space-y-6` или `space-y-8`. Внутри card — `p-5` или `p-6`. Между inline chips — `gap-2`.

---

## 2. Reusable component recipes

Это **готовые JSX-куски** которые надо вынести в `src/components/shared/` если их нет, и переиспользовать. Если уже есть похожий — `Read` его и use as is.

### Recipe A: KPI Tile

Используется в Finance, Dashboard, любой metrics-row.

```tsx
// src/components/shared/kpi-tile.tsx
interface KpiTileProps {
  label: string;           // "This month"
  value: string;           // "฿35,000"
  delta?: { value: string; positive?: boolean }; // { value: "+12%", positive: true }
  hint?: string;           // "vs previous month"
  sparkline?: number[];    // optional mini-chart data
}

<div className="rounded-2xl bg-bg-card border border-border p-5 shadow-card">
  <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">{label}</p>
  <p className="mt-2 text-2xl font-bold text-fg font-mono tabular-nums">{value}</p>
  {delta && (
    <p className={cn("mt-1 text-xs font-medium",
      delta.positive ? "text-success" : "text-danger")}>
      {delta.value} {hint}
    </p>
  )}
  {sparkline && <Sparkline data={sparkline} className="mt-3 h-8 w-full" />}
</div>
```

**Не делай:** одинаковые цифры в 4 cards подряд (UX-228). Если данных мало — лучше 1 большая card.

### Recipe B: Page Header (для cabinet pages)

```tsx
<header className="mb-6 flex items-end justify-between flex-wrap gap-3">
  <div>
    <h1 className="text-2xl font-bold text-fg tracking-tight">{title}</h1>
    {subtitle && <p className="mt-1 text-sm text-fg-muted">{subtitle}</p>}
  </div>
  {action && <Button variant="default" className="bg-brand">{action}</Button>}
</header>
```

### Recipe C: Empty state (полноэкранный)

Использовать когда у пользователя 0 элементов в list.

```tsx
<div className="flex flex-col items-center justify-center py-20 px-6 text-center max-w-md mx-auto">
  <div className="w-20 h-20 rounded-full bg-bg-subtle flex items-center justify-center mb-5">
    <Icon className="w-9 h-9 text-fg-muted" />
  </div>
  <h2 className="text-xl font-bold text-fg">{headline}</h2>
  <p className="mt-2 text-sm text-fg-muted leading-relaxed">{copy}</p>
  <div className="mt-6 flex gap-2">
    {primaryCta && <Button className="bg-brand">{primaryCta}</Button>}
    {secondaryCta && <Button variant="outline">{secondaryCta}</Button>}
  </div>
</div>
```

**Не делай:** мелкая иконка + 1 строка копи + ничего. Empty state — это **возможность engage**, не оправдание для пустого экрана.

### Recipe D: Chip / Pill

```tsx
// Status pill (badge)
<span className="inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-xs font-medium
  bg-success-bg text-success border border-success/20">
  ✓ Signed
</span>

// Action chip (clickable)
<button className="inline-flex items-center gap-1.5 rounded-pill border border-border px-3 py-1.5
  text-xs font-medium text-fg hover:bg-bg-subtle transition-colors">
  + Add resident
</button>
```

### Recipe E: Card row / list item

Замена для текущих pseudo-table rows.

```tsx
<Link to={...} className="group flex items-center gap-4 rounded-2xl bg-bg-card border border-border p-4
  hover:shadow-hover hover:border-border-strong transition-all">
  <img src={coverUrl} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
  <div className="flex-1 min-w-0">
    <p className="font-semibold text-fg truncate">{title}</p>
    <p className="mt-0.5 text-sm text-fg-muted truncate">{subtitle}</p>
    <div className="mt-2 flex flex-wrap gap-1.5">
      {chips}
    </div>
  </div>
  <div className="shrink-0 text-right">
    <p className="font-mono tabular-nums text-fg">{price}</p>
    <p className="text-xs text-fg-muted mt-0.5">{meta}</p>
  </div>
  <ChevronRight className="w-4 h-4 text-fg-subtle group-hover:text-fg-muted transition-colors shrink-0" />
</Link>
```

**Не делай:** круглую иконку часов вместо фото объекта (текущий UX-145).

### Recipe F: Disabled button — глобальный фикс

В `src/components/ui/button.tsx` убедиться что disabled state выглядит так:

```tsx
disabled:
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:hover:bg-brand"
```

И в любой кнопке-CTA НЕ override через `className="bg-brand"` без `disabled:opacity-50`.

### Recipe G: Inline metric chip (для cards)

```tsx
<div className="flex flex-wrap gap-1.5">
  <span className="inline-flex items-center gap-1 text-xs text-fg-muted">
    <CalendarIcon className="w-3 h-3" /> 6 months
  </span>
  <span className="text-fg-subtle">·</span>
  <span className="inline-flex items-center gap-1 text-xs font-mono tabular-nums text-fg">
    ฿35,000/mo
  </span>
  <span className="text-fg-subtle">·</span>
  <span className="inline-flex items-center gap-1 text-xs text-success">
    <Check className="w-3 h-3" /> Signed
  </span>
</div>
```

### Recipe H: CountdownPill

Показывает "Expires in 2d 4h" с цветом по urgency. Используется в заявках на бронирование.

```tsx
// src/components/shared/countdown-pill.tsx
import { differenceInHours, parseISO } from "date-fns";

interface CountdownPillProps { deadline: string; className?: string; }

export function CountdownPill({ deadline, className }: CountdownPillProps) {
  const hoursLeft = differenceInHours(parseISO(deadline), new Date());
  const label = hoursLeft <= 0
    ? "Expired"
    : hoursLeft < 24
    ? `${hoursLeft}h left`
    : `${Math.floor(hoursLeft / 24)}d ${hoursLeft % 24}h left`;
  const color = hoursLeft <= 0
    ? "bg-danger/10 text-danger border-danger/20"
    : hoursLeft < 24
    ? "bg-warning/10 text-warning border-warning/20"
    : "bg-bg-subtle text-fg-muted border-border";
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-pill border px-2 py-0.5 text-xs font-medium",
      color, className
    )}>
      <Clock className="w-3 h-3" /> {label}
    </span>
  );
}
```

### Recipe I: ActivityFeed

Вертикальная лента событий (ticket events, booking status changes). Для `/landlord` и `/manager` side panels.

```tsx
// src/components/shared/activity-feed.tsx
interface ActivityEvent {
  id: string;
  icon?: ReactNode;      // default: dot
  title: string;
  time: string;          // ISO string → formatRelative
  description?: string;
}

<div className="space-y-0">
  {events.map((e, i) => (
    <div key={e.id} className="flex gap-3 pb-4 relative">
      {/* vertical line */}
      {i < events.length - 1 && (
        <div className="absolute left-3.5 top-7 bottom-0 w-px bg-border" />
      )}
      <div className="w-7 h-7 rounded-full bg-bg-subtle border border-border flex items-center justify-center shrink-0 mt-0.5 z-10">
        {e.icon ?? <div className="w-2 h-2 rounded-full bg-fg-muted" />}
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-sm font-medium text-fg">{e.title}</p>
        {e.description && <p className="text-xs text-fg-muted mt-0.5">{e.description}</p>}
        <p className="text-xs text-fg-subtle mt-1">{formatRelative(e.time)}</p>
      </div>
    </div>
  ))}
</div>
```

### Recipe J: PropertyMiniCard / MiniListingCard

Горизонтальная card в списке (для "Recently viewed", property list). Одинаковая структура, разный тип данных.

```tsx
// Inline везде где нужна (не выносить пока не 3+ uses)
<Link to={to} className="flex items-center gap-3 rounded-xl bg-bg-card border border-border p-3 hover:shadow-hover transition-all">
  <img
    src={coverUrl ?? "/placeholder.jpg"}
    alt=""
    className="w-14 h-14 rounded-lg object-cover shrink-0"
  />
  <div className="flex-1 min-w-0">
    <p className="text-sm font-semibold text-fg truncate">{title}</p>
    <p className="text-xs text-fg-muted truncate mt-0.5">{subtitle}</p>
  </div>
  <ChevronRight className="w-4 h-4 text-fg-subtle shrink-0" />
</Link>
```

### Recipe K: Sparkline (mini chart)

Inline sparkline для KPI tiles. Используй `recharts` — он уже в стеке.

```tsx
// src/components/shared/sparkline.tsx
import { ResponsiveContainer, AreaChart, Area, Tooltip } from "recharts";

interface SparklineProps { data: number[]; className?: string; positive?: boolean; }

export function Sparkline({ data, className, positive = true }: SparklineProps) {
  const series = data.map((v, i) => ({ i, v }));
  const color = positive ? "var(--color-success)" : "var(--color-danger)";
  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
          <Area dataKey="v" stroke={color} fill={color} fillOpacity={0.15} strokeWidth={1.5} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
```

---

## 3. P0 — Production blockers

### P0-1. Forgot password + recovery flow

**Refs:** `BUG-202`. Backend `POST /api/auth/forgot-password` + `/api/auth/reset-password` уже готов (`BE-32`).

**Что делать:**

1. **`src/pages/login.tsx`** — под Password field добавить:
   ```tsx
   <div className="flex justify-end -mt-2 mb-3">
     <Link to="/forgot-password" className="text-xs font-medium text-brand hover:text-brand-hover">
       Forgot password?
     </Link>
   </div>
   ```

2. **`src/pages/forgot-password.tsx`** (new). Layout — копируй `src/pages/login.tsx` (Siamo logo, card 400px, etc.). Поля:
   - h1: `Reset your password`
   - p: `Enter your email and we'll send you a reset link.`
   - Email input (используй `name="email"`, `autoComplete="email"`).
   - CTA `Send reset link` (Recipe F disabled-state).
   - Под CTA: `← Back to sign in` link.

3. **`src/pages/reset-password.tsx`** (new). Принимает `?token=...`. Layout копируй `src/pages/register.tsx` — там уже есть **password requirements list** (`src/components/shared/password-hints.tsx`).
   - h1: `Set a new password`
   - New password + confirm new password.
   - Used existing `PasswordHints` component (✗ At least 8 / ✗ One uppercase / ✗ One lowercase / ✗ One number).
   - CTA `Change password`.

4. **`src/App.tsx`** — добавить routes:
   ```tsx
   <Route path="/forgot-password" element={<ForgotPasswordPage />} />
   <Route path="/reset-password" element={<ResetPasswordPage />} />
   ```

5. **`src/lib/api/auth.api.ts`** — добавить:
   ```ts
   forgotPassword: (email: string) =>
     apiClient.post("/api/auth/forgot-password", { email }).then(() => undefined),
   resetPassword: (token: string, password: string) =>
     apiClient.post("/api/auth/reset-password", { token, password }).then(() => undefined),
   ```

6. **Success state** на `/forgot-password` после submit:
   ```tsx
   <div className="text-center py-6">
     <div className="w-16 h-16 mx-auto rounded-full bg-success-bg flex items-center justify-center mb-4">
       <Mail className="w-7 h-7 text-success" />
     </div>
     <h2 className="text-xl font-bold text-fg">Check your inbox</h2>
     <p className="mt-2 text-sm text-fg-muted">
       If <strong>{email}</strong> is registered, we sent a reset link. It expires in 1 hour.
     </p>
     <p className="mt-4 text-xs text-fg-subtle">
       Didn't get it? Check spam, or <button className="text-brand">try again</button>.
     </p>
   </div>
   ```
   ⚠️ Copy «If X is registered…» — не подтверждает существование email (анти-enumeration).

**Acceptance:** click «Forgot password?» → email → reset → login с новым паролем.

---

### P0-2. Profile → Security: Change password card

**Refs:** `BUG-165`. Backend `POST /api/auth/change-password` готов.

**Что делать (`src/pages/profile.tsx`, Security section):**

Layout копируй существующий Security section (Email row + Sign out row), но добавь между ними **Change password card**:

```tsx
<div className="rounded-2xl bg-bg-card border border-border p-5 shadow-card">
  <div className="flex items-start gap-3 mb-4">
    <Lock className="w-5 h-5 text-fg-muted shrink-0 mt-0.5" />
    <div>
      <h3 className="font-semibold text-fg">Password</h3>
      <p className="text-sm text-fg-muted">Change your password regularly to keep your account safe.</p>
    </div>
  </div>

  {!expanded ? (
    <Button variant="outline" onClick={() => setExpanded(true)}>Change password</Button>
  ) : (
    <form className="space-y-3">
      <div>
        <Label>Current password</Label>
        <Input type="password" name="current" />
      </div>
      <div>
        <Label>New password</Label>
        <Input type="password" name="new" onChange={(e) => setNew(e.target.value)} />
        <PasswordHints password={newPwd} className="mt-2" />  {/* reuse from register */}
      </div>
      <div>
        <Label>Confirm new password</Label>
        <Input type="password" name="confirm" />
      </div>
      <div className="flex gap-2 pt-2">
        <Button onClick={() => setExpanded(false)} variant="outline">Cancel</Button>
        <Button disabled={!allRequirementsMet}>Change password</Button>
      </div>
    </form>
  )}
</div>
```

После success — toast `Password changed · You'll need to sign in again on other devices`. + auto-call `useAuthStore.getState().clearAuth()` если backend revoke old token. (Optionally — second card «Active sessions» с button «Sign out all other devices», но это P1.)

**Acceptance:** Sarah меняет пароль → next login требует новый.

---

### P0-3. Landing categories — disabled state с tooltip

**Refs:** `BUG-210`.

**Что делать (`src/pages/landing.tsx`):**

Найти 6 category tabs (STAYS / VEHICLES / EQUIPMENT / SPACES / SERVICES / EXPERIENCES). Сейчас они decorative divs.

**Минимальный фикс:**

```tsx
const categories = [
  { key: "stays",       label: "STAYS",       icon: Home,    available: true  },
  { key: "vehicles",    label: "VEHICLES",    icon: Car,     available: false },
  { key: "equipment",   label: "EQUIPMENT",   icon: Camera,  available: false },
  { key: "spaces",      label: "SPACES",      icon: Building,available: false },
  { key: "services",    label: "SERVICES",    icon: Wrench,  available: false },
  { key: "experiences", label: "EXPERIENCES", icon: Compass, available: false },
];

<div className="flex gap-6 sm:gap-10">
  {categories.map(c => (
    <Tooltip key={c.key}>
      <TooltipTrigger asChild>
        <button
          onClick={c.available ? () => navigate(`/listings?cat=${c.key}`) : undefined}
          disabled={!c.available}
          className={cn(
            "flex flex-col items-center gap-1.5 pb-2 transition-colors group",
            c.available
              ? "text-fg hover:text-brand cursor-pointer"
              : "text-fg-subtle cursor-not-allowed opacity-60",
            active === c.key && "text-fg border-b-2 border-fg",
          )}
        >
          <c.icon className="w-5 h-5" />
          <span className="text-xs font-semibold tracking-wider">{c.label}</span>
        </button>
      </TooltipTrigger>
      {!c.available && (
        <TooltipContent>Coming soon — Q3 2026</TooltipContent>
      )}
    </Tooltip>
  ))}
</div>
```

**Acceptance:** click VEHICLES → tooltip «Coming soon — Q3 2026», курсор not-allowed, opacity 60%.

---

### P0-4. Wishlist UI

**Refs:** `BUG-211`.

**Что делать:**

1. **`src/lib/hooks/use-wishlist.ts`** — обёртка над localStorage (если ещё нет):
   ```ts
   const KEY = "pmc_wishlist";
   export function useWishlist() {
     const [ids, setIds] = useState<string[]>(() => JSON.parse(localStorage.getItem(KEY) || "[]"));
     const toggle = (id: string) => {
       const next = ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id];
       setIds(next);
       localStorage.setItem(KEY, JSON.stringify(next));
     };
     return { ids, toggle, has: (id: string) => ids.includes(id) };
   }
   ```

2. **`src/pages/wishlist.tsx`** (new). Использует Recipe C (empty state) если пусто, иначе re-use листинг-grid из `listings-page.tsx`:
   ```tsx
   const { ids } = useWishlist();
   const { data: listings } = useQuery({
     queryKey: ["wishlist-listings", ids],
     queryFn: () => Promise.all(ids.map(id => marketplaceApi.getListing(id))),
     enabled: ids.length > 0,
   });

   if (ids.length === 0) {
     return <EmptyState headline="No saved listings yet"
                        copy="Tap the heart on any listing to save it for later."
                        primaryCta={<Link to="/listings">Browse rentals</Link>} />;
   }
   return <ListingsGrid listings={listings} />;
   ```

3. **Route** в `App.tsx`: `<Route path="/wishlist" element={<WishlistPage />} />`.

4. **Header**: в анонимном/auth режиме добавить heart-icon с counter:
   ```tsx
   <Link to="/wishlist" className="relative">
     <Heart className="w-5 h-5" />
     {ids.length > 0 && (
       <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center">
         {ids.length}
       </span>
     )}
   </Link>
   ```

5. **Card heart toggle** в `listings-page.tsx` — заменить статичный heart на `<HeartButton listingId={id} />` который использует `useWishlist`.

**Acceptance:** click heart → counter в header → click counter → `/wishlist` → grid saved listings.

---

### P0-5. Disabled buttons → visible disabled state (глобально)

**Refs:** `BUG-180`, `BUG-188`, `UX-199`.

**Что делать:**

1. **`src/components/ui/button.tsx`** — проверить что variant `default` имеет:
   ```ts
   "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
   ```
   В shadcn-стандарте это уже есть. Если есть `disabled:bg-brand` override — убрать.

2. **Audit перебить override-ы:**
   ```bash
   rg "className=.*bg-brand.*disabled" src/
   rg "className=\"[^\"]*disabled:bg" src/
   ```
   Везде где `bg-brand` хардкодится — обернуть через variant или добавить `disabled:opacity-50 disabled:cursor-not-allowed`.

3. **Особенно проверить:**
   - `src/features/marketplace/components/booking-request-modal.tsx` — Continue button
   - `src/pages/register.tsx` — Create account button
   - Любая кнопка в `editor/property-editor-page.tsx`

4. **Bonus**: tooltip на disabled button с hint что blockирует:
   ```tsx
   <Tooltip>
     <TooltipTrigger asChild>
       <span tabIndex={0}>  {/* disabled buttons don't fire events */}
         <Button disabled>Continue</Button>
       </span>
     </TooltipTrigger>
     <TooltipContent>{disabledReason || "Fill required fields to continue"}</TooltipContent>
   </Tooltip>
   ```

**Acceptance:** все disabled CTA выглядят опускаемо (opacity-50, cursor not-allowed). Hover → tooltip с причиной.

---

## 4. P1 — UX gaps

### P1-1. Tenant Home page

**Refs:** `UX-217`.

**Файл:** `src/features/me/guest/home-page.tsx` (new). Route: `/me/guest` (default after login).

**Layout — копируй структуру `property-editor-page.tsx` hero (purple gradient hero) + KPI strip + 2-column body:**

```tsx
<div className="space-y-6">

  {/* HERO — копируй gradient block из editor */}
  <section className="rounded-3xl bg-gradient-to-br from-brand/10 via-brand/5 to-transparent
                      border border-brand/20 p-6 sm:p-8">
    <p className="text-xs font-bold tracking-widest text-brand uppercase">Welcome back</p>
    <h1 className="mt-2 font-display text-3xl sm:text-4xl font-bold text-fg">
      Hi, {user.firstName} 👋
    </h1>
    <p className="mt-2 text-fg-muted">Here's what's happening with your stays.</p>
  </section>

  {/* KPI STRIP — 4 tiles (Recipe A) */}
  <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
    <KpiTile label="Active stays"     value={String(activeStaysCount)} hint="Currently renting" />
    <KpiTile label="Pending"          value={String(pendingApps)}       hint="Applications" />
    <KpiTile label="Saved"            value={String(wishlist.length)}   hint="Listings" />
    <KpiTile label="Unread messages"  value={String(unread)}            hint="From hosts" />
  </section>

  {/* 2-COLUMN BODY */}
  <section className="grid lg:grid-cols-[1fr_360px] gap-6">

    {/* LEFT: Up next (biggest event) */}
    <div className="rounded-2xl bg-bg-card border border-border p-5 shadow-card">
      <p className="text-xs font-bold uppercase tracking-wide text-fg-muted">Up next</p>
      {nextStay ? (
        <>
          <h2 className="mt-1 text-xl font-bold text-fg">{nextStay.title}</h2>
          <p className="text-sm text-fg-muted">Check-in {nextStay.checkInDate} · in {nextStay.daysLeft} days</p>
          {/* mini countdown + action chip */}
        </>
      ) : (
        <EmptyState ... />
      )}
    </div>

    {/* RIGHT: Activity feed */}
    <div className="rounded-2xl bg-bg-card border border-border p-5 shadow-card">
      <p className="text-xs font-bold uppercase tracking-wide text-fg-muted mb-3">Recent activity</p>
      <ul className="space-y-3">
        {activity.map(a => (
          <li className="flex items-start gap-3 text-sm">
            <a.icon className="w-4 h-4 text-fg-muted shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-fg">{a.text}</p>
              <p className="text-xs text-fg-subtle">{a.timeAgo}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>

  </section>

  {/* RECENTLY VIEWED — horizontal scroller */}
  {recentlyViewed.length > 0 && (
    <section>
      <h3 className="text-sm font-bold text-fg mb-3">Recently viewed</h3>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
        {recentlyViewed.map(l => <MiniListingCard listing={l} />)}
      </div>
    </section>
  )}
</div>
```

**Data:**
- `activeStaysCount` = `bookings.filter(b => b.status === "Confirmed" || b.status === "Active").length`
- `pendingApps` = `applications.filter(a => a.status === "Pending").length`
- `wishlist.length` from `useWishlist()`
- `unread` from messages API (P1-3) — пока 0 plausible
- `activity` — последние events из bookings/applications (timeline collected client-side для MVP)

**Acceptance:** Sarah login → лендит на `/me/guest` → видит «Hi, Sarah 👋» + KPI + Up next + Activity.

---

### P1-2. Landlord Home page (Command Center)

**Refs:** `UX-224`, `UX-227`, `UX-233`.

**Файл:** `src/features/me/host/home-page.tsx` (new). Route: `/me/host`.

**Layout как P1-1 но с акцентом на action / earnings:**

```tsx
<div className="space-y-6">
  <HeroSection greeting="Welcome back, Marina 🏡"
               sub={`Your portfolio earned ฿${formatThb(thisMonthEarned)} this month.`} />

  {/* KPI strip */}
  <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
    <KpiTile label="This month"     value={formatThb(thisMonthEarned)}
             delta={{ value: deltaPct, positive: delta > 0 }} hint="vs last month" />
    <KpiTile label="Projected 30d"  value={formatThb(projected30d)} hint="Active bookings" />
    <KpiTile label="Active tenants" value={String(activeTenants)}   hint="Across properties" />
    <KpiTile label="Needs attention" value={String(needsAction)}    hint="Tap to review" />
  </section>

  {/* NEEDS YOUR ATTENTION — most important */}
  {needsAction > 0 && (
    <section className="rounded-2xl bg-warning-bg border border-warning/30 p-5">
      <div className="flex items-start gap-3 mb-3">
        <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
        <div>
          <h2 className="font-bold text-fg">{needsAction} thing{needsAction > 1 ? "s" : ""} need your attention</h2>
        </div>
      </div>
      <ul className="space-y-2">
        {todos.map(t => (
          <li className="flex items-center gap-3 rounded-xl bg-bg-card border border-border p-3
                         hover:border-warning/40 hover:shadow-card transition-all">
            <t.icon className="w-4 h-4 text-fg-muted shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-fg">{t.title}</p>
              <p className="text-xs text-fg-muted">{t.subtitle}</p>
            </div>
            <Link to={t.cta.to} className="text-sm font-semibold text-brand whitespace-nowrap">
              {t.cta.label} →
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )}

  {/* 2-COLUMN: Properties mini-grid + Activity */}
  <section className="grid lg:grid-cols-[1fr_360px] gap-6">
    <div>
      <h3 className="text-sm font-bold text-fg mb-3">Your properties</h3>
      <div className="grid sm:grid-cols-2 gap-3">
        {properties.slice(0, 4).map(p => <PropertyMiniCard property={p} />)}
      </div>
      {properties.length > 4 && (
        <Link to="/me/host/properties" className="mt-3 inline-block text-sm font-medium text-brand">
          See all {properties.length} →
        </Link>
      )}
    </div>

    <div>
      <h3 className="text-sm font-bold text-fg mb-3">Earnings</h3>
      <div className="rounded-2xl bg-bg-card border border-border p-5 shadow-card">
        <LineChart data={earningsLast12Months} className="h-32 w-full" />
        <p className="mt-3 text-xs text-fg-muted">Last 12 months · projection dashed</p>
      </div>

      <h3 className="text-sm font-bold text-fg mt-6 mb-3">Recent activity</h3>
      <ActivityFeed events={hostActivity} />
    </div>
  </section>
</div>
```

**Сборка `todos`:**
```ts
const todos = [
  ...pendingRequests.map(r => ({
    icon: Inbox,
    title: `${r.guestName} applied for ${r.listingTitle}`,
    subtitle: `${daysAgo(r.createdAt)} · expires in ${daysUntil(r.expiresAt)}d`,
    cta: { to: `/me/host/requests/${r.id}`, label: "Review" }
  })),
  ...pendingTm30.map(t => ({
    icon: Shield,
    title: `File TM-30 for ${t.guestName}`,
    subtitle: `${t.daysUntilDeadline}d until fine starts`,
    cta: { to: `/me/host/bookings/${t.bookingId}#guests`, label: "File" }
  })),
  ...unsignedContracts.map(...)
];
```

**Acceptance:** Marina login → `/me/host` → видит earnings glance + N todos + properties mini-grid + activity.

---

### P1-3. Inbox / Messages (MVP text-only)

**Refs:** `UX-222`, `UX-232`.

⚠️ **Зависит от backend** — нужны endpoints `GET /api/me/messages/threads`, `POST /api/me/messages/threads/{bookingId}/messages`. Если ещё нет — это **P2** до их готовности.

**Файлы:**
- `src/features/me/messages/messages-page.tsx` (split layout: thread-list / message-area)
- `src/features/me/messages/components/thread-list.tsx`
- `src/features/me/messages/components/message-thread.tsx`

**Layout — копируй любой Slack/Gmail layout:**

```tsx
<div className="grid lg:grid-cols-[320px_1fr] gap-0 h-[calc(100vh-64px)]">
  <aside className="border-r border-border overflow-y-auto">
    {threads.map(t => (
      <ThreadRow key={t.id} thread={t} active={t.id === activeId} />
    ))}
  </aside>
  <main className="flex flex-col">
    {active ? <MessageThread thread={active} /> : <EmptyThreadHint />}
  </main>
</div>
```

**Mobile:** один экран — thread-list, click → push messages view (используй standard React Router).

**Из booking-detail / application-detail** — кнопка `Message host` ведёт на `/me/guest/messages?thread=${bookingId}`.

**Header:** bell-icon с unread counter.

**Acceptance:** Sarah pushes Message → Marina видит в header → отвечает.

---

### P1-4. My properties card — chips состояния

**Refs:** `UX-225`, `UX-158`.

**Файл:** `src/features/me/host/properties/list-page.tsx`.

Найди текущую `PropertyCard` (или его inline JSX). Добавь chip-row после tenant-name:

```tsx
<div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2">
  <span className="font-mono tabular-nums text-sm text-fg">
    {formatThb(property.monthlyRate)}<span className="text-fg-muted">/mo</span>
  </span>
  {property.currentBookingStatus && (
    <>
      <span className="text-fg-subtle">·</span>
      <span className="inline-flex items-center gap-1 text-xs text-success">
        <Check className="w-3 h-3" />
        Booked until {formatDate(property.currentTenantCheckOutDate)}
      </span>
    </>
  )}
  {property.pendingRequestsCount > 0 && (
    <>
      <span className="text-fg-subtle">·</span>
      <Link to={`/me/host/requests?propertyId=${property.id}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-warning">
        <Inbox className="w-3 h-3" />
        {property.pendingRequestsCount} request{property.pendingRequestsCount > 1 ? "s" : ""}
      </Link>
    </>
  )}
  {property.tm30Pending && (
    <>
      <span className="text-fg-subtle">·</span>
      <span className="inline-flex items-center gap-1 text-xs text-warning">
        ⚠ TM-30 due
      </span>
    </>
  )}
</div>
```

Сама card — wrap в `Recipe E` style row если photo + chips. И **уменьшить пустоту справа** — переключить на `grid sm:grid-cols-2 lg:grid-cols-3 gap-4` если 4+ properties, или поставить `max-w-md` если 1 property + добавить sidebar.

**Acceptance:** Marina видит за 2 сек по карточке всю важную правду.

---

### P1-5. Tenant Applications list — фото + host name + timeline

**Refs:** `UX-145`, `UX-146`.

**Файл:** `src/features/me/guest/applications/list-page.tsx`.

Замени pseudo-table row (icon-clock + title + dates) на **Recipe E**:

```tsx
<Link to={`/me/guest/applications/${app.id}`}
      className="group flex items-center gap-4 rounded-2xl bg-bg-card border border-border p-4
                 hover:shadow-hover hover:border-border-strong transition-all">

  <img src={app.listingImageUrl}
       alt={app.listingTitle}
       className="w-20 h-20 rounded-xl object-cover shrink-0" />

  <div className="flex-1 min-w-0">
    <p className="font-semibold text-fg truncate">{app.listingTitle}</p>
    <p className="text-sm text-fg-muted">Hosted by {app.hostName}</p>
    <p className="text-xs text-fg-subtle mt-0.5">
      Move-in {formatDate(app.moveInDate)} · {app.durationMonths} months · {formatThb(app.monthlyRate)}/mo
    </p>
  </div>

  <div className="shrink-0 flex flex-col items-end gap-1">
    <StatusPill status={app.status} />
    {app.status === "Pending" && (
      <span className="text-xs text-fg-muted">Expires in {hoursLeft(app.expiresAt)}h</span>
    )}
  </div>

  <ChevronRight className="w-4 h-4 text-fg-subtle group-hover:text-fg-muted shrink-0" />
</Link>
```

**StatusPill compoненent** (use Recipe D):
- `Pending` → `bg-warning-bg text-warning border-warning/30` + `⏱ Awaiting`
- `Approved` → `bg-success-bg text-success border-success/30` + `✓ Approved`
- `Rejected` → `bg-danger-bg text-danger border-danger/30` + `✗ Declined`
- `Expired` → `bg-bg-subtle text-fg-muted border-border` + `⏰ Expired`

**Acceptance:** card имеет фото + host name + price + status. Parity с marketplace card.

---

### P1-6. Pending application detail — actions + честная копия

**Refs:** `UX-147`, `UX-148`.

**Файл:** `src/features/me/guest/applications/detail-page.tsx`.

Поменять копию banner'а (для status === "Pending"):

```tsx
<div className="rounded-2xl bg-warning-bg border border-warning/30 p-5">
  <div className="flex items-start gap-3">
    <Clock className="w-5 h-5 text-warning shrink-0 mt-0.5" />
    <div className="flex-1">
      <p className="font-bold text-fg">Awaiting response</p>
      <p className="text-sm text-fg-muted mt-1">
        {hostName} has up to <strong>{totalExpiryDays} days</strong> to respond. If they don't, your
        application expires automatically and you can apply elsewhere.
      </p>
      <p className="mt-3 text-xs text-fg-muted">
        Expires <CountdownPill deadline={app.expiresAt} />
      </p>
    </div>
  </div>
</div>
```

В Reservation details card — изменить deposit row:

```tsx
<div className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
  <div>
    <p className="text-sm text-fg">Refundable deposit</p>
    <p className="text-xs text-fg-muted">Payable on approval, then held by Siamo</p>
  </div>
  <p className="font-mono tabular-nums text-fg">{formatThb(app.depositAmount)}</p>
</div>
```

И добавить action-row внизу:

```tsx
<div className="mt-6 flex flex-wrap gap-2">
  <Button variant="outline" onClick={openMessageHost}>
    <MessageCircle className="w-4 h-4 mr-1.5" />
    Message host
  </Button>
  <Button variant="outline" onClick={openEditDates}>
    <Calendar className="w-4 h-4 mr-1.5" />
    Edit dates
  </Button>
  <Button variant="outline" onClick={confirmWithdraw}
          className="border-danger/30 text-danger hover:bg-danger-bg ml-auto">
    Withdraw application
  </Button>
</div>
```

**Acceptance:** копия не противоречит сама себе, deposit честный, actions присутствуют.

---

### P1-7. Profile status pills clickable

**Refs:** `UX-155`, `UX-168`, `UX-219`.

**Файл:** `src/pages/profile.tsx`.

В sidebar profile card — три pills (`Email ✓`, `Phone ✗`, `Passport ✓`). Сделать каждую `<button>`:

```tsx
<div className="flex flex-wrap gap-2">
  <PillButton
    label="Email"
    state={profile.email ? "ok" : "missing"}
    onClick={() => setSection("security")} />
  <PillButton
    label="Phone"
    state={profile.phone ? "ok" : "missing"}
    onClick={() => { setSection("contact"); scrollToFieldOnNextRender("phone"); }} />
  <PillButton
    label="Passport"
    state={profile.passportNumber ? "ok" : "missing"}
    onClick={() => setSection("personal")} />
</div>
```

```tsx
function PillButton({ label, state, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-medium border transition-colors hover:shadow-sm",
        state === "ok"
          ? "bg-success-bg text-success border-success/30 hover:border-success/50"
          : "bg-danger-bg text-danger border-danger/30 hover:border-danger/50"
      )}>
      {state === "ok" ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      {label}
    </button>
  );
}
```

**Acceptance:** click `Phone ✗` → переход в Contact + focus на phone field.

---

### P1-8. Avatar upload

**Refs:** `UX-220`.

**⚠️ Зависит от backend**: `POST /api/me/avatar` (multipart). Если нет — занести в `BACKEND_ISSUES.md`.

**Файл:** `src/components/ui/avatar-uploader.tsx` (new).

```tsx
export function AvatarUploader({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const { data: user } = useCurrentUser();
  const upload = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append("photo", file);
      return apiClient.post("/api/me/avatar", fd);
    },
    onSuccess: () => queryClient.invalidateQueries(["me"]),
  });

  return (
    <label className={cn("relative cursor-pointer group block",
                          size === "lg" ? "w-20 h-20" : size === "md" ? "w-14 h-14" : "w-9 h-9")}>
      {user.avatarUrl ? (
        <img src={user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
      ) : (
        <div className="w-full h-full rounded-full bg-brand text-brand-fg flex items-center justify-center font-bold">
          {initials(user.firstName + " " + user.lastName)}
        </div>
      )}
      <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100
                       flex items-center justify-center transition-opacity">
        <Camera className="w-4 h-4 text-white" />
      </div>
      <input type="file" accept="image/*" className="hidden"
             onChange={(e) => e.target.files?.[0] && upload.mutate(e.target.files[0])} />
    </label>
  );
}
```

Использовать вместо текущих placeholder-monogram в:
- `src/components/layout/topbar.tsx` (header avatar)
- `src/pages/profile.tsx` (Profile card)
- `src/features/me/host/bookings/detail-page.tsx` (guest avatar)

**Acceptance:** click avatar → upload PNG/JPG → виден везде.

---

### P1-9. Documents vault — auto-pull signed contracts

**Refs:** `BUG-166`, `UX-221`.

**Файл:** `src/features/me/profile/documents.tsx` (если разделён) или Documents section в `pages/profile.tsx`.

```tsx
const { data: docs } = useQuery({
  queryKey: ["me", "documents"],
  queryFn: () => apiClient.get<DocumentDto[]>("/api/me/documents").then(r => r.data),
});

return (
  <div className="space-y-3">
    {docs?.length === 0 && <EmptyState ... />}
    {docs?.map(d => (
      <div key={d.id} className="flex items-center gap-3 rounded-xl bg-bg-card border border-border p-3">
        <DocIcon type={d.type} />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-fg truncate">{d.title}</p>
          <p className="text-xs text-fg-muted">
            {formatDate(d.uploadedAt)} · {d.bookingTitle ?? d.type}
          </p>
        </div>
        <a href={d.downloadUrl} download
           className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">
          <Download className="w-4 h-4" /> Download
        </a>
      </div>
    ))}
  </div>
);

function DocIcon({ type }) {
  const map = {
    Contract:  { icon: FileText, color: "text-info bg-info-bg" },
    TM30:      { icon: Shield,   color: "text-success bg-success-bg" },
    Passport:  { icon: Globe,    color: "text-warning bg-warning-bg" },
  };
  const it = map[type] ?? { icon: File, color: "text-fg-muted bg-bg-subtle" };
  return <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", it.color)}><it.icon className="w-5 h-5" /></div>;
}
```

**Backend:** `GET /api/me/documents` → `[{ id, type: "Contract" | "TM30" | "Passport", title, downloadUrl, uploadedAt, bookingId? }]`.

**Acceptance:** signed contract автоматически в Documents после `FullySigned`.

---

### P1-10. Finance KPI рестракт

**Refs:** `UX-228`, `UX-138`, `UX-139`, `UX-229`.

**Файл:** `src/features/me/host/finance/page.tsx`.

**Заменить 4 одинаковых cards на:**

```tsx
<section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
  <KpiTile
    label="This month"
    value={formatThb(thisMonth.amount)}
    delta={thisMonth.delta && {
      value: `${thisMonth.delta > 0 ? "+" : ""}${thisMonth.delta.toFixed(1)}%`,
      positive: thisMonth.delta > 0,
    }}
    hint={hasHistory ? "vs last month" : "First month — no comparison yet"}
    sparkline={thisMonth.sparkline}
  />
  <KpiTile
    label="Projected (next 30 days)"
    value={formatThb(projected30d)}
    hint={`From ${activeBookings.length} active booking${activeBookings.length > 1 ? "s" : ""}`}
  />
  <KpiTile
    label="Lifetime"
    value={formatThb(lifetime)}
    hint={`Since ${formatMonth(joinedDate)}`}
  />
  <KpiTile
    label="Net of fees"
    value={formatThb(lifetime * (1 - siamoFeePct))}
    hint={siamoFeePct === 0 ? "Siamo charges 0% during launch" : `${(siamoFeePct * 100).toFixed(0)}% Siamo fee`}
  />
</section>
```

**Revenue chart** — заменить bar (Deposit/Rent) на 12-month line:

```tsx
<section className="rounded-2xl bg-bg-card border border-border p-5 shadow-card">
  <div className="flex items-baseline justify-between mb-4">
    <h2 className="font-bold text-fg">Earnings · last 12 months</h2>
    <p className="text-xs text-fg-muted">Projection dashed</p>
  </div>
  <ResponsiveContainer width="100%" height={220}>
    <LineChart data={monthly}>
      <XAxis dataKey="label" axisLine={false} tickLine={false} className="text-xs" />
      <YAxis hide />
      <Tooltip />
      <Line type="monotone" dataKey="earned"    stroke="rgb(var(--color-primary))" strokeWidth={2} dot={{ r: 3 }} />
      <Line type="monotone" dataKey="projected" stroke="rgb(var(--color-primary))" strokeWidth={2} strokeDasharray="4 4" dot={false} />
    </LineChart>
  </ResponsiveContainer>
</section>
```

(Использует уже установленный `recharts`.)

**Expense breakdown** — добавь CTA:

```tsx
{expenses.length === 0 ? (
  <EmptyState
    headline="No expenses logged yet"
    copy="Track utilities, repairs and taxes to get accurate net profit."
    primaryCta={<Button onClick={openAddExpense}><Plus className="w-4 h-4 mr-1" />Add expense</Button>}
  />
) : (
  <ExpenseTable expenses={expenses} />
)}
```

**Acceptance:** 4 cards дифференцированы по смыслу. Chart показывает trend. Expenses не dead-end.

---

### P1-11. Host request/reservation card chips

**Refs:** `UX-163`, `UX-164`, `UX-162`.

**Файлы:**
- `src/features/me/host/requests/list-page.tsx` (или inline в `requests/page.tsx`)
- `src/features/me/host/bookings/list-page.tsx`

Применить **Recipe G** (inline metric chip) под названием каждой row:

Для **request card**:
```tsx
<div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
  <span className="font-mono tabular-nums text-sm text-fg">{formatThb(req.monthlyRate)}/mo</span>
  <span className="text-fg-subtle">·</span>
  <span className="text-xs text-fg-muted">{req.durationMonths} months</span>
  <span className="text-fg-subtle">·</span>
  <span className="text-xs text-fg-muted">{formatThb(req.totalRent + req.depositAmount)} total</span>
  {req.petCatsCount + req.petDogsCount + req.petOtherCount > 0 && (
    <>
      <span className="text-fg-subtle">·</span>
      <span className="inline-flex items-center gap-1 text-xs text-warning">
        🐈 {req.petCatsCount} {req.petDogsCount > 0 && `🐕 ${req.petDogsCount}`}
      </span>
    </>
  )}
  {req.expiresAt && (
    <>
      <span className="text-fg-subtle">·</span>
      <span className="inline-flex items-center gap-1 text-xs text-warning">
        <Clock className="w-3 h-3" /> Expires in <CountdownPill deadline={req.expiresAt} />
      </span>
    </>
  )}
</div>
```

Для **reservation card**:
```tsx
<div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
  {b.contractStatus === "FullySigned" && (
    <span className="inline-flex items-center gap-1 text-xs text-success">
      <Check className="w-3 h-3" /> Signed
    </span>
  )}
  <span className="text-fg-subtle">·</span>
  <span className="text-xs text-fg-muted">
    {b.paymentsCollected}/{b.paymentsTotal} paid
  </span>
  {b.tm30Pending > 0 && (
    <>
      <span className="text-fg-subtle">·</span>
      <span className="inline-flex items-center gap-1 text-xs text-warning">⚠ TM-30 pending</span>
    </>
  )}
</div>
```

**Acceptance:** при 5+ requests Marina различает за 2 секунды.

---

### P1-12. «Today» / Needs attention strip

Покрыто P1-2 (Landlord Home → `Needs your attention` block).

---

## 5. P2 — Polish

### P2-1. Login UX polish (refs UX-198/200/203/204)

В `src/pages/login.tsx`:
1. `placeholder="you@example.com"`.
2. Eye-toggle на password — копируй из `register.tsx` (там уже есть).
3. `Remember me` checkbox:
   ```tsx
   <label className="flex items-center gap-2 text-sm text-fg-muted">
     <Checkbox checked={remember} onCheckedChange={setRemember} />
     Keep me signed in for 30 days
   </label>
   ```
4. SSO buttons сверху form — **ОТЛОЖИТЬ** до backend OAuth готовности.

### P2-2. Onboarding shell (refs UX-205/206)

В `/me/onboarding/passport`-route создать wrapper:

```tsx
<OnboardingShell step={1} totalSteps={3} title="One last thing"
                 subtitle="We need these to generate your contract and file TM-30.">
  <PersonalPassportForm />
  <Button onClick={skip} variant="ghost">I'll do this later</Button>
</OnboardingShell>
```

### P2-3. Mode-toggle hide (refs UX-150/169/209/234)

В `src/components/layout/topbar.tsx`:

```tsx
const isProfilePage = location.pathname.startsWith("/me/profile");
const isOnboarding = location.pathname.startsWith("/me/onboarding");
const showModeTabs = !isProfilePage && !isOnboarding;
```

Также — counter: показывать badge число только если > 0.

### P2-4. Booking modal polish (refs UX-181..185)

В `src/features/marketplace/components/booking-request-modal.tsx`:
1. **Auto-select «No pets»** если `listing.petsAllowed === false`:
   ```tsx
   useEffect(() => {
     if (!listing.petsAllowed) setPetChoice("none");
   }, [listing.petsAllowed]);
   ```
2. **Disable «I have pets» visually** если listing не allows:
   ```tsx
   <button disabled={!listing.petsAllowed} className={cn(..., !listing.petsAllowed && "opacity-50 cursor-not-allowed")}>I have pets</button>
   ```
3. **Stepper сверху** modal:
   ```tsx
   <div className="flex items-center gap-1.5 mb-4">
     {[1,2,3].map(n => (
       <div className={cn("h-1 flex-1 rounded-full",
         n <= currentStep ? "bg-brand" : "bg-bg-subtle")} />
     ))}
   </div>
   <p className="text-xs text-fg-muted">Step {currentStep} of 3</p>
   ```
4. Success copy: использовать единый timeline ("Host has 3 days to respond").
5. Deposit copy — «No security deposit required» если 0, иначе явная сумма.

### P2-5. Listing detail host card + similar (refs UX-214/215/213)

В `src/features/marketplace/listing-detail-page.tsx` после Cancellation policy section добавить:

**HostCard:**
```tsx
<Section title="Meet your host">
  <div className="flex items-start gap-4 rounded-2xl bg-bg-subtle p-5">
    <Avatar src={host.avatarUrl} fallback={initials(host.fullName)} size="lg" />
    <div className="flex-1">
      <p className="font-bold text-fg">{host.fullName}</p>
      <p className="text-sm text-fg-muted">Member since {formatMonth(host.joinedAt)}</p>
      <div className="mt-2 flex gap-4 text-xs text-fg-muted">
        <span>★ {host.ratingAverage} · {host.reviewCount} reviews</span>
        <span>Responds within {host.responseHours}h</span>
        <span>{host.listingCount} listing{host.listingCount > 1 ? "s" : ""}</span>
      </div>
    </div>
    <Button variant="outline">Message host</Button>
  </div>
</Section>
```

**SimilarListings** в самом низу:
```tsx
<Section title="Similar places nearby">
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
    {similar.map(l => <MarketplaceCard listing={l} />)}
  </div>
</Section>
```

**«Three reasons» секция** — либо реально 3 cards (Verified + Bilingual contract + Escrow deposit), либо переименовать в «What makes this place special».

### P2-6. Cancellation copy + math (refs BUG-127/128)

Зависит от backend (BE-34 — поле `unusedRentRefund` в DTO).

В early-exit modal — добавить breakdown:
```tsx
<dl className="space-y-1.5 text-sm">
  <Row label="1-month penalty" value={`-${formatThb(c.penaltyAmount)}`} negative />
  <Row label="Unused rent refund" value={`+${formatThb(c.unusedRentRefund)}`} />
  <Row label="Deposit refund" value={`+${formatThb(c.depositRefundAmount)}`} />
  <hr className="my-2 border-border" />
  <Row label="Net refund" value={formatThb(c.netRefund)} bold large />
</dl>
```

В marketplace listing-detail cancellation section — явно дисклоузить pre-checkin penalty:
```tsx
<p className="text-xs text-fg-muted mt-2">
  Note: Cancelling before move-in still costs 1 month rent. Free cancellation only after signing
  contract and within the grace window.
</p>
```

### P2-7. Co-resident approval flow (ref BUG-135)

Зависит от backend `BookingGuestRequest`. Когда готов:
1. Co-resident form в `Active`/`Confirmed` booking — submit создаёт `Pending` (не immediate add).
2. Host видит в его todo: «Sarah wants to add Alex Tester → Approve / Reject».
3. Tenant UI: «Awaiting host approval» badge.

### P2-8. Marketplace catalog quality (refs BUG-177, UX-49, UX-212)

1. Card cover-image — wrap в `<img onError={() => setBroken(true)} />`, если broken — `<div className="bg-bg-subtle">{placeholder}</div>`.
2. Card star rating — `{listing.reviewCount > 0 ? `★ ${listing.ratingAverage}` : `★ New`}`.

(Quality content filtering — backend.)

### P2-9. Mobile polish (refs UX-175/176/178/179)

1. Marketplace bottom-nav для авторизованных — добавить условный render в `listings-page.tsx`:
   ```tsx
   {user && <MobileBottomNav />}
   ```
   Component: `src/components/layout/mobile-bottom-nav.tsx` (если есть — reuse, иначе скопировать из `/me/*` layout).

2. Booking detail tabs на mobile — wrap или `Tabs` shadcn с scroll-shadow:
   ```tsx
   <ScrollArea className="w-full whitespace-nowrap">
     <TabsList>...</TabsList>
   </ScrollArea>
   ```

3. Hide top `≡` menu на mobile если есть bottom-nav (`lg:flex hidden`).

### P2-10. TM-30 timing copy (ref UX-216)

В TM-30 banner на host booking-detail:

```tsx
const checkInPassed = new Date(booking.checkInDate) <= new Date();
const inFilingWindow = checkInPassed && hoursSinceCheckin < 24;
const overdueDays = checkInPassed ? Math.max(0, Math.floor(hoursSinceCheckin / 24) - 1) : 0;

if (!checkInPassed) {
  // Grey neutral banner
  return <Banner tone="info">
    TM-30 will be required within 24 hours of check-in ({formatDate(booking.checkInDate)}).
    [Download template]
  </Banner>;
}
if (inFilingWindow) {
  return <Banner tone="warning">TM-30 filing window open · {24 - hoursSinceCheckin}h left</Banner>;
}
return <Banner tone="danger">TM-30 overdue · {overdueDays}d · fine up to ฿2,000</Banner>;
```

---

## 6. Backend dependencies

Если этих endpoints/полей ещё нет — добавь TODO в `BACKEND_ISSUES.md` под отдельный sprint.

| Frontend task | Backend endpoint/field |
|---|---|
| P0-1 forgot/reset | `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` |
| P0-2 change-password | `POST /api/auth/change-password` (✅ BE-32 готов) |
| P1-3 Messages | `GET /api/me/messages/threads`, `POST /api/me/messages/threads/{bookingId}/messages` |
| P1-8 Avatar | `POST /api/me/avatar` |
| P1-9 Documents | `GET /api/me/documents` (union: contracts + TM30 + identity) |
| P0-4 Wishlist sync | `GET/POST /api/me/favorites` (P1 — sync from localStorage) |
| P1-2 Host home counters | `GET /api/me/host/dashboard` (aggregate metrics) — alt: client aggregates |
| P1-4 Property card chips | `pendingRequestsCount`, `tm30Pending`, `currentBookingStatus`, `currentTenantCheckOutDate` (✅ BE-34) |
| P2-6 Cancellation math | `unusedRentRefund`, `totalRefund` поля в `BookingCancellationDto` |
| P2-7 Co-resident approval | `BookingGuestRequest` table + endpoints |

Также **security** (отдельный backend ТЗ):
- BE-Sec-1 timing attack login
- BE-Sec-2 rate-limit login
- BE-Sec-3 security headers
- BE-Sec-4 short-lived JWT + refresh-token rotation
- BE-Reg-1 booking-requests POST 500
- BE-Reg-2 booking detail GET 500

---

## 7. Definition of Done (для каждой задачи)

Перед merge каждого task:

1. ✅ **Используется референс** из секции 0 (не самопальный layout).
2. ✅ **Только design tokens** (нет hardcoded цветов / spacing).
3. ✅ **Responsive**: верстка читаема на 414px (real iPhone) — проверено `resize_window`.
4. ✅ **Dark theme** не ломается (text contrast ≥ AA).
5. ✅ **Empty state** есть для каждого list-экрана.
6. ✅ **Loading state** — `Skeleton` из shadcn (`src/components/ui/skeleton.tsx`).
7. ✅ **Error state** — toast + retry-button где async.
8. ✅ **Все disabled buttons** проходят P0-5 (визуально muted + tooltip).
9. ✅ **Все клики/CTA** реально работают (нет decorative buttons).
10. ✅ **Console clean** — `read_console_messages` после flow не показывает unexpected errors.
11. ✅ **TypeScript** — `npm run build` passes без новых any/casts.
12. ✅ **Manual QA** — пройти flow от лица user (cold-read как «впервые вижу»).

---

## Приоритеты sprint planning

**Sprint 1 (1-2 недели):** P0-1, P0-2, P0-5, P1-1 (Tenant Home), P1-2 (Landlord Home) — это самое заметное.

**Sprint 2 (1-2 недели):** P0-3, P0-4, P1-4, P1-5, P1-6, P1-7, P1-10 (Finance).

**Sprint 3 (зависит от backend):** P1-3 (Messages), P1-8 (Avatar), P1-9 (Documents).

**Sprint 4:** P2 polish.

---

## Что Claude Code НЕ должен делать

- ❌ **Не выдумывать** новые layout-патterns. Только копировать из секции 0.
- ❌ **Не использовать** hardcoded цвета (`#abc`, `rgb(...)`). Только `bg-brand`, `text-fg`, etc.
- ❌ **Не создавать** новые шрифты или загружать webfonts.
- ❌ **Не использовать** library которых нет в `package.json` (если нужна — сначала обсудить).
- ❌ **Не оставлять** TODO в production code — все unfinished моменты — backlog.
- ❌ **Не делать** decorative buttons. Каждый click = function.

---

**Конец ТЗ.** Подробные кейсы воспроизведения — в `TENANT_FLOW_QA.md`, `LANDLORD_FLOW_QA.md`. Security — `BACKEND_ISSUES.md` секция Security sweep.
