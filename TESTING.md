# E2E Test Plan — Siamo

Сквозной end-to-end сценарий: landlord регистрируется → создаёт объект → tenant регистрируется → бронирует → landlord одобряет → tenant подписывает контракт → tenant оплачивает.

Тестируется как реальные пользователи без априорных знаний о коде. UX и понятность важны наравне с функциональностью.

---

## Легенда

**severity:**
- **blocker** — нельзя продолжить flow
- **major** — flow проходится, но юзер теряется / неправильное поведение / потеря данных
- **minor** — раздражает, но обходится
- **polish** — косметика

**scope:**
- **frontend** — фикс в pmc-web
- **backend** — описать для команды PMC.BFF
- **ux** — нужно дизайнерское решение
- **a11y** — доступность

---

## Окружение

- Frontend: http://localhost:5173
- Backend: http://localhost:5149
- Тест-аккаунт landlord: `landlord-e2e-2026@pmc.test` / `Test1234!`
- Тест-аккаунт tenant: будет создан позже
- Темы: dark по умолчанию, light переключателем

---

## Bug log

### S1. Регистрация landlord (`/register`)

| # | Что | Severity | Scope |
|---|-----|----------|-------|
| B-1 | Только First name, нет Last name. Для контракта понадобится фамилия — где её собирать? | major | frontend/ux |
| B-2 | Нет чекбокса «Принимаю Terms / Privacy» — юридический риск. | major | frontend/legal |
| B-3 | На `/login` есть LINE OAuth, на `/register` — нет. Несимметрично. | minor | frontend |
| B-4 | Подсказка пароля только «At least 8 characters». Нет требований по сложности (digit/upper/symbol). | minor | frontend |
| B-5 | Валидация только при submit, нет on-blur — юзер не видит ошибку пока не нажмёт кнопку. | polish | frontend |
| B-6 | `POST /api/auth/login` для существующего юзера → 500 «Internal Server Error» (повторяемо curl-ом). | blocker | backend |

### S2. Onboarding intent (`/me/onboarding/intent`)

| # | Что | Severity | Scope |
|---|-----|----------|-------|
| B-7 | «Get started →» не выглядит как primary CTA — просто текст со стрелкой. | minor | ux/frontend |
| B-8 | Нет welcome-обращения после регистрации («Hi TestLandlord …»). | polish | ux |

### S3. Editor — Property type & size (секция 1/11)

| # | Что | Severity | Scope |
|---|-----|----------|-------|
| B-9 | Счётчик «2 of 11 required steps» показан **до** того как юзер что-то заполнил — посчитаны дефолтные `Bathrooms=1`, `Max guests=2`. Misleading. | major | frontend |
| B-10 | Иконки в Property type (Entire / Private / Shared / Hotel) — все одинаковые (куб). | minor | polish |
| B-11 | Bedrooms = 0 по умолчанию. Что значит 0? Studio? Нет подсказки. | minor | ux |
| B-12 | «Floors in building» — специфично для тайских кондо, нужен тултип. | polish | ux |
| B-13 | CTA «Fill required fields» disabled, не указывает **какие именно** поля не заполнены. | minor | ux/frontend |
| B-14 | Floating bottom-right «3/11 required steps · keep going» + Save property — дублирует верхний прогресс. | polish | frontend |
| B-15 | Unit floor = 0 по дефолту, Floors in building = 1 — может стать невалидно (floor > floors). Нужна валидация. | minor | frontend |
| B-16 | Area (m²) — пустое, без дефолта и без подсказки минимума. | polish | frontend |
| B-17 | Number-поля (Bedrooms, Bathrooms, Max guests, Unit floor, Floors) имеют `type="text"` вместо `type="number"`. На mobile keyboard — alphanumeric вместо цифровой. | minor | frontend/a11y |
| B-18 | Required-mark — маленькая красная `*`. Не выделен и легко пропускается. | polish | frontend |

### S3. Editor — Address & location (секция 2/11)

| # | Что | Severity | Scope |
|---|-----|----------|-------|
| B-19 | `GET /api/marketplace/cities` возвращает **только Chiang Mai**. Бангкок, Пхукет, Паттая отсутствуют. Это бэкенд-данные. | blocker | backend |
| B-20 | Карта по дефолту центрирована на Бангкоке, хотя в выборе City только Chiang Mai. Несинхрон. | minor | frontend |
| B-21 | Postal code prefilled = `10110` (Bangkok ZIP) до того как выбран адрес. После выбора autocomplete обновляется правильно. Странный дефолт. | minor | frontend |
| B-22 | Address autocomplete suggestions не имеют `role="option"` / aria-attributes — screen reader их не увидит. | minor | a11y |
| B-23 | Legal address required, но если юзер не доскроллит — увидит только disabled CTA «Fill required fields». Подсказки куда смотреть нет. | major | ux |
| B-24 | `GET /api/listings/asset/` (с пустым ID) → 400. Дважды на загрузке editor. Лишний запрос, мусор в логах. | minor | backend/frontend |
| B-25 | `GET /api/me/capabilities` дёргается **5 раз** при переключении секций (без видимых изменений). Нет дедупликации / кеша. | minor | frontend |

### S3. Editor — оставшиеся секции (Pricing, Photos, Check-in, House rules & WiFi, Pets, Contact, Payment, Listing title) ⏳

Не пройдены.

### S4–S10. Tenant flow ⏳

Не начат.

---

## Сводка

**По severity:**
- blocker: 2 (B-6 login 500, B-19 cities только Chiang Mai)
- major: 5
- minor: 13
- polish: 5

**По scope:**
- backend: 4 (B-6, B-19, B-24 частично, B-25 косвенно)
- frontend: 18+
- ux/a11y: 6+

---

## Cross-cutting checks (отложено)

- [ ] Тёмная и светлая тема — нет «бледных» элементов
- [ ] EN / TH / RU — переводы есть, ничего не обрезается
- [ ] Mobile (375px) и desktop (1440px)
- [ ] Сетевая ошибка — есть понятный fallback
- [ ] Пустые состояния — есть подсказка
