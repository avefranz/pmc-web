# Тенант-флоу: список багов и улучшений

> QA-прогон от лица "Sarah Chen" (expat-релокант на 6+ месяцев, ищет жильё в Чианг Мае). Дата: 2026-05-23.
> Формат: `[ ]` — не сделано, `[x]` — сделано. Категория `BUG` — функциональный дефект, `UX` — улучшение опыта/копирайта/визуала.
> Под каждым пунктом указано: где, что не так, как должно быть, почему важно.
> Связанные находки лендлорд-стороны — в [LANDLORD_FLOW_QA.md](LANDLORD_FLOW_QA.md). ID-нумерация сквозная между обоими файлами.

---

## Marketplace (`/listings`) — discovery

- [x] **BUG-32. Карточка в `/listings` показывает generic title "Apartment in Chiang Mai" вместо введённого пользователем "Sunny 1-bed near Nimman, Chiang Mai".** — ✓ verified 2026-05-23: title теперь корректно отображается (`Sunny 1-bed near Nimman, Chian…` обрезано до ширины карточки). Cover-фото отдельно — см. BUG-48.
  - Где: `/listings`.
  - Что: на главной marketplace моя карточка теряет уникальный title и фото-обложку — видны только серый плейсхолдер, "Apartment in Chiang Mai", "฿35,000 / month · ★ New". На детальной странице (`/listings/{id}`) всё корректно. Расхождение между card и detail. Все остальные карточки на странице тоже generic — массовая проблема презентации.
  - Как должно: card title = listing title; cover image = первое загруженное фото.

- [ ] **BUG-47. Карточки cover-photo в /listings: пустые серые блоки и зелёное поле с обрезанным именем файла "droom.jpg".** — частично: зелёного `droom.jpg` артефакта больше нет (fallback убран), но cover-фото **не отображаются** ни на одной карточке `/listings` — все плейсхолдеры серые. См. BUG-48.
  - Где: `/listings` сетка карточек.
  - Что: моя карточка "Sunny 1-bed near Nimman" — серый плейсхолдер вместо cover (хотя на детали 3 фото есть и cover установлен). Карточка "Cozy 1-bed in Nimman" — **ярко-зелёное поле** с текстом `droom.jpg` (выглядит как обрезанное имя файла, например `bedroom.jpg`). Карточка "Test Studio Nimman" — синий плейсхолдер. Tenant видит каталог из мусора.
  - Как должно: cover всегда подгружается с CDN; fallback при отсутствии — нейтральный плейсхолдер (placeholder image, иконка), но не filename и не цветная заглушка.

- [x] **BUG-48. Cover-photo не отображается даже когда фото загружены — расхождение между card и detail.** — ✅ FIXED 2026-05-23: причина — `loading="lazy"` на `<img>` в карточках; изображения не загружались до скролла к ним. Убран `lazy` → 12/12 обложек загружаются корректно. Файл: `listings-page.tsx`.
  - Где: `/listings` vs `/listings/{id}`.
  - Что: моя карточка в сетке без фото. На детальной странице 3 фото есть. То есть `coverPhotoUrl` либо не сохраняется в card-проекции, либо frontend выбирает фото неправильно.
  - Как должно: card.coverUrl = listing.photos[0].url (или explicitly marked cover).

- [x] **UX-49. Каталог /listings — на главной много явно тестовых черновиков: "Today #1", "My new prop", "That's the way", "Villa", "Cool option".** — ✅ FIXED (BE-21, 2026-05-23): quality gate добавлен в `SearchListingsAsync` — `ListingMedia.Count >= 1` + `Title.Length >= 15`. Тестовые черновики больше не попадают в публичный каталог.
  - Где: `/listings`.
  - Что: для свежего тенанта главная marketplace выглядит как раздел с тест-данными — без названий, без проверки качества обложек (одна — кот на полу, другая — стиральная машина с трубами). Доверия к платформе нет.
  - Как должно: модерация / валидация перед публикацией; минимум — проверка cover-photo "это похоже на жильё?" + минимальная длина title.

- [ ] **UX-50. Filter-чипы "Pool", "Free parking on premises", "Filters" — состояние неясно.**
  - Где: верх `/listings`.
  - Что: чипы выглядят активными (тёмный текст, hover-стиль), но результаты не фильтруются. Tenant не понимает — это уже применённый фильтр или кнопка применить?
  - Как должно: явное "выключенное" состояние (outline + hover), активное — заливка + ✓.

- [ ] **UX-51. Все карточки с лейблом "★ New" — нет соц. доказательства.**
  - Где: `/listings`.
  - Что: каждый листинг помечен "New". Нет рейтингов, нет числа бронирований, нет отзывов. Свежий тенант не понимает, какому хосту доверять.
  - Как должно: для новых — "New" с тегом "Hosted by Marina · joined 2026"; для не-новых — рейтинг и кол-во reviews.

- [ ] **UX-52. Title карточки обрезается без `…` и без подсказки.**
  - Где: карточка моего листинга в сетке "Sunny 1-bed near Nimman, Chian..."
  - Что: обрезано в произвольном месте без явного `…`.
  - Как должно: text-overflow: ellipsis с `…`, либо доп. строка для длинного title.

---

## Деталка листинга (`/listings/{id}`)

- [ ] **BUG-38. На детальной странице листинга cover-фото отсутствует в галерее.**
  - Где: `/listings/{id}` блок photos.
  - Что: лэйаут галереи — 1 большое слева + 4 средних справа. На моём листинге слева пусто (серая зона), 1 фото в верхнем-правом, 2 средних — серые плейсхолдеры. Кнопка "Show all 3 photos" говорит, что фото 3, и они действительно есть. Но cover не выводится в основное левое окно.
  - Как должно: cover (тот, что помечен `★ COVER` в редакторе) должен занимать главное слева окно галереи.

- [x] **UX-39. Над галереей два заголовка подряд: "Sunny 1-bed near Nimman, Chiang Mai" + чуть ниже "Apartment in Chiang Mai, Thailand".** — ✓ verified 2026-05-23: теперь один заголовок + компактная сабметка `Apartment · Chiang Mai, Thailand` в одну строку с specs. Иерархия очевидна.
  - Где: `/listings/{id}` верхняя секция.
  - Что: для свежего пользователя это выглядит как два разных названия. Первое — кастомное имя, второе — generic тип объекта. Иерархия не считывается с первого взгляда.
  - Как должно: один основной заголовок + малозаметная сабметка ("Apartment · Chiang Mai") в одну строку с specs или совсем без неё.

- [x] **BUG-40. Депозит на детальной странице (฿35,000) расходится с введённым в редакторе (฿70,000).** — ✅ FIXED 2026-05-23: API возвращал `depositAmount: 70000` корректно; баг был на фронте — `BookingWidget` читал `monthRate` вместо `depositAmount`. Фикс: добавлено поле `depositAmount` в `MarketplaceListingDto` (TS), прокинуто в props виджета, расчёт `due on move-in` теперь использует реальный депозит. Файлы: `booking-widget.tsx`, `marketplace.ts`, `listing-detail-page.tsx`.
  - Где: booking widget `/listings/{id}` → "Refundable deposit".
  - Что: при заполнении формы Marina указала `Security deposit (THB) = 70,000`. Виджет показывает `฿35,000`. Сумма "Due on move-in ฿70,000 · 1st month + deposit" подтверждает: 35k rent + 35k deposit = 70k. То есть депозит **обрезался / был перезаписан** значением месячной ренты где-то между редактором и публикацией. Внутри booking detail (для тенанта) корректное значение ฿70,000 — расхождение остаётся между публичной страницей и реальным состоянием.
  - Как должно: фактический депозит из формы доходит до публичной страницы без модификаций.

- [ ] **UX-53. Деталка листинга: зелёный кружок справа от title без подписи.**
  - Где: `/listings/{id}` верхняя секция.
  - Что: рядом с заголовком "Sunny 1-bed near Nimman, Chiang Mai" — зелёный кружок без текста. Свежий tenant не понимает: "Available"? "Live"? "Approved by Siamo"? Hover не даёт подсказки.
  - Как должно: явная подпись `Available` / `Live` рядом с индикатором.

---

## Booking widget

- [x] **BUG-54. Окно выбора move-in date — макс. 30 дней от сегодня без объяснения.** — ✅ FIXED 2026-05-23: лимит расширен до 6 месяцев. Файл: `booking-widget.tsx`.
  - Где: booking widget date-picker.
  - Что: при duration=6 months и `Available from = today` все даты после ~1 месяца помечены недоступными (greyed). Sarah-релокант планирует переезд через 2-3 месяца — она не может это сделать. Никакой подписи "max move-in within 30 days" или объяснения нет.
  - Как должно: либо разрешить выбор любой даты до Available until, либо явная подпись `Earliest: X, Latest: Y` под полем.

- [ ] **UX-55. Метки слайдера "1m / 3m / 6m / 9m / 12m" выглядят кликабельными, но не работают.**
  - Где: booking widget, Length of stay.
  - Что: клик по "6m" не переключает — только drag по handle. Affordance кнопок без функции. Параллель в редакторе лендлорда — `UX-08` (пилюли шагов формы).
  - Как должно: метки = пресеты, клик = установить значение.

- [x] ~~**UX-56. Booking widget не предлагает оплатить весь срок вперёд — только 1st month + deposit.**~~ — **Не баг, by design.** Оплата сразу всего срока продуктом не предусмотрена.

- [ ] **BUG-56a. Тенант может оплатить будущие месяцы преждевременно через повторное нажатие "Pay now" — оплата всего срока вперёд формально запрещена, но фактически не блокируется.**
  - Где: `/me/guest/bookings/{id}` Payments tab → CTA "Pay ฿35,000 now".
  - Что: после первой оплаты (deposit + first month) виджет показывает следующий месяц с подписью "Pay window opens 07 Jul 2026 — early payment also fine, no extra charge." и **активной** кнопкой Pay now. Я прокликала её 5 раз подряд — все 6 месяцев оплатились разом. На стороне host в виде "All rent collected ฿210,000 received over 6 months". То есть продуктовое правило "только помесячно по графику" нарушается на стороне фронта **и** бэка.
  - Как должно: до начала pay window (за N дней до due-date следующего месяца) кнопка Pay now должна быть disabled. Текст "early payment also fine, no extra charge" убрать. На бэке — отказывать в charge для будущих months до их pay-window.

---

## Booking-модалка (Request to Book)

- [x] **UX-41. Копирайт "property manager" и "Manager will review" — устаревшая роль.** — ✓ verified 2026-05-23: модалка теперь говорит "You won't be charged now. **The host** will review and respond." Термин "manager" заменён на "host".
  - Где: модалка "Request to Book" → подпись `You won't be charged now. The manager will review and respond.` И на финальном экране `Request received! We've sent your request to the property manager. Expect a response within 24 hours.`
  - Что: в системе нет роли Manager (это **самообслуживание для лендлорда**, см. `[[no-manager-role]]` в моей памяти). Tenant ждёт ответа от какого-то "менеджера", которого нет; реально отвечает сам host.
  - Как должно: единый термин `host` (или `the host`). "Expect a response from the host within 24 hours."

- [ ] **UX-42. Заголовок успешной модалки: "Request sent!" в шапке + "Request received!" с галочкой в теле.**
  - Где: финальный шаг бронирования.
  - Что: две разных фразы в одном экране, про одно и то же событие. Свежему пользователю неясно: отправлено или уже получено? Кем получено?
  - Как должно: единая формулировка ("Booking request sent — host will reply within 24h").

- [ ] **UX-43. Placeholder "Suvarnabhumi" для поля Entry port — bias к Бангкоку.**
  - Где: модалка `Your details` → поле Entry port.
  - Что: листинг в Чианг Мае, разумно ожидать что многие тенанты прилетают через Chiang Mai International (CNX), а не Бангкок (BKK). Placeholder подталкивает к одному варианту.
  - Как должно: либо общий placeholder `e.g. Chiang Mai`, либо динамически выбирать ближайший airport к городу листинга, либо dropdown с топ-5 портов въезда.

- [ ] **UX-44. Виджет TM30 показывается всем без вопроса о nationality.**
  - Где: `Your details` шаг бронирования.
  - Что: подпись "Required for your rental contract and TM30 immigration filing." — для тайского тенанта TM30 не нужна (TM30 — отчёт хоста об иностранце). Поля Nationality / Passport / Visa бессмысленны для local тенантов.
  - Как должно: сначала спросить nationality, если Thai — скрыть passport/visa/TM30 поля.

- [ ] **BUG-57. Radix `<Select>` с visa-type вариантами рендерится под модалкой — Sarah не видит опции.**
  - Где: модалка booking → `Your details` → Visa type.
  - Что: клик по `Select visa type` вызывает Radix combobox в `data-state="open"`, но визуально опции **не отображаются** — z-index конфликт с модальным overlay. Sarah кликнет, ничего не произойдёт, она застрянет.
  - Как должно: portal с z-index выше overlay, либо в той же DOM-иерархии что и модалка. Проверить на всех Radix-селектах в модалках.

- [ ] **UX-58. Кнопка `Fill all fields (or Skip)` — описание состояния вместо CTA.**
  - Где: модалка `Your details`.
  - Что: текст похож на инструкцию, а не на действие. Параллель в редакторе лендлорда — `UX-13`.
  - Как должно: `Save & send request` (как становится после заполнения).

---

## Booking detail (`/me/guest/bookings/{id}`)

