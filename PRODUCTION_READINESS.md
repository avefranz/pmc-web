# Production Readiness — pre-launch QA план

**Дата:** 2026-05-24
**Цель:** выпустить Siamo в production без блокеров для real money + real foreign tenants.

> **Принцип:** **«Платформа держит реальные деньги, паспорта и контракты иностранцев в Таиланде»**. Любой блокер вокруг security / payments / contracts / personal data — приоритет 0. Beauty/UX-долг отгружаем итерациями уже на проде.

## Что уже за плечами

- 8 раундов functional QA → ~200 findings задокументированы в `TENANT_FLOW_QA.md`, `LANDLORD_FLOW_QA.md`, `BACKEND_ISSUES.md`.
- Security sweep (IDOR, JWT, authorization, timing, rate-limit).
- Mobile viewport (~517px Chrome floor).
- Cabinet beauty sweep (tenant + landlord).
- Cross-flow positive patterns зафиксированы (Property wizard, Reject modal, Gateway overlay, TM-30 banner).
- Frontend ТЗ написан + Recipe H/I/J/K + fonts wired.

## Где находимся

| Что | Готово к prod | Доделать |
|---|---|---|
| Marketplace catalog + detail | ⚠ Quality gate test data | ✅ filter fixes + share/OG |
| Tenant booking flow | ⚠ Modal-step polish | ✅ payment modal logic ok |
| Host approve / reject | ⚠ No confirm dialog | ✅ approve flow works |
| Contract signing | ⚠ Sparse signed state | ✅ tenant+host sign works |
| Payment gateway (sandbox) | ✅ Solid pattern | ⏳ production 2C2P switch |
| TM-30 filing | ✅ Good UI | ⏳ test real филинг |
| Property delete | ✅ Protection works | — |
| Auth / login / register | ❌ no Forgot password | ❌ no rate-limit / 2FA |
| Profile / settings | ⚠ Skinny secciones | ⏳ change password UI |
| Mobile | ⚠ minor | ⏳ marketplace bottom-nav |

---

## 🚨 P0 — Production blockers (НЕ launch до фикса)

### Безопасность
1. **Rate-limit на /api/auth/login** — сейчас 20 wrong attempts → 20× 401 без throttle. `BE-Sec-2`. **Brute-force unrestricted = ✗ launch.**
2. **Timing-attack на login** — existing email 300ms vs non-existing 140ms → email enumeration. `BE-Sec-1`. Fix: constant-time bcrypt-fallback dummy hash.
3. **Forgot password UI + flow** — backend готов (`BE-32`), фронт `/forgot-password` redirect на `/`. `P0-1` в FRONTEND_SPEC. **Без recovery — locked-out users.**
4. **Change password UI** — `BUG-165`, `P0-2`. Без UI нельзя сменить пароль на финансовой платформе.
5. **Security headers** — `BE-Sec-3` (X-Frame-Options, CSP, HSTS, Referrer-Policy, X-Content-Type-Options). Включить middleware.
6. **JWT короткоживущий + refresh-rotation** — `BE-Sec-4`. Сейчас 7-day token = украденный ноут уязвим неделю. Минимум: access 30 min + refresh-token rotation + `/api/auth/sessions` для revoke.

### Целостность данных / бизнес-логика
7. **POST /api/marketplace/listings/{id}/booking-requests → 500** — `BE-Reg-1`. **Главный entry-point продукта сломан**, не воспроизводится для свежего user/clean payload. Регрессия после BE-33.
8. **GET /api/bookings/{id} → 500 для confirmed booking** — `BE-Reg-2`. Booking detail сломан. UI: «Booking not found».
9. **После Confirmed cancellation booking-state не обновляется** — `BUG-134` / `BE-33`. Marina видит booking как Active, Sarah тоже. Refund не процессится. **Money trapped state.**
10. **Cancellation refund math** — `BUG-128` / `BE-34`. `netRefund` игнорирует pre-paid rent ฿175k. Если tenant отменяет — он не получит всё что должен.

### Search & filter (продукт-блокеры discovery)
11. **Search bar decorative** — `BUG-235`. Where / Duration / Search button — клик ничего не делает. URL без params. Главный discovery-pattern мёртв.
12. **Backend amenity filter ignored** — `BE-Filter-1`. Pool/WiFi/Parking чипы фронта не работают.

### Production deployment
13. **Sandbox → production 2C2P switch** — payment gateway сейчас в SANDBOX badge. Перевести на live + verify webhook handlers + reconciliation.
14. **Domain + HTTPS + DNS** — production hostname, SSL cert, environment vars (api endpoint, payment keys).
15. **Backup + restore** — PostgreSQL daily backup + tested restore. **Без backup нельзя production**.
16. **Sentry / error monitoring** — frontend + backend. Без observability — slепы.
17. **Email delivery** — TransactionalEmail (booking notifications, reset password, TM-30 reminder). Verify actually delivered.

---

## 🟠 P1 — Critical UX gaps (можно launch, но первый день будет болит)