- [ ] **UX-64. "Hosted by your host" — копирайт-заглушка вместо имени Marina.**
  - Где: верхняя секция booking detail.
  - Что: tenant ждёт знать с кем имеет дело — имя хоста, аватар, рейтинг. Видит обезличенное "your host".
  - Как должно: `Hosted by Marina Sokolova` + аватар + ссылка на host-профиль.

- [ ] **BUG-62. Stay-tab показал "NEXT PAYMENT: All paid · Nothing owed", хотя оплаты не было.**
  - Где: `/me/guest/bookings/{id}` Stay-tab → NEXT PAYMENT stat-card.
  - Что: после возврата с страницы контракта (без подписания и без оплаты), Stay-tab вверху показал `NEXT PAYMENT: All paid · Nothing owed`. Параллельно: верхний бейдж "Payment pending" остался, Payments-tab корректно показал ฿105,000 due. UI-state рассинхронизирован.
  - Как должно: единственный источник правды для `paid/owed`; Stay-tab показывает то же что Payments-tab.

- [ ] **BUG-69. В модалке оплаты доступен таб PromptPay (QR) — legacy, должен быть удалён.**
  - Где: модалка `Secure Payment · SANDBOX · 2C2P` → таб переключения "PromptPay / Card".
  - Что: при клике "Pay ฿X now" модалка показывает два таба для способа оплаты, по умолчанию выбран PromptPay с QR-кодом для скана. По продуктовому решению оплата только по карте, PromptPay — устаревшая опция, не должна быть доступна. Тенант может оплатить через QR — это создаст несогласованность с другими частями системы (рекуррентные платежи, refund, депозит-холд через Siamo).
  - Как должно: таб PromptPay убрать, оставить только Card. Если требуется PromptPay как опция в будущем — feature-flag.

- [ ] **UX-63. Оплата заблокирована до подписи контракта без объяснения причины.**
  - Где: Payments tab → "Sign the agreement first" disabled-CTA.
  - Что: для Sarah это новость — она пыталась "Go to payment", вернулась, увидела disabled. Без объяснения "sign first" в момент кликания.
  - Как должно: пояснить заранее (под Initial payment summary): "You'll be able to pay after signing the rental agreement."

---

## Контракт (`/me/guest/bookings/{id}/contract`)

- [ ] **BUG-60. Контракт зафиксировал неправильный адрес из reverse-geocode (последствие [BUG-01](LANDLORD_FLOW_QA.md)).**
  - Где: `/me/guest/bookings/{id}/contract` → Property field.
  - Что: контракт сгенерирован с адресом `29/1 Hassadhisawee Road, Chiang Mai, 50030` — это значение, которое подставила карта при тапе. Marina реально ввела `88 Nimmanhaemin Road / 50200`. Tenant подпишет юридический документ с неверным адресом, по которому объекта может не существовать.
  - Как должно: контракт берёт `legalAddress` (то что лендлорд ввёл руками), а не `streetAddress` из reverse-geocode. Корневое исправление — в `BUG-01`.

- [ ] **UX-59. Дубликат данных: Visa type / Entry date / Entry port спрашиваются на этапе booking-request И повторно при подписании контракта.**
  - Где: `Your details` модалка vs. `/contract` страница.
  - Что: Sarah уже выбрала Non-Immigrant B, 10/05/2026, Chiang Mai (CNX). На контракте поля пустые, надо заполнять заново.
  - Как должно: данные one-time, переиспользуются на этапе контракта.

- [ ] **UX-61. Фото-загрузчик passport не имеет drag&drop или camera-trigger подсказки.**
  - Где: `/contract` → Upload passport pages.
  - Что: dropzone есть, но без явных подсказок "перетащите сюда или сфотографируйте". Mobile-юзер не поймёт что есть кнопка "сделать фото камерой".
  - Как должно: `<input capture>` для mobile + текстовая подсказка под dropzone.

---

## Privacy

- [ ] **UX-66. Email тенанта показан host-у до confirmed booking.**
  - Где: `/me/host/requests/{id}` блок Sarah Chen → `tenant@test.local` cleartext + clickable.
  - Что: Marina при заполнении своего телефона видела подсказку "Shared with tenants only after their booking is confirmed". А email tenant виден host до подтверждения. Несимметрия privacy.
  - Как должно: email тенанта показывается только после approve + signed contract + payment, или маскироваться (`s***@test.local`) до этого момента.

---

## Сессия 2026-05-23 — повторный проход с свежей регистрацией (Sarah)

Sarah-аккаунт зарегистрирован заново, marketplace → деталка объекта Marina (Chiang Mai) → Booking modal (step 1 + 2) → Request sent. Затем Marina (host) → Approve. Контракт/оплата ещё не проверены.

### Verify #5 — pet flow, reject, host sign, TM-30, early-exit (2026-05-24, финальный)

Полный E2E прошёл: pet booking → reject (UI показывает host reason) → отдельная активная заявка → host sign → TM-30 PDF upload → 1/1 filed · Compliant.

**Verified FIXED:**
- **BUG-119** Refundable deposit на rejected app — теперь ฿60,000 (одна строка: `app.monthlyRate` → `app.depositAmount` в `applications/detail-page.tsx:265`) ✓
- **UX-106** Sarah country code в Guest card — теперь "US · Tourist Visa" (раньше "MP") ✓
- **UX-114** Early exit penalty — теперь показано "Early exit penalty ฿30,000 · 1 month rent · applied upon host confirmation" **до submit** ✓

**Новые UX-замечания:**

- [ ] **UX-120. TM-30 "Upload PDF" CTA неочевидна — пользователь не понимает что это и зачем.**
  - Где: `/me/host/bookings/{id}` → Guests tab → Sarah Chen card → "Upload PDF" link (правый bottom).
  - Что: после Marina подписи появляется красный banner "File TM-30 NOW — 24-hour window is open · Thai law: 1 foreign guest unreported · Fine exposure up to ฿2,000". Это привлекает внимание. Но **сам upload-link** "📤 Upload PDF" внутри Sarah card visually маленький, серый, ничего не выделяет важность. Пользовательский фидбэк: "эта кнопка по загрузке TM-30 очень неочевидная". Юзер видит banner, но не понимает что именно нажать в guest card.
  - Как должно: либо banner с явным "File now →" должен сразу скроллить и подсвечивать Sarah card + Upload-CTA; либо Upload-CTA выделить (primary-styled button) с текстом "📤 Upload TM-30 receipt"; либо drag-drop zone full-width рядом с banner.

- [ ] **UX-121. "Message host" CTA на booking detail не открывает внутренний чат — раскрывает phone + WhatsApp.**
  - Где: `/me/guest/bookings/{id}` → "Message host" button.
  - Что: пользовательское ожидание — внутренний chat (как Airbnb/Booking). Реальность — кнопка прокручивает к "Contact your host" секции с phone и WhatsApp deeplink. Это design decision (Siamo не имеет internal chat, использует external channels), но CTA misleading.
  - Как должно: либо переименовать "Message host" → "Contact host"; либо добавить internal chat (стратегическое решение); либо явно подписать "We use external channels — WhatsApp / LINE / phone".

### Pet flow E2E + Reject (2026-05-24, поздний)

После исправлений Sarah сделала вторую заявку (Aug 24 → Nov 24 2026) с pet (1 cat). Пользователь загрузил фото кота. Заявка отправлена с pets data → Marina видит "Pets: 1 cat" + Pet photos thumbnail с фото кота ✓. Marina нажала Reject с preset reason "We're unable to accommodate pets at this time." → Sarah видит "Not available — Unfortunately the host wasn't able to accommodate this request. **Host's message: We're unable to accommodate pets at this time.**" Полный reject flow ✓.

**Что работает:**
- Pet count submission + photo upload — passthrough от tenant к host
- Host sees pets count + photos in request detail
- Reject modal с 5 preset reasons + free-form message
- Sarah видит rejection reason на application detail page
- Past application moved to "PREVIOUS" section с "Rejected" badge

**Найдено новое:**

- [ ] **BUG-119. Refundable deposit на rejected application показан как ฿30,000 (= monthlyRate), хотя BE возвращает depositAmount: 60000.**
  - Где: `/me/guest/applications/{rejectedAppId}` Reservation details panel.
  - Что: BE-25 fix на ApplicationDto уже добавил `depositAmount` field, и `GET /api/me/guest/applications/{id}` возвращает `depositAmount: 60000` для rejected заявки. Но UI Reservation details показывает "Refundable deposit ฿30,000" — это **фронт-баг mapping** на rejected application detail page: читает `monthlyRate` (฿30,000) вместо `depositAmount` (฿60,000). На approved application detail тот же баг был раньше (BUG-90), там пофикшен. На rejected осталось.
  - Как должно: использовать одну и ту же mapping функцию для всех statuses (Approved/Rejected/Pending/Expired) — читать `depositAmount`.
  - Импакт: cosmetic для rejected booking (нет финансовых обязательств), но всё равно даёт inconsistency: tenant думает "deposit был ฿30k" хотя реально в листинге ฿60k. Может повлиять на trust.

### Verify #4 (2026-05-24, после третьего раунда фиксов)

Полный E2E прошёл успешно: Marina создала новый property (с pets-allowed) → Sarah заявка → Marina approve → Sarah sign + pay ฿90,000 → Marina на финансах видит правильные KPI. Verified:

| ID | Verify #4 |
|----|-----------|
| BUG-115 photo upload silent fail | ✅ FIXED — после Pricing save listing record создан (id assigned, mediaCount 3 после upload). Publish flow проходит. |
| BE-25 ApplicationDto без depositAmount | ✅ FIXED — `/api/me/guest/applications` теперь содержит `depositAmount: 60000` |
| BE-26 booking auto-expires до оплаты | ✅ FIXED — после sign контракта expiresAt продлевается до +72h. Sandbox-confirm проходит. Полный flow Marina-Sarah-Marina завершён. |
| BE-27 DELETE asset с active booking | ✅ FIXED — API возвращает 400 "Cannot delete property with 1 active reservation(s). Cancel or complete all bookings before deleting." |
| BE-28 host endpoints для tenant | ✅ FIXED — `/api/me/host/booking-requests`, `/api/finance/*` возвращают 403 для tenant |
| BE-31 auth/me caching | ✅ FIXED — `Cache-Control: private, max-age=30` |
| BUG-90 deposit cross-side | ✅ FULLY FIXED — tenant видит ฿60k во всех views, host тоже ฿60k |
| BUG-104 Finance Dashboard inconsistency | ✅ FIXED — Total revenue ฿90k включает Rent ฿30k + Deposit ฿60k; KPI consistent |
| UX-105 Revenue chart без Deposit | ✅ FIXED — bar chart показывает Rent + Deposit (held) с annotation "฿60,000 deposit held by Siamo" |
| UX-99 "Expired" badge на active | ✅ FIXED — на свежем booking badge "Payment pending" → "Confirmed" корректно |
| UX-100 "Yesterday" в day of check-in | ✅ FIXED — на день check-in отображается "Today. Message your host..." |
| BUG-98 deposit отдельно от schedule | ✅ FIXED — Initial payment block: Security deposit + First month → "Pay ฿90,000 now" единым CTA |

| ID | NOT FIXED / новые находки |
|----|---------------------------|
| UX-82 first dropdown item зелёный preselect | ❌ NOT FIXED — Chiang Mai первый item всё ещё с зелёным фоном при открытии City dropdown |
| UX-84 spinner defaults | ❌ NOT FIXED — Bedrooms=0, Bathrooms=1, Max guests=2 без visual distinction |
| UX-101 contract identity дублирует passport | ❌ NOT FIXED — на втором booking contract Sarah'а passport/nationality снова пустые; данные между sessions не сохраняются |
| BUG-110 auth errors не показываются | ✅ FIXED — `login.tsx` и `register.tsx` оба содержат `serverError` state, catch-блок читает `response.data.detail`, рендерит красным под формой |
| BUG-116 UI guard /me/host/finance для tenant | ✅ FIXED — `AuthGuard` получил `require="landlord"`; `/me/host` (кроме properties editor) обёрнут `<AuthGuard require="landlord">` → tenant-only user редиректится на `/me/guest/bookings` |

- [ ] **UX-117. Photos upload медленный + cover не сразу отображается в Live Preview.**
  - Где: editor → Photos → Add upload.
  - Что: загрузка нескольких фото занимает заметно много времени без visible progress bar или spinner. Также первое (cover) фото иногда не отображается в Live Preview сразу после upload — нужен reload или save секции, чтобы Live Preview обновился.
  - Как должно: добавить per-photo progress bar (или общий) во время upload; обновлять Live Preview cover immediately после первого successful upload (optimistic UI).

- [x] **UX-118. Delete property: modal не упоминает active reservations до submit, error toast "Couldn't delete" без BE detail.**
  - Где: `/me/host/properties/{id}` → Delete property modal + post-submit toast.
  - Что: BE-27 правильно блокирует с 400 "Cannot delete property with 1 active reservation(s). Cancel or complete all bookings before deleting." Но UI:
    1. Modal "Delete this property?" не делает pre-flight check `/api/assets/{id}/can-delete` или подобный — пользователь сначала жмёт Delete, потом узнаёт о блокировке.
    2. Post-submit показывается только generic toast "Couldn't delete" — без specific reason ("1 active reservation"). BE-detail отбрасывается.
  - Как должно: pre-warn в modal "⚠️ This property has 1 active reservation. Cancel it first before deleting." с явным CTA вместо Delete; если BE возвращает 400 — отображать `response.data.detail` в toast или inline. Та же логика, что в BUG-110 для auth errors.

---

### Сессия 2026-05-24 — негативные сценарии (edge cases, errors, permissions)

Систематический проход edge-cases: pet-conflict, auth-errors, cross-role authorization, empty-states, edit/delete with active reservation. Найдено 6 находок, две критичные.

- [ ] **UX-109. "I have pets" silently игнорируется на no-pets listing — нет feedback почему.**
  - Где: marketplace listing detail → Request to Book modal step 1, Travelling with pets section.
  - Что: на listing с `petsAllowed=false` под подзаголовком "Travelling with pets?" есть две кнопки **No pets** и **I have pets**. Кнопка "I have pets" **визуально активна** (выглядит как clickable), но клик ничего не делает: visual selection не появляется, Continue остаётся disabled, никакой error message/tooltip не показывается. Pet-holder выбирает "I have pets" → ничего не происходит → застрял.
  - Как должно: либо disable "I have pets" с tooltip "Pets are not allowed at this property — book another listing"; либо при клике показать popup "Pets are not allowed. Reach out to the host to discuss exceptions." Сейчас — silent ignore, наихудший UX вариант.

- [x] **BUG-110. Login и Register не отображают server errors на UI — silent reset формы.**
  - Где: `/login` и `/register`.
  - Что: BE корректно возвращает 401 "Invalid email or password." и 400 "Email already exists" — но фронт не отображает эти errors ни как inline error под кнопкой, ни как toast. Форма просто тихо ресетится. Тестировал на: wrong password, unknown email, duplicate register, weak password. В пустом submit — 400 validation errors с полями возвращается, тоже не показывается. Связано с BUG-103 (autofill сбрасывает поля до submit), но даже когда API вызывается с правильными данными — UI не показывает ошибку.
  - Как должно: inline error message под формой "Wrong email or password" / "Email already in use" / "Password too weak"; для validation 400 с `errors` объектом — показывать field-level errors под соответствующими input'ами.

- [x] **BUG-111. Sarah (tenant only, `isLandlord:false`) получает 200 от host endpoints + UI Finance Dashboard открывается.**
  - Где: `/api/me/host/booking-requests`, `/api/finance/overview`, `/api/finance/summary`, `/me/host/finance` UI.
  - Что: tenant с `isLandlord:false, isTenant:true` capabilities делает GET на host endpoints — все 3 endpoint возвращают 200 (с пустыми data, но не 403). На UI navigate `/me/host/finance` показывает Finance Dashboard с ฿0 везде, без redirect или access-denied screen. Sarah буквально видит host control panel.
  - Как должно: BE — добавить authorization-фильтр `[Authorize(Roles="Landlord")]` или check `IsLandlord` на host endpoints, возвращать 403. Фронт — AuthGuard на `/me/host/*` route должен проверять `isLandlord` capability и redirect tenant'а на `/me/guest/*` или показывать "You need to list a property first" page.

- [ ] **🚨 BUG-112 / BE-27. CATASTROPHIC: DELETE asset с active reservation проходит с 204 — Sarah теряет ฿105k в "подвешенном" состоянии.**
  - Где: `DELETE /api/assets/{assetId}` + Marina-side UI "Delete property" button.
  - Что: у Sarah active confirmed booking, оплачено ฿105,000 (deposit ฿70k + first month ฿35k), контракт подписан обеими сторонами. Marina открывает свой property → "Delete property" → modal "Delete this property? This is permanent. The listing, photos, and history will be removed." → Delete. **Никакого упоминания active reservation, оплаченных денег, контрактных обязательств.** API возвращает 204. После:
    - Marina теряет доступ к собственному asset (`/api/assets/{id}` → 403)
    - Marina не видит booking (`/api/bookings/{id}` → 403)
    - `/api/me/host/booking-requests` для неё пуст
    - Listing удалён из marketplace (404)
    - Sarah: `/api/me/guest/applications` пуст, `/payment` endpoint 404, listing 404
    - Booking record уцелел в БД (`/api/bookings/{id}` для tenant → 200 с rentAmount/depositAmount), но **Sarah не имеет UI-доступа к нему**
    - Sarah оплатила ฿105,000 — данные orphan'ed, нет refund flow, нет уведомления
  - Как должно: BE — **block DELETE если ANY active booking** (или confirmed reservation) с 409 Conflict + detail "Cannot delete property with N active reservations. Cancel them first." Front — Delete modal должен сначала вызвать GET `/api/assets/{id}/can-delete` и показать explicit blockers ("⚠️ 1 active reservation · contract signed · ฿105,000 escrowed · Refund must be processed first"). Никакого hard delete с active financial obligations.

- [ ] **UX-113. Edit Pricing с active reservation — никакого warning.**
  - Где: `/me/host/properties/{assetId}` → Pricing section → Edit.
  - Что: Marina с active confirmed reservation Sarah (контракт подписан на ฿35,000/mo + ฿70k deposit) может открыть Edit Pricing и ввести любое новое значение. Никакого warning "This property has an active contract — changes affect future bookings only" или "Cannot change rent while contract is active". Если Marina вводит ฿50,000 и сохраняет — что произойдёт с активным контрактом? Тенант обещал платить ฿35k, юридически защищён, но в системе может появиться рассогласование.
  - Как должно: warning banner в Pricing section при active reservation: "⚠️ 1 active contract at ฿35,000/mo · changes apply only to new bookings"; либо disabled inputs с tooltip; либо отдельный flow "Negotiate price change with tenant" вместо silent edit.

- [ ] **UX-114. Early exit modal не показывает точную сумму штрафа до submit.**
  - Где: `/me/guest/bookings/{id}` → "Request early exit" modal.
  - Что: модалка говорит "An early exit penalty of 1 month's rent applies. **The exact calculation will be shown after submission.**" Tenant вынужден submit-нуть, чтобы узнать сколько именно (могут быть pro-rata calculations за неотгулянные дни месяца, refund deposit-а с условиями). Это вызывает anxiety: "может я случайно подтвержу что-то с большим штрафом". Tenant хочет видеть **точную цифру до commit**.
  - Как должно: рассчитать пенальти заранее на BE по текущему контексту (days passed, days remaining, deposit, refund policy) и показать в модалке: "Early exit penalty: ฿35,000 + ฿2,500 (pro-rata) − ฿70,000 refundable deposit = **net refund ฿32,500**. Submit?". Reasonable approximation > "tap and see".

---

### Сессия 2026-05-24 — round 2: повторный E2E с свежим booking

Sarah создала второй booking (Aug-Nov 2026) после первого Expired. Marina approved → Sarah signed + paid ฿105,000 (deposit ฿70k + first month ฿35k) через 2C2P sandbox → Marina signed. CONTRACT: ✅ Signed. Полный flow прошёл успешно.

**Закрытия / переоценка:**
- [x] **UX-99 "Expired" badge** — CLOSED, это был артефакт первого booking с протёкшим expiresAt; на свежем booking бейдж = "● Payment pending" → "Confirmed" корректно
- [x] **UX-100 "Yesterday" в CHECK-IN** — CLOSED, аналогично артефакт expired state; на свежем "in 91 days" корректно
- [x] **BUG-98 Deposit не в monthly schedule** — CLOSED, на свежем booking есть отдельный блок "Initial payment ฿105,000 · Security deposit ฿70k + First month's rent ฿35k · Pay ฿105,000 now"
- [x] **BUG-97 / BE-26 "booking auto-expires до оплаты"** — на свежем не репродуцируется. Edge-case первого booking — оставить открытым, нужен бэку анализ когда именно booking уходит в Expired (возможно после approve таймер не сбрасывается, если tenant долго не приступает к оплате)

**Новые находки:**

- [ ] **UX-102. "Currently living" badge на неоплаченном (expired) booking.**
  - Где: `/me/host/requests` → Approved section.
  - Что: первая (expired) заявка Sarah показана в Approved section с badge "Currently living" (зелёный), хотя Sarah ничего не оплатила. Badge должен отражать payment + active state, а не просто approved status.
  - Как должно: "Currently living" — только когда booking active + paid + check-in date passed; для expired booking без оплат — badge "Expired" или "Auto-cancelled".

- [x] **BUG-103. Login form: autofill заменяет введённый email при каждой попытке.** ✅ FIXED — добавлены `name="email" autoComplete="email"` и `name="password" autoComplete="current-password"` в login форму; браузер теперь правильно идентифицирует поля и использует нужные saved credentials.
  - Где: `/login`.
  - Что: после triple_click + Backspace + type "marina.qa.v2.1779600000@test.local" Chrome autofill моментально перезаписывает поле на сохранённый "testtenant@siamo.test". Sign in submit → форма не валидна (или валидна с другими credentials) → redirect обратно на login. Воспроизводится 100% при каждом login после очистки localStorage. UX-89 был fixed для register-page, но login-page остался уязвим.
  - Как должно: применить тот же фикс что для register (input event listener / value sync на autofill); или `autoComplete="off"` на email input при наличии сохранённых других логинов.

- [x] **BUG-104. Finance Dashboard "Total revenue" и "Net profit" не включают Deposit ฿70k, хотя "This month" включает.** ✅ FIXED — убрана фильтрация Deposit из Total revenue/Net profit; теперь все KPI включают депозит. Отдельная заметка "฿Xk deposit held by Siamo" в заголовке Revenue chart.
  - Где: `/me/host/finance` → KPI tiles + Revenue by type chart.
  - Что: после оплаты Sarah (deposit ฿70,000 + first month rent ฿35,000 = ฿105,000) KPI показывают: This month ฿105,000 (correct), Projected EOM ฿210,000, **Total revenue ฿35,000** (only rent), **Net profit ฿35,000** (only rent). Inconsistency: This month включает обе суммы, а Total revenue/Net profit — только rent. API `/api/finance/summary` возвращает `revenueByType: [{Deposit: 70000}, {Rent: 35000}]` — данные есть, фронт их суммирует разными формулами.
  - Как должно: Total revenue / Net profit должны учитывать **все** revenue (Rent + Deposit), либо явно подписать "Total rent revenue" / "Net rent profit". Также проверить логику BE-20 fix — возможно регрессия в одном из двух summary endpoints.

- [x] **UX-105. Revenue by type bar chart показывает только "Rent", без "Deposit" столбца.** ✅ FIXED — Deposit включён в chart как серый столбец "Deposit (held)", tooltip показывает "Held by Siamo".
  - Где: `/me/host/finance` → Revenue by type.
  - Что: bar chart рендерит только один оранжевый столбец "Rent ฿35k". Хотя `revenueByType` от BE: `[{Deposit: 70000}, {Rent: 35000}]`. Visualization не учитывает Deposit category.
  - Как должно: 2 столбца — Deposit (฿70k) + Rent (฿35k), разный цвет; или одна категория "Income" комбинированно — но не пропускать большую часть данных.

- [x] **UX-106. Nationality dropdown: "American" matches "American MP" (Mariana Islands) первым, не "American US".** ✅ FIXED — добавлен priority-sort: точные совпадения по demonym + priority countries (US, GB, TH, AU...) всплывают первыми внутри группы starts-matches.
  - Где: contract sign page Identity / Application modal step 2 / Nationality dropdown.
  - Что: при печатании "American" в searchable dropdown первый match — **American (MP)** Mariana Islands. User скорее всего хочет United States — "American (US)" в списке тоже есть, но ниже. Country code "MP" затем показывается в host-side Guest card ("MP · Tourist Visa") — Marina видит чужой код, не понимает, что это.
  - Как должно: сортировать matches по популярности или приоритизировать full ISO-3166 nation states (US, GB, JP) над dependent territories (MP, GU, AS). Либо показывать полное название "American (United States)" вместо ISO суффикса.

- [ ] **BUG-108. Routing race на host-страницах после login через API.**
  - Где: `/me/host/reservations`, `/me/host/bookings`, `/me/host/finance` сразу после login.
  - Что: после login (если localStorage был установлен напрямую через API), navigate на `/me/host/*` редиректит на `/` (anonymous landing). Только после клика на "Hosting" link в nav и повторного navigate страницы открываются. AuthGuard не дожидается загрузки `/api/me/capabilities` или role check выполняется до hydration auth-стора.
  - Как должно: AuthGuard должен корректно блокировать redirect до завершения capabilities-fetch; либо использовать optimistic auth state на основе localStorage сразу при mount.

### Сессия 2026-05-23 — контракт + оплата (Sarah after approve)

Sarah login → /me/guest/applications → Approved-заявка → "View your stays" → booking detail → Sign contract → Pay flow.

- [ ] **BUG-97. Booking auto-expires до того, как tenant успевает оплатить — полный блокер оплаты.**
  - Где: `/me/guest/bookings/{id}/payments` → Pay flow → sandbox-confirm.
  - Что: Sarah подписала контракт (Agreement signed!), CTA "Pay" для May 2026 открывает gateway-модалку. Все 4 sandbox-confirm запроса (Deposit + 3 monthly) возвращают **400 "Cannot process payment — booking is Expired. If funds were already wired, route them through the re…"**. То есть booking status уже = `Expired` в БД до момента оплаты, и BE отказывается принимать payment, хотя контракт только что подписан и таймер контракта "Expires in 2d 6h" в момент подписи был ещё ОК. Полный финансовый блокер: tenant подписал, но не может заплатить, booking auto-cancel, всё начинать заново.
  - Как должно: подпись контракта (`POST /api/bookings/{id}/contract/sign`) должна переводить booking из `Approved` в `AwaitingPayment` (или подобный non-expiring статус) и/или сбрасывать `expiresAt`. После подписи tenant должен иметь окно для первой оплаты (обычно 24-48 часов отдельно). Сейчас expire-таймер сожрал booking до того, как payment door открылась.
  - Также проверить: возможно booking-таймер запущен от момента approve, а не от submit; и approve был сделан несколько дней назад. Тогда баг — таймер не сбрасывается при approve.