### Cabinet feel
1. **Tenant Home (Dashboard)** — `P1-1`. Sarah лендит в empty list, не в overview.
2. **Landlord Home (Command Center)** — `P1-2`. Marina не имеет «Today» todo.
3. **Property card chips** — `P1-4`. Revenue / occupancy / next-payment / TM-30 status на glance.
4. **Application card** — `P1-5`. Фото + host name + timeline.
5. **Pending application actions** — `P1-6`. Withdraw / Edit dates / Message host.
6. **Finance KPI рестракт** — `P1-10`. Сейчас 4× ฿280,000 (Net profit label fixed но differentiation остаётся слабая).
7. **Documents vault auto-pull** — `P1-9`. Signed contract не появляется в Documents.

### Listing detail
8. **Host card** — `UX-214`. Нет «Hosted by Marina · joined · response rate · ratings».
9. **Similar properties** — `UX-215`. Dead-end внизу страницы.
10. **Share + OG meta tags** — `BUG-241`. Без share-button + OG marketplace не виралится.

### Booking flow
11. **Approve confirmation dialog** — `UX-239`. One-click commitment на ฿100k+ без modal с summary.
12. **Approve next-steps onboarding** — `UX-240`. Host approve → нет «what happens next».
13. **Cancellation copy + math UI** — `P2-6`. Pre-checkin penalty не дисклоузен на marketplace.

### Compliance
14. **Co-resident approval flow** — `BUG-135`. После FullySigned контракта тенант добавляет жильца без согласования host'а.
15. **TM-30 timing copy** — `UX-216`. Red urgency banner за 22 дня до check-in.
16. **House rules edit warning** — `BUG-140`. Marina меняет rules на occupied property без warning тенанту.

### Content quality (легко руками)
17. **Test data cleanup** — Test Studio Nimman / My amazing Villa 2 / Test property #1 / зелёный `droom.jpg` / cat photo — purge из catalog до launch.
18. **Real reviews** — `UX-212`. «★ 4.9» fake для всех new listings. Показывать «★ New» badge.

---

## 🟡 P2 — Nice-to-have (отложить после launch)

- Inbox / Messages (P1-3) — пока WhatsApp/Phone-only acceptable
- Avatar upload (P1-8)
- SSO LINE/Google
- Forgot password polish (Remember me, eye-toggle на login)
- Onboarding shell (UX-205/206)
- Mobile bottom-nav на marketplace
- Wishlist sync server-side (sufficient localStorage MVP)
- Reviews/ratings end-to-end (заглушка ОК)

---

## Test passes — что осталось прогнать

### A. End-to-end happy paths (manual QA — 1-2 дня)
- [ ] **Tenant E2E без сбоев**: register → fill passport → browse → apply → wait approval → sign → pay → check-in → message host → checkout → review.
- [ ] **Landlord E2E**: register → list property (wizard) → publish → receive application → approve → countersign → collect payment → file TM-30 → mid-stay rule edit → checkout → review.
- [ ] **Cancellation paths**: tenant early-exit grace / pre-checkin / after-grace; host termination NonPayment / Breach / MutualAgreement.
- [ ] **Race condition**: two tenants apply on same dates → approve one → verify auto-reject other (`BE-33` fix forward).
- [ ] **Co-residents**: add + remove + TM-30 row per resident.
- [ ] **Refund**: cancel confirmed booking → verify deposit + unused rent refunded → reach tenant's saved bank/PromptPay.

### B. Cross-browser / device matrix
- [ ] **Chrome desktop** (current dev env)
- [ ] **Safari macOS** + **iOS Safari 17+**
- [ ] **Firefox** desktop
- [ ] **Real iPhone 13/14** (390-393px viewport — не Chrome floor 517)
- [ ] **Real Android Chrome** (360px)
- [ ] **Tablet** iPad Safari (768px+)

Особое внимание: dark theme contrast, Thai font rendering (`Noto Sans Thai` fix), gallery modal touch-swipe.

### C. Performance baseline
- [ ] **Lighthouse** на ключевых страницах: `/`, `/listings`, `/listings/:id`, `/me/guest/bookings/:id`.
- [ ] **LCP < 2.5s**, **CLS < 0.1**, **TBT < 200ms**.
- [ ] **Bundle size**: проверить что не выросло >20% с предыдущего snapshot.
- [ ] **Image optimization**: cover-фото идут через CDN, WebP, max 1200px. Listings выдают `srcSet` для responsive images.

### D. Accessibility
- [ ] **Keyboard navigation** — Tab по login/register/booking modal, focus visible везде.
- [ ] **Screen reader** — VoiceOver iOS на listing detail + booking flow. Все CTA имеют `aria-label`.
- [ ] **Color contrast** — все text/bg pairs ≥ AA (4.5:1). Особенно `text-fg-muted` на `bg-bg-card`.
- [ ] **Forms** — все inputs имеют `<label>`. Error messages с `aria-describedby`.

### E. SEO
- [ ] **Sitemap.xml** на `/sitemap.xml` с listings + cities.
- [ ] **Robots.txt** запрещает `/me/`, `/admin/`.
- [ ] **OG meta tags** per listing (BUG-241).
- [ ] **`<title>`** dynamic per page.
- [ ] **Structured data**: `Schema.org/RentalApartment` / `Schema.org/RealEstateListing` на listing detail.
- [ ] **Canonical URLs**.