- [ ] **BUG-98. Deposit ฿70,000 — отдельный payment в `/bookings/{id}/payment.payments`, но в UI Payments-tab не показан в Monthly schedule.**
  - Где: `/me/guest/bookings/{id}` → Payments tab.
  - Что: BE возвращает 4 payment-объекта: 1× `Deposit ฿70,000 dueDate 23/05/2026` + 3× `MonthlyRent ฿35,000`. Tenant UI показывает только Monthly schedule (May/June/July) с 3 rent-rows, deposit рендерится только наверху как "Deposit held ฿70,000" — без CTA Pay. Tenant не понимает, как заплатить deposit. Кнопка [Pay] для May 2026 пытается оплатить только monthlyRent 35k. Booking widget обещал "Due on move-in ฿105,000 (1st month + deposit)" — реальность 35k. Несогласованность ожидания и реальности.
  - Как должно: либо первая строка Monthly schedule — combined "First month + deposit · ฿105,000" с одним [Pay] CTA, либо отдельный блок "Deposit · ฿70,000 · [Pay]" над schedule. Сейчас deposit вообще не имеет UI-точки оплаты.

- [ ] **UX-99. Status badge "● Expired" висит на active booking на детальной странице.**
  - Где: `/me/guest/bookings/{id}` (Sarah) и `/me/host/requests/{id}` (Marina).
  - Что: бейдж в правом верхнем углу booking detail header показывает "● Expired" (оранжевый). При этом контракт ещё не подписан был, sign deadline впереди (2d 6h), CTA "Sign now" активен. После подписи — Sign-banner исчез, но бейдж "Expired" всё ещё висит. Видимо бейдж читает `bookingRequest.status = Expired` (после approve переход в expired состояние request, потому что больше "не ждёт ответа"), а не статус самой booking. Семантика слова "Expired" сильно сбивает.
  - Как должно: после approve бейдж должен отражать **booking status** (`Approved` → `AwaitingSignature` → `AwaitingPayment` → `Active`), не request status. Слово "Expired" использовать только для реально истёкших booking.

- [ ] **UX-100. CHECK-IN "Yesterday" в день check-in (booking detail header).**
  - Где: `/me/guest/bookings/{id}` → stat-card CHECK-IN.
  - Что: дата check-in = 23 May 2026, сегодня 23 May 2026. Подпись стат-карды "Yesterday" — некорректно. Должно быть "Today" / "In 0 days" / "Today, check-in".
  - Как должно: формула относительной даты должна возвращать "Today" при `diff === 0`.

- [ ] **UX-101. Identity-секция в подписи контракта дублирует First/Last name из аккаунта.**
  - Где: `/me/guest/bookings/{id}/contract` → Your identity details.
  - Что: First name и Last name — пустые required-поля с placeholder "As on passport". Tenant ввёл их при регистрации (Sarah Chen). Они также фигурируют в Application-modal step 2, где Sarah уже вводила nationality / passport — но это не сохранилось. Пользователю приходится вводить имя ещё раз (плюс DOB).
  - Как должно: First/Last name предзаполнить из `user.profile.firstName/lastName` с возможностью редактирования (если на паспорте написано иначе). DOB и passport — единственные новые поля. Также: passport number и Nationality, введённые в Application-modal step 2, должны сохраняться в profile.passportDraft и переиспользоваться здесь.

### Verify-прогон #2 (2026-05-23, финальный)

| ID | Verify #2 |
|----|-----------|
| BUG-90 deposit cross-side | ✅ HOST-SIDE FIXED — `/api/me/host/booking-requests/{id}` возвращает `depositAmount: 70000`, UI на `/me/host/requests/{id}` теперь рендерит "Refundable deposit ฿70,000" корректно. **⚠️ TENANT-SIDE всё ещё открыт**: `/api/me/guest/applications/{id}` НЕ содержит `depositAmount` (см. response payload — только `monthlyRate, durationMonths, listingId, bookingId, status`); UI на `/me/guest/applications/{id}` рендерит "Refundable deposit ฿35,000" — фронт-фолбек на monthlyRate. Нужен второй проход BE: добавить `DepositAmount` в `ApplicationDto` (по аналогии с `BookingRequestSummaryDto`) |
| UX-91 дубль Request to Book | ⏳ не проверял повторно |
| UX-92 native date inputs | ⏳ не проверял повторно |
| UX-93 Visa Exempt подсвечен | ⏳ не проверял повторно |
| UX-94 Afghan подсвечен | ⏳ не проверял повторно |
| BUG-95 broken-image placeholder | ✅ CLOSED — не баг, артефакт тестовых данных |
| BUG-96 Lockbox vs Key box | ⏳ не проверял повторно |

### Verify-прогон после фиксов (2026-05-23, поздний)

| ID | Что | Verify-статус |
|----|-----|----------------|
| BUG-90 deposit cross-side mismatch | tenant ฿70k, host ฿35k | ❌ NOT FIXED — стало **хуже**: теперь и Sarah, и Marina видят ฿35k. См. BE-23 ниже — корень: `/api/me/guest/applications/{id}` не содержит depositAmount вообще, фронт fallback-ит на monthlyRate; `/api/bookings/{id}` возвращает depositAmount=70000 корректно, но host-detail mapper читает не то поле |
| UX-91 дубль Request to Book (1 невидимая) | первый ref невидим | ⏳ не проверял повторно |
| UX-92 native date inputs Passport/Last entry | UX-trap | ⏳ не проверял повторно |
| UX-93 Visa Exempt подсвечен зелёным | preselected look | ⏳ не проверял повторно |
| UX-94 Afghan подсвечен зелёным в Nationality | preselected look | ⏳ не проверял повторно |
| BUG-95 broken-image placeholder с filename | "droom.jpg" на зелёной заливке | ❌ NOT FIXED — marketplace по-прежнему показывает "Cozy 1-bed in Nimman, Chiang Mai" с зелёной заливкой и текстом "droom.jpg", и "Test Studio Nimman" с синей заливкой |
| BUG-96 Lockbox vs Key box terminology | editor saves Lockbox, marketplace shows Key box | ⏳ не проверял повторно |

- [x] **BUG-90. Refundable deposit рассогласован между сторонами: tenant видит ฿70,000, host видит ฿35,000.** — ✅ FIXED: `BookingRequestSummaryDto` не имел поля `DepositAmount` → фронт хоста вычислял депозит как fallback от rent. Добавлен `DepositAmount = r.Listing?.DepositAmount ?? 0` в маппер `MapToSummaryDto`.
  - Где: tenant booking widget + "Request sent!" confirmation **и** host `/me/host/requests/{id}` детальная карточка.
  - Что: Marina при создании объекта ввела `Security deposit (THB) = 70,000`. Tenant в booking widget видит "Refundable deposit ฿70,000 / held securely by Siamo" и в финальном confirmation "Request sent!" — тоже ฿70,000. Но когда Marina открывает входящую заявку в `/me/host/requests/{id}`, в правой панели Reservation details указано "Refundable deposit ฿35,000 / held securely by Siamo". То есть один и тот же `BookingDto` рендерится двум сторонам с разными значениями. Это критично: при подписании контракта/возврате — кто прав? Если BE отдаёт обе суммы, то фронт берёт разные поля.
  - Как должно: одна сумма deposit во всех отображениях (Request to Book widget = Request sent confirmation = host detail = contract = invoice). Проверить мapping `BookingDto.depositAmount` vs `rentAmount` на host-стороне (старый BUG-40 был в reverse — widget ฿35k вместо ฿70k). Зафиксировать в BACKEND_ISSUES.md если бэк отдаёт `depositAmount` неверно для host-роли.

- [ ] **UX-91. "Request to Book" — две одинаковые кнопки на странице, верхняя невидима, клик впустую.**
  - Где: marketplace listing detail `/listings/{id}`.
  - Что: `find` возвращает 2 кнопки "Request to Book" с одинаковым label. Первая (booking widget header) — `visible: false`, вторая (booking widget footer/duplicate) — visible. Если клик попадает в первую (например, при keyboard tab или programmatic test), ничего не происходит. Для реального пользователя это не блокер (он видит только visible кнопку), но это сигнал, что один из widget-экземпляров рендерится скрытым — лишний DOM-узел.
  - Как должно: рендерить один экземпляр booking widget; убрать дубль из DOM (либо `display:none` контейнер не имеет интерактивных кнопок).

- [ ] **UX-92. Native `<input type="date">` в Booking modal — Passport expiry и Last entry date.**
  - Где: модалка Request to Book, step 2 "Your details".
  - Что: оба поля даты — нативные browser-controls с placeholder `DD/MM/YYYY` без иконки календаря, без визуального разделения дня/месяца/года, без подсказки формата. На Mac Safari/Firefox/Chrome выглядят по-разному; кому-то откроется picker, кому-то нет. Тот же UX-trap, что уже зафиксирован для Move-in date в publish-модалке.
  - Как должно: кастомный date-picker (shadcn/ui Calendar или подобный) с явным form-mask + иконкой; единый стиль с остальными контролами.

- [ ] **UX-93. Visa Exempt предвыбран зелёным цветом в Visa type dropdown.**
  - Где: модалка Request to Book, step 2 "Your details", dropdown Visa type.
  - Что: при открытии dropdown первая опция "Visa Exempt" подсвечена зелёным фоном — выглядит как selected, хотя реально ничего не выбрано (combobox остаётся "Select visa type"). Тот же паттерн, что UX-82 (Phuket в City dropdown). Холодный пользователь думает "уже выбрано → не нажимать".
  - Как должно: первая опция в нейтральном цвете до фактического hover/click; selected-state применять только после реального выбора.

- [ ] **UX-94. Nationality dropdown — первая опция "Afghan" подсвечена тем же зелёным.**
  - Где: модалка Request to Book, step 2 "Your details", searchable dropdown Nationality.
  - Что: identical pattern с UX-93/UX-82 — Afghan (первый в списке) с зелёным фоном при открытии. Здесь searchable, что хорошо, но default-highlight на первом item читается как preselected.
  - Как должно: убрать default-зелёную подсветку первого item до взаимодействия. Зелёный — реакция на user action.

- [x] **BUG-95. ~~Карточки на marketplace показывают placeholder с именем файла на сплошной цветной заливке.~~** — CLOSED (2026-05-23): не баг, это артефакт тестовых данных (старые seed-записи без R2-фото). На реальных listings с загруженными фото поведение корректное.

- [ ] **BUG-96. Terminology mismatch: editor сохраняет "Lockbox", marketplace показывает "Key box".**
  - Где: marketplace listing detail `/listings/{id}`, секция CHECK-IN.
  - Что: Marina выбрала Check-in method = "Lockbox" в редакторе. На detail-page для tenant это поле помечено как "Key box". Если это просто localization mapping (Lockbox → Key box) — оно нигде не объяснено и переводит инструкции из чек-ина по-разному. Tenant и host говорят разными словами об одной и той же вещи.
  - Как должно: единый термин на обеих сторонах. Если есть причина переименования для marketplace (более общее слово) — оставить "Lockbox" в обоих, или ввести нормализацию на BE.

---

## Что НЕ смогла проверить из автоматизации
- Загрузка фото паспорта (3 страницы) — нет файлов в session-папке. _(пользователь загрузит сам по запросу — как делал с фотографиями объекта.)_
- Чат tenant ↔ host.

---

## Гипотезы к проверке (running notes из прогона)

- [ ] **H-01.** Что видит лендлорд в `/me/host/requests` после того как Sarah подписала контракт но ещё **не** оплатила? Статус меняется на "Awaiting payment"? Появляется ли уведомление?
- [ ] **H-02.** Что произойдёт с заявкой Sarah, если она не оплатит до конца "Expires in 2d 23h" — auto-cancel? Refund deposit? Освобождается ли календарь для других тенантов?
- [ ] **H-03.** Если host жмёт Reject — приходит ли тенанту уведомление, видит ли он причину, может ли ответить?
- [ ] **H-04.** Что показывается тенанту в `My applications`, если хост проигнорировал заявку и она auto-expire-нулась через 3 дня? Какое сообщение?
- [ ] **H-05.** Что произойдёт, если **два** тенанта подадут заявку на одни даты, и хост approve-нет обоих? Календарь конфликтует, оба видят "approved"?
- [ ] **H-06.** Скрывается ли листинг из marketplace, когда у него active confirmed reservation? Или остаётся видимым?
- [ ] **H-07.** Что если попытаться забронировать листинг на даты, пересекающиеся с уже approved заявкой?
- [ ] **H-08.** Cancellation policy = Moderate. Что увидит Sarah, если попытается отменить за 7 дней до check-in? За 30 дней?
- [ ] **H-09.** Early termination clause: пеня 1 месяц. Что видит Sarah если кликнет "Cancel" после check-in? Понятна ли сумма штрафа сразу?
- [ ] **H-10.** Что в "Finance" на стороне Marina после первой оплаты Sarah? Видны ли deposit + first month отдельно? Каков расчёт комиссии Siamo?
- [ ] **H-11.** Может ли host скрыть/снять с публикации листинг, у которого есть active reservation?
- [ ] **H-12.** Sign agreement — "Both signatures are required". А где подпись со стороны хоста? Кода Marina её ставит? Что видит до этого момента tenant?
- [ ] **H-13.** Что показывается на детальной странице listing для тенанта, у которого уже есть active booking на этот объект (anti-double-booking guard)?
- [ ] **H-14.** Что произойдёт если Sarah попробует завести вторую заявку пока первая в Pending — UI блокирует или разрешает дублирование?
- [ ] **H-15.** Refundable deposit "held securely by Siamo" — как реально возвращается тенанту? Видна ли механика возврата заранее (до подписания)?
- [ ] **H-16.** TM30 filing — host обязан подать на иностранца. Где в UI хоста CTA "File TM30" / напоминание / статус?
- [ ] **H-17.** Что отображается в `My stays` (Past вкладка) — пустая? Каков layout прошлых пребываний?
- [ ] **H-18.** Email-уведомления на каждом этапе (booking submitted, approved, signed, paid) — приходят ли в действительности? Содержание понятное?
- [ ] **H-19.** Co-residents "1 person · Just you" — что если добавить co-resident? Где этот UI? Как они получают доступ к информации?
- [ ] **H-20.** Issues tab в booking detail — что туда писать? Это репорт хосту? Или Siamo support? Тенант не понимает разницу.

---

## Статус исправлений (2026-05-24)

### ✅ Исправлено на фронте

| ID | Что | Файл |
|----|-----|------|
| BUG-32 | Карточка показывала generic title вместо настоящего | `listings-page.tsx` |
| UX-39 | Два заголовка подряд на детальной странице | `listing-detail-page.tsx` |
| UX-41 | "property manager" → "host" в booking modal и детали | `booking-request-modal.tsx`, `listing-detail-page.tsx` |
| UX-42 | "Request received!" / "Request sent!" — унифицировано | `booking-request-modal.tsx` |
| UX-43 | Placeholder "Suvarnabhumi" → "e.g. Chiang Mai" | `booking-request-modal.tsx`, `contract-sign-page.tsx`, `passport-step.tsx`, `detail-page.tsx` |
| UX-44 | Passport/visa/TM30 скрыты для тайских граждан | `booking-request-modal.tsx` (уже было) |
| UX-50 | Filter chips: outline (inactive) vs filled (active) | `listings-page.tsx` |
| UX-52 | Title обрезается с `…` + tooltip | `listings-page.tsx` |
| UX-53 | Зелёный кружок "Verified by Siamo" всегда виден | `listing-detail-page.tsx` |
| UX-55 | Метки слайдера кликабельны как пресеты | `booking-widget.tsx` |
| BUG-57 | Radix Select z-index под Dialog overlay | `booking-request-modal.tsx` |
| UX-63 | Объяснение почему оплата заблокирована до подписи | `detail-page.tsx` |
| UX-64 | "Hosted by your host" → "Hosted by the host" | `detail-page.tsx` |
| BUG-69 | Убран PromptPay таб — только Card | `gateway-overlay.tsx` |
| BUG-103 | Login form autofill — добавлены `name` + `autoComplete` атрибуты | `login.tsx` |
| BUG-104 | Finance Total revenue не включал Deposit — теперь включает | `finance/page.tsx` |
| UX-105 | Revenue chart показывал только Rent — добавлен столбец Deposit (held) | `finance/page.tsx` |
| UX-106 | Nationality dropdown: US теперь выше MP при поиске "American" | `nationality-input.tsx` |

### ✅ Исправлено дополнительно (2026-05-23)

| ID | Что | Фикс |
|----|-----|------|
| BUG-40 | Deposit = monthRate в виджете | `depositAmount` добавлен в тип + props; API уже возвращал правильно |
| BUG-48 | Cover-photo серые в карточках | убран `loading="lazy"` → 12/12 loaded |
| BUG-54 | Move-in date ограничен 30 днями | лимит → 6 месяцев |

### ✅ Закрыты как артефакты первого expired booking (2026-05-24)

| ID | Что |
|----|-----|
| UX-99 | Expired badge на активном booking |
| UX-100 | CHECK-IN "Yesterday" |
| BUG-98 | Deposit отсутствует в payment schedule |

### ⏳ Требует бэкенда (добавлено в BACKEND_ISSUES.md)

| ID | BE# | Что |
|----|-----|-----|
| BUG-40 | BE-16 | ~~Deposit в widget = rentAmount~~ → **CLOSED**: API корректен, баг был фронтовый |
| BUG-62 | BE-18 | "All paid" показывается до оплаты → ✅ FIXED |
| UX-64 | BE-15 | BookingDto нет landlordName → ✅ FIXED |
| UX-66 | BE-17 | Email тенанта виден host до confirmed booking → ✅ FIXED |
| BUG-56a | BE-19 | Оплата всех месяцев сразу не блокируется → ✅ FIXED |
| BUG-47/48 | — | Cover photo: frontend fix применён (lazy → eager) |
| BUG-37 | BE-22 | ✅ FIXED — `OwnerId` добавлен в `MarketplaceListingDto`; фронтовый guard активен |
| BUG-72 | BE-20 | ✅ FIXED — фильтр `DueDate` → `PaidAt` в finance summary |
| UX-102 | BE-27 | "Currently living" на expired booking — нужен переход BookingRequest.Status → Expired |
| BUG-108 | BE-28 | AuthGuard race — capabilities endpoint должен быть быстрым и кешированным |

### 🔄 Нужна браузерная верификация

| ID | Что |
|----|-----|
| BUG-38 | Cover фото отсутствует в галерее детальной страницы |
| UX-59 | Visa данные запрашиваются дважды (booking + contract) — нужно поле pre-fill |
| UX-61 | Passport dropzone без drag&drop/camera подсказки |

---

## Round 2026-05-24 — verification + новые находки

### ✅ Verified FIXED

| ID | Что | Проверка |
|----|-----|----------|
| BUG-122 | Theme toggle (light/dark) | Click → `pmc_theme={state:{theme:'light'}}` → useEffect через ~1с снимает класс `dark` с html, фон становится белым. Эффект асинхронный |
| BUG-125 | Cover photo на новых listings | Все 8 карточек `/listings` грузят реальные cover-фото с CDN, никаких серых блоков для непустых listings |
| UX-120 | TM-30 Upload PDF — серая ссылка в guest card | **Re-arch**: тенант больше не грузит TM-30 (это закон Таиланда: filing — обязанность хоста). Тенанту показан Badge `Pending`/`Filed`, при Filed — кликабельная ссылка `PDF`. Маленькая серая Upload-ссылка убрана |
| UX-121 | "Message host" CTA не открывал чат, скроллил к телефону | **Fixed via removal**: deceptive CTA убрана. Вместо неё блок «Contact your host» — Phone с copy-кнопкой + явные channel-chips (`🟢 WhatsApp` / `🟩 LINE` / Telegram), каждый — рабочий `tel:`/`https://wa.me/…` link. Internal chat по-прежнему отсутствует, но UI больше не лжёт пользователю |

### ⚠️ Partial / новые находки

- [ ] **UX-126. Language switcher работает на уровне i18n, но большинство UI-текстов хардкод English.**
  - Где: всё приложение (`/listings` header, search-popover, booking detail, фильтры, marketing-копирайт).
  - Что: клик по `EN/TH/RU` — выполняет `i18n.changeLanguage('th')`, `pmc_lang=th` персистится в `localStorage`, чип TH подсвечивается. **Но**: `Stay in Thailand`, `Where to?`, `Move in`, `Duration`, `1 month`, `Short stay`, `My stays`, `Browse rentals`, `Need to leave early?`, `Request early exit`, `Contact your host` — всё английское после переключения.
  - Как должно: либо все эти строки прогнать через `t()` в `i18n/en.ts` + перевести в `th.ts`/`ru.ts`, либо честно убрать чипы TH/RU до тех пор, пока coverage не дотянут до ~90%.
  - Почему важно: для тайского хоста и тенанта-фаранга английский — friction. Кнопка «переключи язык», которая ничего не переключает — хуже, чем её отсутствие.

- [ ] **BUG-127. Pre-checkin cancellation: ฿35,000 penalty без disclosure на marketplace.**
  - Где: booking detail `/me/guest/bookings/:id` (статус `Confirmed`, до check-in) → «Need to leave early?» → modal «Request early exit» показывает `Early exit penalty ฿35,000 · 1 month rent · applied upon host confirmation`.
  - Что: на marketplace `/listings/:id` секция «Cancellation policy — Two windows» обещает: `Grace period · First 2 weeks · Leave any time — full deposit returned`. Это подразумевает, что у тенанта есть 2 недели на безболезненный отказ. Но Grace применяется только ПОСЛЕ move-in (формулировка «within 14 days of moving in» в копии). До move-in уходит ฿35k penalty.
  - Как должно: либо marketplace явно дисклоузит «Pre-check-in cancellation = 1 month penalty», либо политика реально позволяет грейс **до** move-in. Сейчас тенант видит «leave any time» при выборе жилья и «฿35,000 penalty» при попытке отменить — это нарушенное обещание.
  - Почему важно: тенант принимает решение о бронировании на основании marketplace promise. Несоответствие на этапе отмены — прямой репутационный риск + потенциальный спор о возврате.

## Round 11 — Real payment + co-resident gate 2026-05-26

- [ ] **✅ Co-resident gate visualy + functionally solid (BUG-135 regression fixed).**
  - Где: Mike Park's booking detail (Payment pending state) `/me/guest/bookings/e49444b2-...`.
  - Что отлично:
    - Big orange banner «Sign your rental agreement · Both signatures are required... If unsigned by the deadline, this booking will be automatically cancelled. · Expires in 1d 8h» countdown
    - «Who will be living in the unit?» — 2 radio cards «Just me / Me + others»
    - **Just me selected** → CTA `Sign agreement →` green active
    - **Me + others selected** → inline warning «Add at least one co-resident before signing — all occupants must be registered.» + «+ Add co-resident» link + yellow CTA `Add co-resident to continue` (blocked state)
  - User's regression полностью restored.

- [ ] **UX-250 minor. After picking «Me + others» — «Just me» card UI остаётся highlighted (stale visual state).**
  - Где: same screen.
  - Что: оба options имеют активный border одновременно — visually confusing. Функционально только последний selected учитывается (warning показывается под Me + others).
  - Как должно: только одна card highlighted в один момент.

- [ ] **✅ Payment pending копия очень понятная.**
  - Header: `Payment pending` orange badge явный.
  - 4 cards: Check-in date / Next payment ฿X (Before signing deadline) / Co-residents / Deposit.
  - Banner: «Sign your rental agreement» с deadline countdown.
  - Внизу: «Complete the steps to confirm your booking · Sign the agreement and pay the initial amount — your booking activates as soon as both are done.»
  - Tabs: «Stay / Payments 0/2 / Property / Co-residents 1»

## Round 9 — Adversarial sweep 2026-05-26

> Прогон по новому СЛОЮ 4 — adversarial input на каждое поле. Цель: ловить то, что я раньше пропустил из-за screenshot-bias.

### ✅ Frontend fixes verified

- **Additional rules .trim() preserves spaces** — `"abc "` → stays `"abc "`. `"  multiple  spaces  "` сохраняется без crunch. ✓
- **Save property disabled visual** — `opacity: 0.5, cursor: default` на disabled state. BUG-188 confirmed fix. ✓
- **Pet picker на non-pet-friendly listing**: «I have pets» → Continue **disabled** + inline warning «This listing does not accept pets. Please select "No pets" to continue, or search for a pet-friendly property.» ✓ user's bug fixed.
- **Co-resident gate before Sign CTA**: `soloAnswer` state + `gateCleared = alone || (withOthers && coResidents.length > 0)` + `Sign disabled={!gateCleared}` ✓ user's regression restored.

### 🚨 New finds

- [x] **BUG-242 caught real-time. Build error: `coResidents` redeclared at line 326 + line 437 (later 426) in `detail-page.tsx`**.
  - Vite HMR overlay surfaced when navigating booking detail. Tenant booking detail page crashes for этого commit.
  - Frontend fixed in-session — duplicate gone after re-grep.

- [ ] **BUG-243. Area input в Property type & size: HTML5 `min=1 max=5000` не enforce на input event.**
  - Где: Property wizard → Property type & size → Area (m²).
  - Что: `setNative(-50)` сохраняет в DOM `-50`. `setNative(99999999)` сохраняет 99999999. HTML5 min/max validate на form-submit, не на blur. UI не показывает ошибки.
  - Как должно: на blur — clamp в `[min, max]` или показать inline error «Area must be between 1 and 5000 m²». Иначе backend получит plus huge or negative.

- [ ] **UX-244 (edge). Co-resident gate enforced на Sign-button в detail-page, но не в самой `contract-sign-page.tsx`.**
  - Где: deep-link `/me/guest/bookings/:id/contract`.
  - Что: gate проверяется только перед click «Sign». Если тенант идёт по прямой ссылке — обходит вопрос «будете жить один?».
  - Как должно: добавить `gateCleared` check внутри `contract-sign-page.tsx` тоже — redirect назад на booking detail если не cleared.

## ⚠️ QA-окружение: notes

- **Тикеты сейчас в системе быть не должны** (по слову владельца, 2026-05-24). Если в UI вижу `Tickets · 0`, пустой Issues tab, или отсутствие global tickets list — **не баг**, ожидаемое состояние. BUG-142 / UX-143 / UX-144 остаются валидны как описание паттернов tickets-flow, но воспроизводить их сейчас нельзя — никаких реальных тикетов в DB.

## Round 8 — Continue sweep 2026-05-24