### F. Localization smoke
- [ ] EN → TH → RU on key flows (`UX-126` тhumb test). Где fallback — записать в backlog.

### G. Email / notifications
- [ ] **Welcome email** после register
- [ ] **Application submitted** → tenant + host
- [ ] **Application approved/rejected** → tenant
- [ ] **Contract ready to sign** → both
- [ ] **Payment received**
- [ ] **Reset password link**
- [ ] **TM-30 reminder** 48h before check-in для host
- [ ] **Check-in reminder** 24h before для tenant

### H. Backup + disaster recovery
- [ ] **Daily PostgreSQL backup** на off-site storage (S3-compatible).
- [ ] **Tested restore** на staging DB.
- [ ] **R2 bucket lifecycle policy** для uploaded photos (защита от accidental delete).
- [ ] **Runbook** — что делать при downtime / payment-gateway outage / mass auto-expire.

### I. Legal + compliance
- [ ] **Terms of Service** актуальные.
- [ ] **Privacy Policy** актуальная (passport scans, GDPR-aligned even for Thai users).
- [ ] **Cookie consent** banner (если EU-traffic возможен).
- [ ] **Rental contract template** проверен юристом для тайского права.
- [ ] **TM-30 disclaimer** — Siamo facilitates, host responsible.

---

## Production launch sequence (рекомендация)

### Этап 0 — Internal soft-launch (1 неделя)
- 5-10 friendly hosts получают invite.
- Закрытое тестирование на real money low-stakes (~฿5k bookings).
- Monitor: Sentry errors, payment success rate, support tickets.

### Этап 1 — Closed beta (2-4 недели)
- 50-100 hosts из target market (Chiang Mai expat community).
- Tenant signups через waitlist.
- Verify: 100 successful bookings without manual intervention.

### Этап 2 — Public launch
- SEO + marketing включаются.
- Categories STAYS only — VEHICLES/EQUIPMENT/SPACES оставляем `Coming soon`.
- A/B testing infrastructure ready.

---

## Definition of «ready for production»

✅ Все 17 P0 пунктов закрыты.
✅ E2E happy path прогнан 3+ раз без manual intervention.
✅ Lighthouse score ≥ 85 на ключевых страницах.
✅ Cross-browser/device matrix пройден.
✅ Email delivery actually working.
✅ Backup + restore tested.
✅ Sentry alerts настроены и срабатывают.
✅ Legal docs review passed.
✅ Sandbox 2C2P переключён на production-mode + smoke-test ฿100 transaction.
✅ Internal soft-launch успешен (≥ 5 real bookings без incidents).

---

## Метрики "первого дня" production

Если в первые 24h:
- **5+ Sentry errors / hour** на critical paths → **rollback**.
- **Payment success rate < 95%** → **rollback**.
- **Mean LCP > 4s** → investigate cdn / scaling.
- **TM-30 not filed within 24h** для real foreign tenant → **manual intervention + immediate fix**.

Если первая неделя:
- **Activation rate** (register → first booking submitted) ≥ 30%.
- **Listing conversion** (view → application) ≥ 5%.
- **Host approve rate** ≥ 70%.
- **Contract signed rate after approve** ≥ 90%.

---

## Owners (предположение — уточнить)

| Категория | Owner |
|---|---|
| Frontend P0 (forgot/change password, search, OG) | Frontend dev |
| Backend P0 (rate-limit, timing, JWT, regressions) | Backend dev |
| Cabinet UX (P1) | Frontend dev |
| Security headers + JWT rotation | Backend / DevOps |
| Email delivery + templates | Backend |
| Legal docs | Юрист (внешний) |
| Mobile QA real device | QA / Product owner |
| Production deployment + monitoring | DevOps |
| Launch coordination | Product owner |

---

## Что в этом плане **НЕТ** (out of scope для launch)

- Native mobile apps (iOS / Android) — web-only.
- Multi-currency (only ฿).
- Reviews aggregation (показывать «★ New» для всех).
- Vehicles / Equipment / Spaces / Services / Experiences categories (Coming Soon).
- Multi-host management (one user = one account, no agencies).
- Affiliate / referral program.
- Reporting / analytics dashboards для hosts (используют Finance tab MVP).
- A11y AAA (target AA достаточно).

---

## Финальная команда «GO / NO-GO»

После прохождения всех P0 + E2E + soft-launch — собрать meeting:
- Owner: подтверждает business readiness.
- Frontend dev: подтверждает builds clean + no critical errors.
- Backend dev: подтверждает API health checks pass + backups verified.
- Юрист: docs approved.
- DevOps: monitoring + alerting ready.

**GO** → enable production hostname + open registration.
**NO-GO** → fix list + new soft-launch date.

---

**Файлы для cross-reference:**
- Findings: `TENANT_FLOW_QA.md`, `LANDLORD_FLOW_QA.md`, `BACKEND_ISSUES.md`
- ТЗ для фронта: `FRONTEND_SPEC.md`
- Roadmap по приоритетам: этот документ (`PRODUCTION_READINESS.md`)