- [ ] **🚨 BUG-241. Нет Share button на listing detail + нет Open Graph meta tags.**
  - Где: `/listings/:id` для anonymous и логированных.
  - Что: tenant хочет поделиться объявлением с partner/family через LINE/WhatsApp — нет кнопки «Share». Если копирует URL руками и скидывает — в чате не появится rich preview (фото/title/price), потому что `<meta property="og:*">` отсутствуют. Page title - generic «Siamo — Thailand Rentals», не «Sunny 1-bed near Nimman · ฿35,000/mo · Siamo».
  - Как должно:
    1. Share button (top-right header или рядом с heart): copy-to-clipboard, native `navigator.share()` на mobile, dropdown с LINE/WhatsApp/Email/Copy options on desktop.
    2. `<title>`-tag dynamic per listing.
    3. OG meta tags: `og:title`, `og:description`, `og:image` (cover photo), `og:url`, `twitter:card`. Backend SSR или client-side react-helmet.
  - Почему важно: marketplace без shareable links мёртв в виральности.



- [ ] **🚨 BUG-235. Search bar landing + marketplace — все controls decorative.**
  - Где: `/` landing hero + `/listings` top bar.
  - Что: 4 фасада «Where to? / Stays & Spaces / Flexible / Any length» + большая green Search кнопка. На клик:
    - **Where** → открывается dropdown «Anywhere · Browse all cities / Chiang Mai · 12 places» (но количество врёт — реально 8 listings).
    - **Move in** → ✅ настоящий date-picker (This month / Next month / In 2/3 months + calendar + «I'm flexible»).
    - **Duration** → quick picks 1/3/6/12 months + Search button.
    - **Search button** → URL `/listings` без параметров. Catalog не отфильтрован. Выбор «Chiang Mai · 6 months · Jun 15» **игнорируется**.
  - Top hero fields после выбора всё ещё показывают default «Where to? / Flexible / Any length» — selection не сохраняется визуально.
  - Как должно: Search → `/listings?city=2&moveIn=2026-06-15&durationMonths=6` → backend фильтрует. Top fields отражают selected values («Chiang Mai · Jun 15 · 6 months»).
  - **Severity:** Это **product-blocker**. Главный entry-point продукта (search-by-city-and-dates) не работает. Тенант видит фасад большого функционала — наклик ничего не происходит.

- [ ] **UX-236. «Chiang Mai · 12 places» counter врёт (реально 8).**
  - Где: Where dropdown в search.
  - Что: `12 places` хардкод или вычисление по другому источнику. Фильтрация catalog возвращает 8.
  - Как должно: либо живой counter from API (`/api/marketplace/cities` с `activeListingsCount`), либо убрать.

- [ ] **UX-237. Hero search-bar selection не показывается визуально на top после выбора.**
  - Где: hero на landing + listings.
  - Что: выбрал Duration 6m → top-bar поле всё ещё «Any length».
  - Как должно: после выбора — поле показывает actual value жирным. Иначе пользователь не понимает что выбрал.

- [ ] **UX-238. Зелёный `droom.jpg` placeholder cover-фото возвращается между перерисовками.**
  - Где: `/listings` card для Cozy 1-bed in Nimman.
  - Что: то реальное interior фото, то зелёный test-placeholder. Inconsistent rendering — может быть race в SWR caching, может cycle через media[0]/media[1].
  - Как должно: deterministic cover. И BUG-177 — отдельно убрать test images через quality gate.

## Beauty sweep — Tenant cabinet 2026-05-24

> Общий вердикт: tenant cabinet **выглядит как admin panel**, не как «joyful place». 3 thin страницы, пустые экраны на 70% площади, копия холодная, нет персонализации, нет dashboard, нет messages, нет recent activity. Tenant заходит → не чувствует welcome / pride / progress.

- [ ] **UX-217. Нет Tenant Dashboard / Home / Inbox.**
  - Где: после login → /me/guest/bookings (My stays) по умолчанию.
  - Что: Tenant имеет 3 thin страницы (Applications / My stays / Profile) — каждая single-purpose. Нет общей home-страницы с overview: «Welcome back, Sarah · 1 active stay · 22 days to check-in · No unread messages · 3 favorites saved · Upcoming: Sunny 1-bed Jun 15».
  - Как должно: `/me/guest/` (или `/me/guest/home`) — landing page с personalized greeting, summary cards, recent activity timeline, quick actions, host messages preview.

- [ ] **UX-218. Sarah's «My applications» при пустой странице — 70% пустоты, иконка маленькая, копия сухая.**
  - Где: `/me/guest/applications` empty state.
  - Что: «No applications yet · When you apply for a rental, your applications will appear here» + small icon. На странице 70% пустого пространства.
  - Как должно: hero illustration (модерный SVG, не маленькая иконка), «Find your next home in Chiang Mai · Browse 12 verified rentals», quick category buttons (Apartment / Villa / Co-living), recently viewed listings preview (saved in localStorage). Иначе — это «empty database row», не emotional moment.

- [ ] **UX-219. Status pills (Email/Phone/Passport) в Profile — non-clickable, нет CTA.**
  - Где: Profile sidebar.
  - Что: `Phone ✗` красный — Sarah видит «у меня нет phone» — нет clickable action.
  - Как должно: pill → click → focus on relevant section + scroll. Или показать дополнительную CTA «Add phone →».

- [ ] **UX-220. Avatar — статичный SC placeholder. Нет upload.**
  - Где: Profile.
  - Что: на marketplace platforms аватар — first thing personalize. Sarah видит «SC» monogram навсегда.
  - Как должно: click avatar → upload photo. Crop circle. Преимущество — host видит её фото при review application.

- [ ] **UX-221. Документ-vault показывает только TM-30 receipts, но не signed contract.**
  - Где: `/me/profile?s=documents`.
  - Что: «1 file» — но какой? Если это contract — нужно показать «Sunny 1-bed agreement · signed 23 May 2026 · Download». Сейчас непонятно, что в vault'е.
  - Как должно: list documents с typed-icons, filename, date, download CTA.

- [ ] **UX-222. Нет «Messages» / chat с host'ом — основной communication-pattern marketplace отсутствует.**
  - Где: tenant cabinet.
  - Что: marketplace без internal messaging = принудительно WhatsApp/Phone. Это удобно для Thai market но нарушает trust/audit-trail. Tenant хочет message host (vs phone-call) — нельзя.
  - Как должно: `/me/guest/messages` или Inbox-tab в nav. Even MVP — text-only messages по booking-thread.

- [ ] **UX-223. «Renting · 1» counter в header — но page может быть empty.**
  - Где: nav badge.
  - Что: counter не соответствует listed content (backend regression). Тенант не понимает: «у меня 1 stay но page пустой?».
  - Как должно: badge accurately reflects content. If empty — show 0 badge или скрыть совсем.

## Round 6 verify+sweep 2026-05-24

- [ ] **🚨 BUG-210. Landing page категории VEHICLES/EQUIPMENT/SPACES/SERVICES/EXPERIENCES — decorative divs, не buttons.**
  - Где: `/` landing page hero — 6 category tabs под Search.
  - Что: визуально оформлены как tab nav с иконками и underline под STAYS. Клик на VEHICLES/EXPERIENCES/etc. — **никакого эффекта**. URL не меняется, content не фильтруется, не существуют как `<button>` или `<a>` (JS query of these labels returns empty).
  - Как должно: либо implement filtering (даже если пока только STAYS реально работает — показывать «Coming soon» tooltip на других), либо убрать категории до launch.
  - Почему важно: marketing-promise. Анон-посетитель видит 6 категорий, кликает «VEHICLES» — ничего. Уходит думая «сайт сломан / не доделан».

- [ ] **BUG-211. Favorites heart saves в localStorage `pmc_wishlist`, но `/wishlist` и `/favorites` redirect на `/`.**
  - Где: marketplace card heart icon.
  - Что: click heart → красное сердечко появляется, `pmc_wishlist=["2568e4b4-..."]` в localStorage. Но нет UI для просмотра favorites — обе route redirect на landing. Tenant сохранил жильё → не может его найти.
  - Как должно: `/me/guest/favorites` (или `/wishlist`) → grid карточек saved listings + remove-button.
  - Почему важно: основной discover-pattern marketplace — saved properties. Сейчас feature наполовину готов: client-side save без read.

- [ ] **UX-212. ★ 4.9 на каждой listing-card — все одинаковые → fake / нет реальных reviews.**
  - Где: `/listings`.
  - Что: каждая карточка показывает «★ 4.9». Все listings новые (Verify4 Property + Sunny + Cozy ...), real reviews быть не должно. Цифра — placeholder.
  - Как должно: для new listings показывать «★ New» (как было), либо честно «no reviews yet». Fake 4.9 рейтинг подрывает доверие (если все 4.9 — никто не настоящий).

- [ ] **UX-214. Listing detail НЕ имеет host card — нет «Hosted by Marina Sokolova».**
  - Где: `/listings/:id` для anonymous + tenant.
  - Что: страница detail про жильё, цены, House Rules, Cancellation, How it works — но **нет блока «Hosted by»**. На marketplace patterns (Airbnb / Booking.com) — host card с avatar, name, response rate, joined date, # listings — central trust element.
  - Как должно: блок «Hosted by Marina Sokolova · Member since 2024 · Responds within 24h · 1 listing · ★ 4.9» с CTA «Message host».

- [ ] **UX-215. Listing detail НЕ имеет «Similar properties» / «Other listings by this host».**
  - Где: тот же detail page.
  - Что: tenant дочитал страницу до конца — нет рекомендаций. Конец-страницы = dead-end. Marketplace pattern требует «You might also like».
  - Как должно: «3+ similar listings» grid внизу.

- [ ] **UX-213. «Three reasons it's a guest favourite» секция на listing detail — показывает 1 карточку.**
  - Где: `/listings/:id` → WHY THIS PLACE STANDS OUT.
  - Что: заголовок обещает «Three reasons» но видна только «Verified property» — 1/3. Либо secret 2 карточки не подгружены, либо copy лжёт.
  - Как должно: либо честно 3 reasons (Verified + 2 другие), либо изменить copy «What makes this place special».

## Onboarding sweep 2026-05-24

- [ ] **UX-205. `/me/onboarding/passport` — это просто Profile form без onboarding-обвязки.**
  - Где: `/me/onboarding/passport`.
  - Что: page рендерит ту же форму, что и `/me/profile?s=personal`. Без welcome-копии, без stepper «Step 1 of 3», без skip-CTA, без progress-bar, без «You can come back to this later».
  - Как должно: onboarding shell должен включать (1) welcome copy «Almost there, [Name] — last step before you can book», (2) progress «1 of 3», (3) "I'll do this later" skip, (4) celebratory transition в конце.

- [ ] **UX-206. Marina (landlord) попадает на `/me/onboarding/passport` по navigation — но ей не нужен passport для contracts (она host).**
  - Где: same URL.
  - Что: landlord-сайд не требует tenant passport. Если onboarding-passport показывается для всех — это путаница для host'ов.
  - Как должно: role-guard / context-aware onboarding — для landlord показывать «Add your first listing» onboarding, для tenant — passport.

## Register/Login forms sweep 2026-05-24

- [ ] **✅ POSITIVE PATTERN. Register form — отличная inline-валидация.**
  - Где: `/register`.
  - Что отлично: password requirements list (×/✓) live-обновляется при typing («At least 8 characters», «One uppercase letter», «One lowercase letter», «One number»). Invalid email → red border + «Enter a valid email». Password too short → red border + «Password must be at least 8 characters». Submit перерисовывает форму с ошибками в правильных полях. Eye-toggle для password. Cleanlayout. Copy «one account for both» снимает confusion.
  - Use as референс для всех валидирующих форм.

- [ ] **UX-198. Register email placeholder `testtenant@siamo.test` — пахнет internal QA data.**
  - Где: `/register` email input.
  - Что: placeholder `testtenant@siamo.test` — выглядит как dev test fixture. Real user видит и думает «это для тестировщиков».
  - Как должно: `you@example.com` или `name@email.com`.

- [ ] **UX-199. Register: Create account button disabled but visually active — BUG-180 pattern.**
  - Где: `/register` Create account CTA до заполнения.
  - Что: green-filled button looks tappable, но disabled пока не выполнены 4 password requirements + terms checkbox + valid email + names.
  - Как должно: visual disabled state (opacity-50, cursor not-allowed).

- [ ] **UX-200. Нет SSO (LINE / Google / Facebook).**
  - Где: `/register` + `/login`.
  - Что: только email + password. Для Thailand-targeted продукта LINE = de-facto messenger; для фарангов Google/Facebook стандарт.
  - Как должно: 3 SSO кнопки сверху form: «Continue with LINE / Google / Facebook».

- [ ] **🚨 BUG-202. Login form: НЕТ «Forgot password?» link.**
  - Где: `/login`.
  - Что: только Email/Password/Sign in. После «Invalid email or password.» error — нет recovery CTA. Пользователь забыл пароль = stuck. На financial платформе это блокер.
  - Как должно: под password field — «Forgot password? Reset →» link, ведёт на `/forgot-password` (= request email с reset link).
  - **Связано с BUG-165** (Security секция без change password) — оба указывают на полное отсутствие password lifecycle UI.

- [ ] **UX-203. Login form: нет eye-toggle на password (есть на Register).**
  - Где: `/login` Password field.
  - Что: на Register есть eye-icon переключения скрытия. На Login — нет.
  - Как должно: consistency — eye-toggle везде.

- [ ] **UX-204. Login form: нет «Remember me» checkbox.**
  - Где: `/login`.
  - Что: каждый раз re-login после session expire — раздражает (на мобиле особенно).
  - Как должно: «Stay signed in for 30 days» toggle.

- [ ] **UX-201. No phone field at registration.**
  - Где: `/register`.
  - Что: phone не запрашивается. Нужен потом для contracts/contact. Тенант regsters → потом тоже идёт в Profile → adds phone. Friction.
  - Как должно: optional phone field at registration с явным «We'll use this only when your host needs to reach you».

## Contract signing + payment overlay 2026-05-24

- [ ] **UX-191. Contract page signed-state — sparse, no host signature, no audit trail, no next CTA.**
  - Где: `/me/guest/bookings/:id/contract` после подписания обеих сторон.
  - Что: показывает «✓ You've already signed this agreement · Signed on 23 May 2026» + Rental agreement summary + View contract PDF link. **Не показывает:**
    - Marina также подписала (statusFullySigned) — нет «✓ Marina Sokolova signed on 23 May 2026»
    - Audit trail (IP, device, timestamp, hash)
    - Payment cross-reference («✓ ฿210,000 received in 6 monthly payments»)
    - Next-step CTA («Back to booking», «View check-in checklist», «Open my stay»)
    - Bottom of page just ends — пустота.
  - Как должно: после подписания — celebratory finalization: «✅ Contract fully executed by both parties · 23 May 2026 · Download for your records · [Open my stay →]».
  - Почему важно: legal binding moment — page обязан выглядеть solid, profession, finished. Сейчас он выглядит как brittle staging-environment.

- [ ] **UX-192. Contract page копия «Review the full agreement before signing» — тенант УЖЕ подписал.**
  - Где: тот же экран.
  - Что: текст под View contract (PDF) всё ещё говорит «before signing». Stateless копия не обновляется по signed-state.
  - Как должно: после подписания — «Keep a copy for your records — required for visa renewals».

- [ ] **✅ POSITIVE PATTERN. Payment Gateway Overlay — `SANDBOX` badge + lock + 2C2P brand + 30s timeout с человечной копией.**
  - Где: `gateway-overlay.tsx`.
  - Что: header «Secure Payment 🔒» + жёлтая `SANDBOX` плашка (test-mode honesty) + название gateway 2C2P + processing state «Please don't close this window» + timeout 30s «We didn't get confirmation in time. Your payment may still go through — check your booking in a minute before retrying.»
  - Это GOLD. Снимает тревогу при крупном money-движении.

## Booking request modal sweep 2026-05-24

- [ ] **🚨 BUG-180. Continue button disabled но визуально active — no indication почему.**
  - Где: `Request to Book` modal, step 1.
  - Что: button «Continue» имеет filled-brand background (выглядит активным), но `disabled: true` пока не выбран pet-pick. Никакого визуального cue (opacity, не-hover, cursor:not-allowed). Тенант кликает — silence, frustration.
  - Как должно: либо disabled-стиль (opacity 50%, cursor not-allowed, no hover), либо inline hint «Select pet option to continue».

- [ ] **UX-181. «Pets are not allowed at this property» — но «No pets» не auto-выбран.**
  - Где: Booking modal step 1, pet picker.
  - Что: красная подсказка прямо сверху pet picker говорит pets disabled. Логичный default — «No pets» pre-selected. Сейчас оба не выбраны → Continue заблокирован.
  - Как должно: если listing.petsAllowed=false → «No pets» selected by default, picker collapsed. Только если listing.petsAllowed=true — picker active.

- [ ] **UX-182. «I have pets» tap-able даже когда pets disallowed — no error preview.**
  - Где: Pets picker.
  - Что: красным написано «not allowed at this property» но обе кнопки visible + clickable. Что произойдёт при tap на `I have pets`? Не сказано.
  - Как должно: либо `I have pets` визуально locked + tooltip «Pets not allowed by this host», либо tap показывает modal «Sorry — this host doesn't accept pets. Try [other pet-friendly listings →]».

- [ ] **UX-183. Booking modal не показывает progress (Step 1 of 3 / 4 / 5).**
  - Где: всё modal.
  - Что: 3 шага (Request → Your details → Confirmation). Без progress bar / stepper тенант не знает, насколько долгим будет flow.
  - Как должно: top stepper `● ○ ○` или `1 of 3`.

- [ ] **UX-184. «Request sent!» modal — Refundable deposit ฿0 для Cozy 1-bed listing.**
  - Где: Success screen после submit.
  - Что: summary показывает `Refundable deposit ฿0 · held securely by Siamo`. Либо хост действительно поставил deposit=0 (необычно), либо backend default. Тенант видит ฿0 и думает «отлично, без депозита!» — но при approve вдруг ฿44k? Inconsistent.
  - Как должно: если deposit=0 → честно показать «No security deposit required». Если не 0 → актуальная сумма + объяснение.

- [ ] **UX-185. «Request sent!» Expect response within 24 hours — но applications/:id показывает Auto-expires 2d 23h (72h).**
  - Где: Success copy vs application detail.
  - Что: «24 hours» vs «3 days» — два числа в одной системе. Какое правда?
  - Как должно: одна цифра везде. Если timeline 72h — pre-modal showcase «Hosts respond within 24 hours on average · request expires after 72h».

- [ ] **UX-186. ✅ «Skip for now» — отличное решение для шага Your details.**
  - Это GOOD UX. Тенант может отправить заявку без passport, заполнить позже — снижает порог. Заметка как positive pattern.

- [ ] **UX-187. ✅ «Pick nationality» CTA — динамический текст по требуемому полю — GOOD UX.**
  - Это GOOD pattern. CTA сразу говорит «что сделать next». Использовать везде.

## Mobile viewport sweep 2026-05-24 (~517px Chrome floor, target 390px iPhone)

- [ ] **UX-175. Marketplace `/listings` mobile: logo «Siamo» clipped, top bar перегружен.**
  - Где: `/listings` на узком viewport.
  - Что: Logo `Siamo` чуть обрезан справа («d»-edge), top bar содержит огромный Search bar + theme + EN/TH/RU + ≡ + avatar — всё borderline overlap. Hosting/Renting toggle скрыты — нет понятного пути в кабинет.
  - Как должно: collapsed search в FAB кнопку → expand on tap; logo фикс; ввести bottom nav (Browse / Stays / Inbox / Profile) для marketplace страниц как на /me/* страницах.

- [ ] **UX-176. Marketplace: bottom nav отсутствует на /listings, есть на /me/*.**
  - Где: /listings (no bottom nav) vs /me/guest/* (bottom nav: Renting / Hosting / Profile).
  - Что: tenant ищет жильё на marketplace — нет быстрого пути в My stays или Applications. После просмотра listing — нужно полное path через top bar.
  - Как должно: bottom nav consistent across all авторизованных pages.

- [ ] **BUG-177. `Cozy 1-bed in Nimman` cover-photo — зелёный блок с текстом «droom.jpg».**
  - Где: `/listings` карточка `Cozy 1-bed in Nimman, Chiang Mai`.
  - Что: cover-image это файл с плашкой «droom.jpg» зелёный фон — placeholder, который хост загрузил как обложку. `img.complete=true, naturalSize=1920x1440` — изображение загружено, но контент сам — это test-placeholder.
  - Как должно: либо контент-модерация (отклонить cover-фото которое не выглядит как жильё), либо ML-классификатор «is this a property photo?» перед публикацией. Сейчас marketplace выглядит unprofessional.

- [ ] **UX-178. Tab nav «Stay / Payments / Property / Co-residents / Issues» на mobile — horizontal scroll.**
  - Где: `/me/guest/bookings/:id` на mobile.
  - Что: tabs выезжают за viewport; scroll-индикатор есть но непонятный — Issues tab спрятан. Тенант не догадается scroll.
  - Как должно: либо tabs wrap, либо collapsed в dropdown «Stay ▼».

- [ ] **UX-179. Mobile: top `≡` menu + bottom `Profile` — два пути к одному, на mobile избыточно.**
  - Где: всё /me/* на mobile.
  - Что: top ≡ открывает Profile/Sign out, bottom Profile открывает Profile page. Дублируется.
  - Как должно: на mobile скрывать top ≡, оставить только bottom Profile.

## UX-пробег 2026-05-24 — холодное чтение кабинетов

### Tenant cabinet (Sarah Chen)

- [ ] **UX-145. `My applications` список — холодный административный вид, контрастирует с эмоциональным marketplace.**
  - Где: `/me/guest/applications`.
  - Что: список заявок — только круглая иконка (часы / галка), title, dates, status badge. Никаких cover-фото. На marketplace тенант смотрит шикарные фото и горит желанием, а здесь — серая table-like разметка. Эмоциональный провал.
  - Как должно: cover-фото 80x80, рядом с title — host name (Marina · joined 2026), price `฿35,000/mo`, status pill, dates. То же мини-summary, что на marketplace card. Тенант чувствует, что заявка — реальная сделка про конкретное жильё, а не строка в БД.

- [x] **UX-146. ✅ FIXED —  Application Approved: копия и UI «as if just approved» вместо актуального состояния.**
  - Где: `/me/guest/applications/4194325e...` (Approved Sarah's app для уже подписанного и оплаченного контракта).
  - Что: banner `Approved · Great news — your reservation request has been approved! The host will be in touch shortly.` Но Sarah уже подписала, заплатила ฿210k, до check-in 22 дня. Эта копия для свежего approve, не для confirmed booking.
  - Как должно: показать timeline `Applied · Approved · Signed · Paid · Active in 22d` с текущим положением. Или просто «View your stay →» вместо повтора marketing-копии.

- [x] **UX-147. ✅ FIXED —  Application Pending — `Auto-expires in 2d 23h` без объяснения и без CTA.**
  - Где: `/me/guest/applications/35348176...` (Pending app на Verify4).
  - Что: банер `Awaiting response · Your request has been sent. The host will typically respond within 24 hours.` + `Auto-expires in 2d 23h`. Конфликт ожиданий: 24h response vs 3d expiry. Что произойдёт при expire? Деньги вернутся (Sarah ничего не платила — но это не понятно ей)? Можно ли отменить? Изменить даты? Послать nudge хосту?
  - Как должно: единая копия — `Marina has up to 3 days to respond. If she doesn't, your application expires and you can apply again.` + кнопки `[Withdraw application] [Message host] [Edit dates]`.

- [x] **UX-148. ✅ FIXED —  Pending application: `Refundable deposit ฿60,000 held securely by Siamo` — но Sarah ничего не платила.**
  - Где: тот же Pending application detail.
  - Что: правая колонка `Reservation details` показывает `Refundable deposit ฿60,000 · held securely by Siamo`. Sarah видит и думает «я уже отдала ฿60k?!». На самом деле депозит держится Siamo только после approve+pay.
  - Как должно: `Refundable deposit ฿60,000 · payable on approval, then held by Siamo`. Или явно `0 paid yet`.

- [ ] **UX-149. `My stays` card holds bare минимум — нет host name / contract / payment state.**
  - Где: `/me/guest/bookings`.
  - Что: card показывает фото + title + dates + `Confirmed` badge + countdown. Нет: имя хоста, статус контракта (Signed), статус оплат (All paid 6/6), TM-30 status. Glance-info минимальна — приходится клик чтобы понять состояние.
  - Как должно: под title — `Hosted by Marina · Agreement signed · All paid` мелким, и pet-style chips для квикглянца.

- [ ] **UX-150. `Hosting · / Renting · 1` mode-tabs persist на каждой странице — даже /profile, /settings.**
  - Где: все страницы под `/me/*`.
  - Что: левый верхний угол всегда показывает Hosting / Renting toggle. На контекстных страницах (Profile, Documents, Notifications) — переключение режима бессмысленно, добавляет шум.
  - Как должно: скрывать mode-toggle на `/me/profile/*`. Показывать только в actor-specific (My stays, Applications, Properties, Requests).

- [x] **UX-151. ✅ FIXED —  Account menu (Profile / Sign out) не закрывается при navigation.**
  - Где: правый верхний угол меню «≡».
  - Что: открываешь меню → клик `Profile` → перешёл на /me/profile → меню всё ещё открыто поверх страницы. Закрывается только клик в пустоту.
  - Как должно: `onClick` на пункт меню → `setOpen(false)` сразу же.

- [ ] **🚨 BUG-152 / CRITICAL. Profile → Payment methods показывает landlord-payout form для tenant'а.**
  - Где: `/me/profile?s=payment` залогинен как Sarah (Tenant).
  - Что: страница «These details are shown to tenants when payment is required. At least one method (PromptPay or bank transfer) is recommended» → PromptPay ID, Bank name, Account number, Account name. Это форма для landlord чтобы получать выплаты от тенантов. У tenant её быть не должно — она платит, а не получает.
  - Tenant видит и не понимает: «я что, должна получать платежи? Зачем мне это?». Plus отсутствует то, что ей реально нужно: история платежей, saved cards, refund destination.
  - Как должно: route-guard / роль-чек на этой странице. Tenant видит: `Payment history`, `Saved cards`, `Refund preferences`. Landlord видит: текущий payout form.

- [ ] **🚨 BUG-153. Profile → Contact & messaging копия для host: «Your contact details are shared with tenants only after their booking is confirmed».**
  - Где: `/me/profile?s=contact` для Sarah (Tenant).
  - Что: «shared with tenants» — у Sarah нет тенантов, она сама tenant. Копия не адаптирована к роли.
  - Как должно: для tenant — «Shared with your host so they can reach you about your stay». Для landlord — текущая копия.

- [ ] **UX-154. Profile → Personal & passport: DOB пустой, Visa type не выбран — хотя Sarah уже подписала контракт.**
  - Где: `/me/profile?s=personal`.
  - Что: бэйдж `Incomplete` (правильно). Но даже без DOB / Visa Sarah прошла весь bookingflow — contract signed. Значит данные где-то есть (или контракт без них). Поля показаны пустыми — что меняет ситуацию: тенант не знает, было ли заполнено в onboarding/booking modal.
  - Как должно: подтянуть данные из последнего passport-input (booking modal или onboarding). Если нет — explicit `Not provided yet` с CTA «Fill in for TM-30 + contracts».

- [ ] **UX-155. Profile sidebar status pills (Email ✓ / Phone ✗ / Passport ✓) — non-clickable.**
  - Где: левая sidebar Profile.
  - Что: `Phone ✗` (красный) — очевидно missing. Tenant хочет добавить — но клик по pill ничего не делает. Нужно догадаться идти в Contact & messaging.
  - Как должно: каждый pill — link на соответствующую секцию. `Phone ✗` → tap → `/me/profile?s=contact` с фокусом на phone field.

- [ ] **UX-156. Notifications "Coming soon — for now all critical alerts go to email" — без даты / waitlist.**
  - Где: `/me/profile?s=notifications`.
  - Что: голая фраза «Coming soon». Не сказано какие каналы планируются (SMS / Push / Email digest), нет «Notify me when available».
  - Как должно: `Coming soon — we're building SMS, Push and Email digest preferences. [Notify me when ready]` toggle.

- [ ] **BUG-142. После submit ticket «Your reports» список не обновляется — нужен reload.**
  - Где: tenant `/me/guest/bookings/:id` → Issues tab → Submit report.
  - Что: тост `Issue reported — your host has been notified`, форма очищается, но `Your reports · 1 open` не появляется — секция остаётся `No active reports / Submitted reports show up here…`. После полной перезагрузки страницы — тикет появляется.
  - Как должно: `useMutation` onSuccess → `queryClient.invalidateQueries(['guest','bookings',id,'tickets'])`. Optimistic update пожалуй излишен, но invalidate обязателен.
  - Почему важно: тенант видит «No active reports» — думает что отправка не прошла, нажмёт Submit ещё раз, дубликат тикета.

- [ ] **UX-143. Tenant Issues form не позволяет приложить фото.**
  - Где: tenant `/me/guest/bookings/:id` → Issues → Report an issue (форма).
  - Что: Category / Title / Description / Urgency / Submit — никакого attach photo. Хост на своей стороне (Ticket detail) видит кнопку `📎 Attach` для сообщений, но тенант приложить превью протекающего крана при создании тикета не может.
  - Как должно: drag&drop / `+ Photo` под textarea, max 5 фото, превью. Maintenance issues почти всегда визуальны.

- [ ] **UX-141. Listing detail на чужом current rental не показывает «You're renting here now».**
  - Где: Sarah на `/listings/eb014984...` (это её текущее жильё, status `Confirmed`).
  - Что: страница выглядит как обычный marketplace listing — те же фото, цена, House rules, Booking widget. В widget при выборе move-in 24 May 2026 показано generic «Dates overlap with existing booking · Next available: December 15, 2026 · Use this date». Нигде нет «✓ You're renting this — your stay ends Dec 15». Generic «existing booking» — а это её own.
  - Как должно: на верху страницы — небольшой банер «🏠 You're renting this place — your stay until 15 Dec 2026. [Open my booking →]». В widget вместо «existing booking» — «your stay».
  - Почему важно: tenant возвращается на детальную страницу своего жилья (например, посмотреть House rules или WiFi пароль) — путается, что это какой-то другой объект, ищет своё бронирование где-то ещё.

- [ ] **BUG-135. Добавление co-resident в Confirmed/Active booking — без согласования с хостом.**
  - Где: `/me/guest/bookings/:id` (booking.status `Confirmed`/`Active`, contract `FullySigned`) → Co-residents → `+ Add resident` → Submit.
  - Что: `POST /api/bookings/{id}/guests` принимается мгновенно, резидент появляется в booking, TM-30 row создаётся, тост `Co-resident added`. Хосту никакого Approve/Reject — он узнаёт пост-фактум (если узнаёт). Реально: Sarah на FullySigned контракте добавила Alex Tester без подтверждения Marina.
  - Как должно: после подписания контракта (или в Active фазе) — добавление резидента должно идти через approval flow:
    1. Тенант создаёт запрос → `BookingGuestRequest.status = Pending`
    2. Хост видит в своём dashboard уведомление «Sarah wants to add Alex Tester as co-resident»
    3. Approve → резидент добавлен, TM-30 row активирован; Reject → запрос закрыт с reason
  - **До FullySigned** (pre-contract) — можно добавлять без approval, это часть booking-flow. **После FullySigned** — нужен approval. Бизнес-логика: хост согласился на конкретный состав жильцов, и добавление нового — изменение условий аренды.
  - Почему важно: хост может найти в квартире 4 людей вместо 1 без своего ведома, оплаченного депозита под N человек хватит не на весь ущерб, нарушение `maxOccupancy`, проблемы с TM-30 за nezadeklarovannyh людей. **И юридически:** добавление stranger к договору без письменного согласия landlord — нарушение thai-стандартного арендного законодательства.

- [ ] **UX-129. «Add co-resident» modal: только First/Last помечены `*`, но Gender/Nationality/DOB/Visa нужны для TM-30 — silently optional.**
  - Где: `/me/guest/bookings/:id` → Co-residents tab → `+ Add resident`.
  - Что: добавил `Alex Tester` только с First/Last/DOB/Passport/Expiry/Date of entry/Place — без gender, nationality, visa. Submit прошёл, резидент создан, TM-30 row `Pending`. На карточке резидента видны только `Passport P98765432` — без nationality. Host физически не сможет filing TM-30, если резидент — фаранг без указанной национальности.
  - Как должно: либо `*` на nationality/gender/visa и блокировка Submit, либо явный warning «Without nationality your host can't file TM-30».
  - Почему важно: тенант создаёт co-resident, видит TM-30 row `Pending`, считает что всё в порядке. На check-in день host не может зарегистрировать — viva-violation, штраф 1600 ฿ хосту + проблемы с визой тенанту.

- [x] **UX-130. ✅ FIXED —  Remove co-resident: одиночный клик без confirmation, без undo.**
  - Где: Co-residents tab → trash-иконка справа на карточке non-main resident.
  - Что: клик → toast `Removed` → резидент исчез. Никакого подтверждения «Точно удалить Alex Tester?», нет undo в toast.
  - Как должно: либо `confirm` модалка («Delete Alex Tester from booking? They'll be removed from TM-30 filings too»), либо toast с Undo-кнопкой (~5с).
  - Почему важно: случайный тап → теряются passport-данные, заполненные минуту назад. Особенно болезненно на мобиле, где trash-иконка маленькая и рядом с другими тапабельными элементами.

- [ ] **BUG-131. Race-condition: Pending applications не автоотклоняются после approve конкурента на те же даты.**
  - Где: `/me/guest/applications/:id` (тенант B) после того, как host approve тенанта A на пересекающиеся даты.
  - Что: Setup — Liam (T2) и Mike (T3) подали Pending на Sunny 1-bed на одни даты Jan15-Mar15 2027. Marina approve Mike (✅ booking создан). Через несколько секунд Liam открывает свою заявку — статус всё ещё **`Pending` / `Awaiting response` / `Auto-expires in 2d 23h`**. Сервер для Liam'а отдаёт `status: Pending, rejectionReason: null, respondedAt: null`. Liam будет ждать 3 дня впустую.
  - Как должно: при approve конкурирующей заявки сервер должен переводить остальные Pending на пересекающиеся даты в `Rejected` (с reason: «Dates already booked») или `Expired`, и шлёт тенанту notification. Иначе тенант теряет 3 дня поиска жилья (а если это его единственная заявка — ещё больше).
  - Почему важно: в условиях ограниченного предложения тенант делает ставку и ждёт ответа. Игнорирование = клиент потерян.

- [ ] **BUG-132 (BACKEND). 500 при попытке approve второго запроса на уже забронированные даты.**
  - Где: `POST /api/me/host/booking-requests/:id/approve` после того, как booking на пересекающиеся даты уже создан.
  - Что: Marina approve Mike → booking создан (200 OK). Marina пытается approve Liam → **`{"title":"Internal Server Error","status":500,"detail":"An unexpected error occurred while processing your request."}`**. Это не graceful 409 Conflict с понятным сообщением «Dates conflict with booking X», а голый 500.
  - Как должно: 409 Conflict + body `{ "error": "dates_unavailable", "conflictingBookingId": "..." }`, на UI хосту — toast «Эти даты уже забронированы под Mike Park».
  - Почему важно: host видит белый экран / generic error в свежем admin-флоу.

- [ ] **GAP-133. Reviews/ratings — фича отсутствует end-to-end.**
  - Где: ожидалось бы на `/listings/:id` (отображение reviews хоста/жилья) + `/me/guest/bookings/:id` после check-out (Sarah оставляет отзыв) + `/me/host/bookings/:id` (Marina отвечает / оставляет отзыв тенанту).
  - Что: ни в `src/lib/api/*`, ни в `src/lib/types/*` нет полей `ratingAverage`, `reviewCount`, `reviews`. Endpoint `/api/marketplace/listings/{id}/reviews` и `/api/me/guest/bookings/{id}/reviews` отсутствуют (пустой ответ). Listing detail не содержит секции с reviews. Star-метка `★ New` в карточках — статичная заглушка для всех listings (см. UX-51).
  - Как должно: для marketplace MVP — отзыв тенанта о хосте + о жилье после check-out, ответ хоста о тенанте (закрытый, для будущих хостов). Минимум: 5-звёзд + комментарий. Aggregate на marketplace card.
  - Почему важно: без social proof тенант не отличает Marina (проверенный хост) от случайного теста. UX-51 уже об этом, но требует реализации фичи целиком. Фронт + бэк.

- [ ] **BUG-134. После Confirmed cancellation booking-стейт не обновляется ни на API, ни в UI.**
  - Где: `/me/guest/bookings/9d186951-d516-4205-9da9-30c0ddb25ec4` после того, как Marina confirm early-exit.
  - Что: API `BookingCancellationDto.status = "Confirmed"` + `landlordConfirmedAt: 2026-05-24T11:02:59Z`, но `GET /api/bookings/{id}` отдаёт:
    - `status: "Confirmed"` (не `"Cancelling"`, не `"Ending"`)
    - `checkOutDate: "2026-12-15"` (а не `earliestExitDate = 2026-07-15`)
    - `daysRemaining: 205`
    - `rentAmount: 210000` без флага refund-pending
  - UI у Sarah: статус `Confirmed`, CHECK-IN COUNTDOWN `22 days · Monday, Jun 15`, Check-out `15 Dec 2026`, `Rent paid · ฿210,000 of ฿210,000`. **Никакого банера** «Cancellation approved — your stay ends Jul 15, refund processing». Тенант не знает, что её отмена принята.
  - Как должно: booking.status → `Ending` (или новый), checkOutDate → earliestExitDate, daysRemaining пересчитан, баннер «✓ Early exit confirmed by Marina · Stay ends 15 Jul 2026 · Refund ฿X processing».
  - Почему важно: тенант сейчас в подвисшем состоянии — отмена fake-успешна на бумаге, но в реальности ничего не изменилось. Если она съедет 15 Jul, host имеет полное право требовать остатки рента — UI хоста тоже не покажет, что её отпустили.
  - **Связано с BE-32 / BE-23**: backend нужно подцепить `BookingService.OnCancellationConfirmed` → update Booking entity.

- [ ] **BUG-128. Early-exit modal не показывает что произойдёт с pre-paid rent.**
  - Где: tenant booking detail `/me/guest/bookings/:id` → `Request early exit`.
  - Что: API endpoint `POST /api/bookings/{id}/cancellation` возвращает `penaltyAmount: 35000, depositRefundAmount: 70000, netRefund: 35000`. Sarah заплатила вперёд ฿210,000 рент + ฿70,000 депозит. `netRefund: 35000` = `depositRefund - penalty` = 70 − 35. **Не учитывается** ฿175,000 неиспользованного pre-paid rent за месяцы Aug-Dec (5 месяцев × ฿35k).
  - Как должно: либо backend добавляет в DTO поля `unusedRentRefund`, `totalRefund = depositRefund + unusedRent - penalty`; либо честно decline-ить early-exit, объясняя «1 month notice — first month rent forfeited, остальные ฿175k возвращаются отдельно». Сейчас расчёт скрыт.
  - Почему важно: Sarah-как-пользователь нажмёт Submit, увидит netRefund=฿35k и решит, что теряет ฿245,000 (210k+70k−35k). Это её удержит от отмены — но из-за непрозрачной математики, не из-за честных условий.
  - Где: modal «Request early exit» на `Confirmed` (pre-checkin) booking.
  - Что: Sarah заплатила ฿210,000 за 6 месяцев вперёд (`Rent paid · ฿210,000 of ฿210,000`). Modal говорит только: `Early exit penalty ฿35,000 · 1 month rent · applied upon host confirmation`. Не сказано: вернётся ли неиспользованный rent (например, ฿175k = 5 неотбытых месяцев)? Удержит ли всё ฿210k host?
  - Как должно: breakdown в modal: `Refund: Pre-paid rent ฿210,000 − Penalty ฿35,000 = ฿175,000 returned · Deposit ฿70,000 returned in full`.
  - Почему важно: тенант не нажмёт Submit, не зная финансового исхода. Сейчас CTA «Submit request» — кот в мешке.

> **Round 12 (2026-05-26) вынесен в [BUG_TRACKER.md](BUG_TRACKER.md)** — единый файл для FE/BE/QA. Сюда новые находки этого round'а НЕ добавлять.
