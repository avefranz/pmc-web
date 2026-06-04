# Лендлорд-флоу: список багов и улучшений

> QA-прогон от лица "Марины" (первый раз создаёт объект в Чианг Мае). Дата: 2026-05-23.
> Формат: `[ ]` — не сделано, `[x]` — сделано. Категория `BUG` — функциональный дефект, `UX` — улучшение опыта/копирайта/визуала.
> Под каждым пунктом указано: где, что не так, как должно быть, почему важно.

---

## Критичные (блокеры или ломают пользовательский ввод)

- [ ] **BUG-01. Тап по карте молча перезаписывает Street address и Postal code, но не Legal address.**
  - Где: `Address & location`, после клика по карте.
  - Что: я ввела "88 Nimmanhaemin Road" / "50200". Тап по карте → "29/1 Hassadhisawee Road" / "50030". Legal address остался моим. Три источника правды разошлись, у пользователя — неправильный адрес в контрактах и в TM-30.
  - Как должно: либо подтверждение "перезаписать введённый адрес?" перед reverse-geocode, либо синхронно обновить и Legal address из того же источника, либо вообще не трогать поля, в которые юзер уже что-то ввёл.

- [ ] **BUG-02. AI-драфт title конкатенируется с пользовательским вводом без пробела, ломая поле.**
  - Где: `Listing title & description`, поле Listing title.
  - Что: пока я печатала "Sunny 1-bed studio near Nimman", AI асинхронно вставил "1-bed entire place \| Chiang Mai" перед моим текстом. Получилось "Chiang MaiSunny 1-bed studio near Nimma" (обрезано до 60). Live-preview показал кашу — именно её увидел бы tenant, если бы юзер не заметил.
  - Как должно: AI не пишет в поле, если оно сейчас в фокусе или содержит пользовательский ввод. Возможна кнопка "Try AI draft" вместо авто-вставки.

- [x] **BUG-03. "Auto-save as you go" не работает — все данные теряются при закрытии вкладки.** — ✓ verified 2026-05-23: баннер изменён на честный "your data saves when you click 'Save property'". Auto-save сам по-прежнему не реализован, но копирайт больше не врёт.
  - Где: вся форма `/me/host/properties/new`.
  - Что: баннер обещает "we'll auto-save as you go". При навигации браузер выдаёт "Leave site? unsaved changes". После форс-навигации список `/me/host/properties` пуст ("List your first property"). 7 заполненных секций потеряны.
  - Уточнение от продукта: сохранение происходит одной транзакцией после всех полей — то есть auto-save вообще не реализован.
  - Как должно: либо честно поменять копирайт ("Don't close the tab — your changes save only on publish"), либо реально сохранять draft после каждого "Looks good — continue". Без этого высокая drop-off из-за случайного закрытия вкладки.

- [x] **BUG-04. Город — только Chiang Mai, остальная Тайланд недоступна.** — ✅ FIXED 2026-05-23: `useMarketplaceCities()` заменён на `useReferenceCities()` (новый хук → `GET /api/references/cities`). Дропдаун теперь показывает все 10 городов (Bangkok, Phuket, Pattaya и др.). Файлы: `references.api.ts`, `use-references.ts`, `location.tsx`, `editor-sidebar.tsx`, `title.tsx`.
  - Где: `Address & location` → City dropdown.
  - Что: главная страница заявляет "Rent extraordinary assets across Thailand". В дропдауне один вариант — Chiang Mai. Все потенциальные лендлорды из Пхукета/Бангкока/Паттайи отваливаются.
  - Как должно: либо честно "Currently launching in Chiang Mai. Other cities coming soon" на главной, либо включить остальные города в справочник.

- [ ] **BUG-05. AI игнорирует уже заполненные данные при генерации title.**
  - Где: `Listing title & description`, AI-draft.
  - Что: я указала 1 спальню. AI предложил "3BR Chiang Mai Condo · Fully Furnished". То есть AI не подхватывает существующее состояние формы.
  - Как должно: AI читает форму (bedrooms, city, type, furnishing) и формирует draft на их основе.

---

## Структурные / навигационные

- [ ] **UX-06. Конфликт счётчиков: "0 of 10 required steps", но секций 13, а total в процессе скачет 8/9/10.**
  - Где: шапка `New property`, sticky-баннер внизу, нумерация карточек.
  - Что: общее число шагов меняется на ходу (видела 10 → 9 → 8). Карточки пронумерованы до 13, в синем баннере пилюли 1–6, в "Still needed" — 10 пунктов. Юзер не понимает реального масштаба.
  - Как должно: фиксированный список required шагов, стабильная сквозная нумерация, separate из обязательных и опциональных.

- [ ] **UX-07. Нумерация секций сдвигается, когда секция выше засчитывается.**
  - Где: список карточек.
  - Что: Listing title была "13", после заполнения Payment стала "12", потом "11". Дезориентирует — пользователь возвращается к "11" и не находит того же раздела.
  - Как должно: фиксированные order/numbers; статус "done/in-progress" — отдельный сигнал.

- [ ] **UX-08. Пилюли "1 Property type & size … 6 House rules & WiFi" выглядят кнопками, но не кликаются.** — ✗ STILL BROKEN 2026-05-23: клик по пилюле "3 Pricing" не вызывает scroll-to и не открывает секцию. ⏳ запланировано.
  - Где: синий welcome-баннер.
  - Что: chips с номером и hover-стилем — affordance кнопки быстрого перехода. Клик ничего не делает.
  - Как должно: либо сделать кликабельными (scroll-to + open), либо явно нестилизованные label-чипы (без hover).

- [ ] **UX-09. Двойная навигация: левый sidebar (Basics/Media/...) vs. правый numeric list карточек.**
  - Где: страница редактора.
  - Что: связь между ними неочевидна. Sidebar не подсвечивает текущий раздел, не реагирует на скролл, и клик по нему не открывает карточки.
  - Как должно: одна модель — либо sticky sidebar как ToC с активным выделением, либо убрать.

- [ ] **UX-10. Хедер: "Hosting · + List" и "Renting" — таб-выбор контекста, но выглядит как chips.**
  - Где: шапка.
  - Что: непонятно, активный таб или две кнопки. "+ List" воспринимается как отдельный CTA-add.
  - Как должно: явные active/inactive состояния, "+ List" вынести либо убрать.

---

## Валидация и обратная связь

- [x] **BUG-11. Кнопка "Create account" активна без чекбокса ToS.** — ✓ verified 2026-05-23: кнопка `Create account` приглушённо-серая (disabled) пока ToS не отмечен.
  - Где: `/register`.
  - Что: можно нажать — ошибка появляется только после клика. CTA выглядит как разрешённое действие.
  - Как должно: кнопка disabled, пока ToS не отмечен (с tooltip почему).

- [ ] **UX-12. Поля Email/Password на регистрации предзаполнены ("testtenant@siamo.test", точки).** — ✗ STILL BROKEN 2026-05-23: `/register` и `/login` всё ещё предзаполнены `testtenant@siamo.test` и точками пароля. И светло-голубой "filled" фон тоже остался.
  - Где: `/register`.
  - Что: похоже на dev-заглушку. Юзер не понимает: его это данные или нет.
  - Как должно: чистые поля с placeholder в светло-сером (без light-blue фона "filled" состояния).

- [ ] **UX-13. Кнопка `Fill required fields (marked *)` — описание состояния вместо CTA.**
  - Где: каждая секция в disabled-состоянии.
  - Что: текст звучит как инструкция, а не как действие. Не понятно, что делать.
  - Как должно: disabled-CTA с обычной подписью ("Save section") + tooltip "Fill missing: Property type, …".

- [ ] **UX-14. Скрытое условное "one-of-two" в Payment details не помечено.**
  - Где: `Payment details`.
  - Что: PromptPay ID и Bank — оба `(optional)`, но красная сноска "Add at least PromptPay or a full bank entry — without this, bookings stall at the payment step." делает их условно обязательными.
  - Как должно: явная пометка группы "One of these is required *".

- [ ] **UX-15. Required-секция без выбранного значения не подсвечивается ошибкой.**
  - Где: `Property type & size`, поле Property type.
  - Что: со звёздочкой *, но без визуального сигнала "не выбрано". Юзер не понимает, почему disabled.
  - Как должно: красная рамка/иконка/текст при попытке прогрессии или после первого взаимодействия.

- [ ] **UX-16. Нет ручного "Save draft" — только финальный Save Property после всех 10 секций.**
  - Где: top-right `Save property` + sticky bottom.
  - Что: пользователь не может сохранить промежуточный прогресс осознанно.
  - Как должно: две кнопки — `Save draft` (доступна всегда) и `Publish` (после всех required).

- [ ] **BUG-17. "0 of 10 photos" — минимум не указан.**
  - Где: `Photos`.
  - Что: непонятно, нужно 1 или 10. Звучит как минимум 10.
  - Как должно: "min 1 to publish · up to 10".

---

## Логика заполнения

- [x] **BUG-18. Unit floor сбрасывается при выборе Property type.** — ✓ verified 2026-05-23: ввела Unit floor=8 в новом черновике, кликнула "Entire place" — значение сохранилось.
  - Где: `Property type & size`.
  - Что: ввела Unit floor=8, потом кликнула "Entire place" — значение стало 2. Возможно конфликт обработчиков spinner +/- и клика на radio-карточку.
  - Как должно: выбор Property type не должен трогать численные поля.

- [ ] **UX-19. Street address vs. Legal address — два поля с почти одинаковой семантикой.**
  - Где: `Address & location`.
  - Что: пользователь не понимает, чем они различаются и в каких случаях должны отличаться.
  - Как должно: одно поле "Address" + опциональный "Use a different address on official documents".

- [ ] **UX-20. "TM-30 registration required" — без объяснения.**
  - Где: `House rules`.
  - Что: иностранный лендлорд не знает, что это.
  - Как должно: рядом "ⓘ" с поп-апом про обязательную регистрацию иностранцев у иммиграционной полиции Таиланда.

- [ ] **UX-21. Smart defaults: "pre-filled" но прогресс 0/10.**
  - Где: welcome-баннер.
  - Что: "Smart defaults are pre-filled" → но Cancellation policy и Utilities действительно с галочками (значит несколько умолчаний есть). Однако счётчик стартует с 0/10, что противоречит "pre-filled".
  - Как должно: либо засчитывать default-секции в прогресс, либо переписать копирайт ("We'll prefill where we can — you still need to fill the 10 required steps").

- [ ] **UX-75. Секция Utilities выглядит завершённой по дефолту — пользователь её пропускает не открывая.**
  - Где: редактор объекта, секция `What's included` (Utilities included).
  - Что: в свежем черновике у секции стоит зелёная галка-«completed» и подпись "Changes will apply when you save the property", при этом ни один чекбокс (Electricity / Water / Internet / Air-conditioning / Garbage collection) не отмечен. Пользователь, проходящий по sections-list сверху вниз, видит зелёный статус и идёт дальше, не открывая. В результате тенанту по умолчанию транслируется "ничего не включено в ренту", хотя лендлорд осознанного выбора не делал.
  - Как должно: пока пользователь не открыл секцию хотя бы раз и не подтвердил, считать её **untouched** (нейтральная иконка, не зелёная). Альтернатива — потребовать явное "Tenant pays everything separately" toggle, как осознанный выбор пустого состояния. Тот же шаблон проверить для Amenities / Pets / House rules — везде, где валидное состояние = "ничего не выбрано".

---

## Сессия 2026-05-23 — повторный проход с свежей регистрацией

Marina-аккаунт зарегистрирован заново, объект создан с нуля (Chiang Mai, Nimmanhaemin Soi 15) и опубликован. Найдено при холодном прохождении.

### Verify-прогон #2 после фиксов (2026-05-23, финальный)

После второго раунда фиксов — статус обновлён, реальный итог:

| ID | Verify #2 |
|----|-----------|
| UX-75 Utilities default ✅ | ✅ FIXED — "Utilities included" теперь "REQUIRED · Not set — tap to fill in · 1 min", без зелёной галки в свежем drafte |
| UX-76 Cancellation default ✅ | ✅ FIXED — "Cancellation policy" теперь "Not set — tap to fill in · 30 sec", без зелёной галки |
| UX-77 Account name default | ✅ FIXED архитектурно — Contact details и Payment details **полностью убраны** из required steps редактора объекта (перенесены, видимо, в profile). 8 required steps вместо 10 |
| UX-78 Listing title default | ✅ FIXED (verified earlier) |
| UX-79 Pets preselected | ✅ FIXED (verified earlier) |
| BUG-80 Postal code склейка | ✅ FIXED (verified earlier) |
| UX-82 первый item dropdown зелёный | ❌ NOT FIXED — Chiang Mai (первый item) всё ещё с зелёным фоном при открытии dropdown |
| UX-83 Chiang Mai сортировка | ✅ FIXED (verified earlier) |
| UX-84 spinner defaults | ⏳ не открывал секцию повторно |
| BUG-85 Saving... висит | ⏳ не доходил до Save |
| UX-86 прогресс прыгает | ✅ LIKELY FIXED — теперь стабильно 0/8 (Contact/Payment details убраны, fewer dynamic recalculations) |
| UX-87 баннер 6 vs 10 | ✅ FIXED — теперь баннер показывает **все 8 шагов** (1 Property type & size … 8 Listing title & description), счётчик "0 of 8", Still needed = 8. Полное соответствие |
| UX-88 двойные CTAs | ⏳ не доходил до Save |
| UX-89 autofill | ✅ FIXED (verified earlier) |

### Verify-прогон после фиксов (2026-05-23, поздний)

Фронт сообщил "всё поправили". Перепроверено на свежем аккаунте Marina v3 — реальный статус каждой находки:

| ID | Что | Verify-статус |
|----|-----|----------------|
| UX-75 Utilities default ✅ | "None included" с зелёной галкой до открытия | ❌ NOT FIXED — секция по-прежнему помечена completed без участия |
| UX-76 Cancellation default ✅ | "Moderate" с зелёной галкой до открытия | ❌ NOT FIXED — то же |
| UX-77 Account name default | "Marina Kovalenko" предзаполнено | 🟡 PARTIAL — имя осталось, но добавлен warning "Add at least PromptPay or a full bank entry — without this, bookings stall at the payment step" |
| UX-78 Listing title default ✅ | AI-title зелёной до прочтения | ✅ FIXED — теперь "Listing title & description · REQUIRED · Not set — tap to fill in" |
| UX-79 Pets preselected ("Not allowed" белая) | визуальный select без значения | ✅ FIXED — обе кнопки в нейтральном состоянии (через `petsExplicitlySet` flag). **Внимание:** изначальный фикс ввёл syntax error в `pets.tsx:10` (JSX-комментарий между атрибутами `<ChipGroup>`), сайт не собирался — починено в этом же прогоне (комментарий перенесён в children) |
| BUG-80 Postal code склейка | "50200" + autocomplete = "5020050200" | ✅ FIXED — `onFocus={(e) => e.target.select()}` в location.tsx:272 |
| UX-81 серая карта 2-3s после смены city | без skeleton | ⏳ не проверял повторно |
| UX-82 первый item dropdown зелёный | Phuket подсвечен | ❌ NOT FIXED — теперь Chiang Mai первый, но паттерн default-highlight остался |
| UX-83 Chiang Mai последний в City | UX-философия требует его выше | ✅ FIXED — теперь первый в списке |
| UX-84 spinner defaults без visual distinction | 0/1/2 как user-input | ❌ NOT FIXED — визуально не отличаются |
| BUG-85 Saving... висит 60+ сек | URL обновлён, UI залип | ⏳ не доходил повторно до Save в этом прогоне |
| UX-86 прогресс прыгает (10→9→8) | counter перестраивается | ⏳ не дошёл до конца |
| UX-87 баннер 6 шагов vs Still needed 10 | mismatch | ❌ NOT FIXED — то же |
| UX-88 двойные CTAs Save & finish + Save property | duplicate primary | ⏳ не дошёл до конца |
| UX-89 autofill ломает Create account | кнопка disabled при autofill | ✅ FIXED — Marina v3 зарегистрирована с первой попытки через type, кнопка активна корректно |

- [ ] **UX-76. Cancellation policy — default-as-complete "Moderate".**
  - Где: редактор объекта, секция `Cancellation policy` (под Stay details).
  - Что: при создании нового объекта секция уже отображается с зелёной галкой и подписью "Moderate". Пользователь её не открывал. После публикации tenants увидят политику отмены, выбранную не лендлордом, а системой.
  - Как должно: либо нейтральный статус до открытия, либо обязательное явное подтверждение для финансово-чувствительных секций (cancellation = деньги тенанта при отмене).

- [ ] **UX-77. Account name в Payment details — default-as-complete из регистрации.**
  - Где: редактор объекта, секция `Payment details` → блок Bank transfer.
  - Что: поле Account name предзаполнено "Marina Kovalenko" (`firstName + lastName` из аккаунта) и сопровождается подсказкой "Should match your account name 'Marina Kovalenko'." — пользователь видит и подсказку, и значение, может пропустить. Но банковский счёт может быть на другое имя (девичья фамилия, бизнес-аккаунт, supplemental name).
  - Как должно: поле оставить пустым с placeholder + явный hint "Use the name on your bank statement"; имя из аккаунта показывать только как suggestion, не как value.

- [ ] **UX-78. Listing title — AI-generated draft помечен ✅ до прочтения.**
  - Где: редактор объекта, секция `Listing title & description`.
  - Что: при первом открытии секция уже имеет зелёную галку, Listing title заполнен AI-генератором ("2-bed entire place | Chiang Mai", 31/60) и засчитан как валидный. Пользователь может нажать Save property не вычитав название, и оно уйдёт в публикацию как есть.
  - Как должно: AI-черновик показывать в **отдельном состоянии "Suggested — review and confirm"** с CTA "Use as-is" / "Edit". Зелёная галка ставится только после явного подтверждения. Это касается и Description (когда сгенерирован через "draft for me").

- [ ] **UX-79. Pets — "Not allowed" визуально preselected, но не сохранён.**
  - Где: редактор объекта, секция `Pets`.
  - Что: при открытии Pets кнопка "Not allowed" имеет белый фон (выглядит как выбранная), а кнопка "Pets welcome" — обычная. Но CTA disabled ("Fill required fields") — то есть preselect ничего не сохранил, это просто декорация. Пользователь видит "selected" → "уже выбрано, что делать?" → "может пропустить".
  - Как должно: либо preselect реально применяется (Pets валиден как "Not allowed" сразу), либо обе кнопки в нейтральном состоянии до клика. Сейчас — half-way, хуже обоих вариантов.

- [ ] **BUG-80. Postal code склеивается со значением из autocomplete street-address.**
  - Где: редактор объекта, секция `Address & location`, поле Postal code.
  - Что: выбор адреса через autocomplete (Nimmanhaemin Road Soi 15) автоматически записывает в Postal code "50200". Если пользователь потом кликает в Postal code и вводит другое значение (или то же), оно **дописывается в конец**: результат "5020050200". Поле не выделяется/не очищается при focus.
  - Как должно: при focus автоматически select-all (текстовый input стандартное поведение); или явная иконка "✕ clear" в поле, заполненном autocomplete; или хотя бы не дублировать значение между Street autocomplete и Postal code.

- [ ] **UX-81. Карта не пересчитывается мгновенно после смены City — серое поле 2-3 секунды без skeleton.**
  - Где: редактор объекта, секция `Address & location`, блок Map.
  - Что: после клика по Chiang Mai в City dropdown карта **становится серой** (тайлы стёрты) на 2-3 секунды до подгрузки новых тайлов Chiang Mai. Пользователь видит пустую серую область с одним маркером и думает что что-то сломалось. Дополнительно: до выбора города карта **уже показывает Bangkok** с маркером — это default-as-complete на карте.
  - Как должно: skeleton-overlay с лоадером на время смены центра + текст "Loading map for {city}…"; до выбора города — серый плейсхолдер с подсказкой "Pick a city to see the map", а не Bangkok без контекста.

- [ ] **UX-82. Phuket в City dropdown зелёного цвета — выглядит как preselected, но это просто highlight первой опции.**
  - Где: редактор объекта, секция `Address & location`, dropdown City.
  - Что: первая опция списка городов (Phuket) выделена зелёным фоном. Это hover-style/keyboard-focus, но визуально читается как "selected". При этом City реально пустой (placeholder "Select city").
  - Как должно: первая опция в стандартном цвете; зелёный — только после реального выбора.

- [x] **UX-83. Chiang Mai последний в City dropdown — целевой город Siamo внизу списка.** — ✅ FIXED: `GET /api/references/cities` теперь возвращает Chiang Mai первым (pin по `Code == "CHIANGMAI"`), остальные города — алфавитно.
  - Где: редактор объекта, секция `Address & location`, dropdown City.
  - Что: порядок: Phuket, Pattaya, Hua Hin, Koh Samui, Chiang Rai, Khon Kaen, Rayong, Nakhon Si Thammarat, Bangkok, **Chiang Mai**. По UX-философии и текущему marketplace focus Chiang Mai должен быть в первых.
  - Как должно: сортировка по числу активных объектов в каждом городе, либо по популярности (Bangkok, Chiang Mai, Phuket, Pattaya…), либо вверху "Featured" с Chiang Mai/Bangkok и ниже остальные.

- [ ] **UX-84. Numerische spinners стартуют со значениями 0/1/0/2/1/0 — без визуального отличия default vs user-input.**
  - Где: редактор объекта, секция `Property type & size` (Basics).
  - Что: Bedrooms=0 (хотя бы есть подпись "0 = studio"), Bathrooms=1, Max guests=2, Unit floor=0, Floors in building=1, Parking=0. Пользователь не знает, какие из этих — разумные дефолты, какие — заглушки. Live preview показывает "🛏 — 🚿 1 👥 2" до ввода.
  - Как должно: значение в spinner должно быть **визуально "placeholder-like"** (полупрозрачное, серым), пока пользователь не interact-ил; после interact — полным цветом. Live preview до Бesomeничего не показывает (или показывает "—" для всех специф-полей).

- [ ] **BUG-85. После Save property UI висит на "Saving…" 60+ секунд, хотя на BE объект уже создан и URL обновился.**
  - Где: редактор объекта, sticky bottom-bar "Ready to save your property" → клик → "Saving...".
  - Что: после клика Save property URL меняется с `/me/host/properties/new` на `/me/host/properties/{id}` (объект создан, через GET `/api/assets/{id}` подтверждается status 200), но **bottom-bar остаётся в "Saving..." state** без обновления. Без reload пользователь не видит, что Publish уже доступен. Пришлось вручную reload-нуть.
  - Как должно: после успешного POST `/api/listings` сбросить saving-state, отобразить toast "Saved", показать Publish CTA в bottom-bar или в шапке секции. Хотя бы не залипать индикатором.

- [ ] **UX-86. Прогресс required steps прыгает: 0/10 → 7/9 → 7/8 в ходе прохождения.**
  - Где: sticky bottom-bar "N/M required steps".
  - Что: при старте 0 of 10, после нескольких секций 7 of 9, потом 7 of 8. Знаменатель меняется динамически по мере того как часть секций становится conditionally-required (или conditionally-optional). Пользователь рассчитывает на фиксированную "лестницу" и не понимает, почему общее число сокращается.
  - Как должно: либо фиксировать общий счёт required (10 или сколько есть в продукте по умолчанию), либо переписать "N of M" во что-то стабильное ("X sections remaining" + явное "Most hosts finish in ~6 min").

- [ ] **UX-87. Welcome-баннер обещает "6 minutes / 6 sections", но Still needed список — 10 пунктов.**
  - Где: editor welcome banner.
  - Что: "A few quick steps — most hosts finish in under 6 minutes" + 6 цветных pill-шагов (1 Property type & size, 2 Address, 3 Pricing, 4 Photos, 5 Check-in, 6 House rules). Под баннером в счётчике "Still needed: …" перечислено **10 пунктов** (плюс Pets, Contact details, Payment details, Listing title & description). Tenant видит 6, считает 10.
  - Как должно: либо баннер показывает все 10 шагов (как сжатые pill-таги), либо текстом честно "6 quick + 4 finishing touches" / "10 sections, ~6 min".

- [ ] **UX-88. Двойные финальные CTA: in-section "Save & finish ✨" + sticky "Save property".**
  - Где: последняя секция `Listing title & description` + bottom sticky bar.
  - Что: в секции есть CTA "Save & finish ✨" + "This is the last step 🎉"; одновременно в нижней панели — "Ready to save your property" + "Save property". Обе ведут на сохранение, но визуально разные. Пользователь не уверен — что делает Save & finish vs Save property?
  - Как должно: один primary CTA на странице. "Save & finish" в секции должен заменить sticky-bar, либо sticky-bar должен исчезнуть на последней секции.

- [ ] **UX-89. Create account кнопка disabled при autofill, активна при ручном вводе.**
  - Где: `/register`.
  - Что: при заполнении формы через browser autofill (Chrome saved credentials) кнопка Create account остаётся затемнённой и не реагирует на клик, хотя все поля визуально заполнены и галка ToS поставлена. После ручного перепечатывания тех же значений кнопка становится активной. Корень — react-controlled inputs не получают `onChange` при programmatic value-set.
  - Как должно: либо отслеживать `input` event на autofill, либо валидировать форму не по React-state, а по фактическим DOM-values при попытке submit, и показывать чёткую причину блокировки.

- [ ] **UX-22. Хоткей-подсказка "⌘ ↩ to save" без расшифровки.**
  - Где: подпись "Up next: X" в каждой секции.
  - Что: новичок не считает Cmd-Enter за инструкцию.
  - Как должно: tooltip на hover или подпись "Press Cmd+Enter to save and continue".

---

## Эмоциональный слой / копирайт / визуал

- [ ] **UX-23. Копирайт лендлорда сухой — нет "предвкушения дохода".**
  - Где: `/me/onboarding/intent`, карточка "List my property".
  - Что: подпись "Publish your apartment or villa and start getting requests from verified tenants." — функциональная. UX-философия проекта (CLAUDE.md) требует "предвкушения дохода".
  - Как должно: динамическая оценка дохода ("Properties like yours earn ฿35–45k/mo in Chiang Mai"), live-числа, более тёплый язык.

- [ ] **UX-24. Live preview — оторван от реального вида карточки в marketplace.**
  - Где: левая колонка редактора.
  - Что: видны только "★ New", price-tag, title. Нет имитации фото-кадра, амеnities, расположения. Лендлорд не видит, как будет выглядеть его карточка для арендатора.
  - Как должно: 1:1 копия `ListingCard` из marketplace.

- [ ] **UX-25. Конфетти после "Pets: Not allowed" — преждевременный праздник.**
  - Где: микро-анимация после Pets.
  - Что: банальный выбор "Not allowed" — а уже фейерверк. Девальвирует celebration на действительно крупных вехах.
  - Как должно: конфетти только при ≥50% прогресса, при первом фото, при публикации.

- [ ] **UX-26. Sticky-баннер "X/Y required steps · keep going" перекрывает контент.**
  - Где: правый-нижний угол.
  - Что: налезает на карточки секций особенно на узких десктопах.
  - Как должно: bottom-padding под форму или sticky-bar на всю ширину снизу.

- [ ] **UX-27. Эмодзи прямо внутри чипов "📞Call / 💬SMS / 🟢WhatsApp / ✈️Telegram / 🟢LINE / 🟢WeChat".**
  - Где: `Contact details` → Available on.
  - Что: эмодзи без пробела от текста, неконсистентны (часть из шрифта emoji, часть монохром). Выглядит как временная заглушка.
  - Как должно: SVG-иконки рядом с подписью, как в shadcn/lucide.

---

---

## Дополнительная партия — после Save и Publish

- [ ] **BUG-28. После клика Save property UI визуально откатывает прогресс и фото, хотя на бэке всё успешно.**
  - Где: `New property` → клик `Save property`.
  - Что: 3 фото были "Pending", после Save → исчезли из UI, прогресс с 8/8 ушёл на 7/8, секция Photos снова `REQUIRED`. В консоли видно успешный GET с `r2.dev/listings/…webp` (фото фактически уехали в R2) и 200 на `GET /api/listings/asset/{id}`. После перезагрузки страницы всё корректно: 3 фото, "All required sections are filled in".
  - Как должно: после успешного save держать оптимистичное состояние UI, не сбрасывать локально загруженные данные.

- [ ] **BUG-29. AI suggestListingTitle ходит к gateway, получает 400, falls back на local template, который не учитывает форму.**
  - Где: консоль `[aiApi.suggestListingTitle] 400 from gateway, using local template`.
  - Что: при 400 от AI-шлюза подключается локальный шаблон, который генерирует "3BR Chiang Mai Condo · Fully Furnished" вне зависимости от введённых данных. Это и есть корень `BUG-05`.
  - Как должно: либо чинить шлюз (400), либо локальный fallback читает реальные значения формы.

- [ ] **UX-30. Кнопка `Publish →` остаётся "Publish →" даже после успешной публикации.**
  - Где: страница объекта после `Go live 🚀`.
  - Что: тост "Your listing is now live! 🎉" появился, но CTA остался "Publish →". Пользователь не понимает: опубликовалось или ещё раз нажать? Статус "Vacant" в sidebar тоже не меняется на "Published".
  - Как должно: после публикации кнопка превращается в `Unpublish` / `Snooze` / `View on marketplace`, статус явный.

- [ ] **UX-31. Нет CTA "View on marketplace" после публикации.**
  - Где: после `Go live`.
  - Что: пользователь только что опубликовал — но не может одним кликом посмотреть, как его карточка выглядит для арендатора. Приходится открывать `/listings` вручную и искать свой объект среди десятка одинаковых.
  - Как должно: в тосте — кнопка "View as tenant →" с прямой ссылкой на `/listings/{id}`.

- [ ] **UX-33. Модалка `When is this listing available?` — поле `Available from` обязательно, но без валидации.**
  - Где: модалка перед публикацией.
  - Что: можно очистить дату и нажать "Go live". Также пред-заполнено сегодняшним числом — пользователь может пропустить и опубликовать с неверной датой заезда.
  - Как должно: явная подпись `*`, валидация на пустоту, дефолт "Available immediately" с возможностью выбрать конкретную дату.

- [ ] **BUG-33a. Две активные primary-кнопки одновременно: `Save property` в sticky-баре и `Go live 🚀` в модалке.**
  - Где: модалка `When is this listing available?` поверх редактора.
  - Что: модалка-overlay не блокирует `Save property` в правом-нижнем углу. На экране два primary CTA сразу: один в модалке ("Go live"), второй на фоне ("Save property"). Кликнуть можно оба. Пользователь не понимает, какой главный.
  - Как должно: при открытии модалки sticky-bar и все фоновые primary-CTA дизейблятся / прячутся / получают backdrop.

- [ ] **UX-33b. Поле `Available from` — нативный `<input type="date">` с маской `dd/mm/yyyy`.**
  - Где: модалка публикации.
  - Что: ввод даты через нативный браузерный контрол: пользователь ставит курсор, видит `dd/mm/yyyy`, не понимает, что от него ждут — текст или клик по иконке. На Mac и Windows выглядит по-разному, на iOS — третий вариант. Это везде, где платформа собирает свои дизайнерские контролы, выглядит особенно дёшево.
  - Как должно: кастомный date-picker (как у вас в booking-flow) с понятным календарём и текстовой подсказкой формата.

- [ ] **UX-33c. `Available until (optional)` — то же нативное поле без подсказки, что вводить.**
  - Где: модалка публикации.
  - Что: подпись говорит "optional — leave blank for open-ended", но при фокусе на пустом поле — `dd/mm/yyyy` placeholder, без объяснения что это и зачем. Пользователь видит "available until" и думает: "до какого числа что? до заезда? до контракта? до публикации?". Без контекста смущает.
  - Как должно: переформулировать `Listing visible until` или `Stop accepting requests after` + поясняющий хелпер ("Empty = published indefinitely. Pick a date if you want the listing to auto-hide after that day").

- [ ] **BUG-36. Дропдаун подсказок Street address перекрывается картой (z-index конфликт).**
  - Где: `Address & location` → поле `Street address` при наборе.
  - Что: автокомплит-suggestions выпадают вниз и сразу попадают под блок карты — пользователь видит только верхнюю строчку подсказки, остальные обрезаются картой. На скриншоте не было заметно, потому что я набирал текст и сразу скроллил вниз. Реальный юзер увидит "поломанный" дропдаун и кликнет на карту вместо подсказки → перезапись адреса (см. `BUG-01`).
  - Как должно: дропдаун с правильным `z-index` поверх всех соседних блоков, минимум — `position: fixed/portal` с порталом в body, чтобы не зависеть от соседей по DOM.

- [ ] **UX-34. Status "Vacant" в sidebar после публикации — некорректная метка.**
  - Где: sidebar редактора.
  - Что: после `Go live` status "Vacant" остался без изменения. Vacant означает "никто не живёт", но пользователь только что нажал кнопку публикации — он ждёт изменения статуса на "Listed" / "Published" / "Live".
  - Как должно: два разных измерения — Listed (есть/нет на marketplace) и Vacant (есть/нет жильца).

- [ ] **BUG-35. Подтверждается BUG-18 на live-объекте: Floor 2/27 вместо введённого 8/27.**
  - Где: `/listings/{id}` детальная страница, блок specs.
  - Что: пользователь ввёл Unit floor 8 при заполнении Property type & size, но после взаимодействия со spinner значение сбросилось на 2 — и опубликовалось как 2/27. Арендатор увидит неверную информацию.
  - Как должно: фиксить корневой BUG-18.

---

## Что НЕ смогла проверить из автоматизации (нужен живой прогон)
- Сценарий "Я передумала" (вернуться в раздел Pricing после Listing title — обновляется ли сводка корректно при изменении после публикации).
- Поведение редактирования полей после публикации (нужно ли пере-публиковать, есть ли черновики изменений).
- Notification к арендаторам после публикации.

---

## Статус исправлений (2026-05-23)

### Исправлено в этой сессии (frontend)

| # | Что | Фикс |
|---|-----|------|
| BUG-01 | Карта перезаписывает введённый адрес | map onChange не трогает streetAddress/zipCode если user уже что-то вписал |
| BUG-02 | AI title вставляется поверх печатаемого текста | auto-insert заблокирован когда поле в фокусе или user уже редактировал |
| BUG-03 | "auto-save as you go" — ложь | копирайт исправлен на честный ("saves when you click Save property") |
| BUG-11 | Кнопка "Create account" без ToS | кнопка disabled пока acceptedTerms = false |
| BUG-17 | "0 of 10 photos" без минимума | счётчик → "0 of 10 · min 1 to publish" |
| BUG-25/UX-25 | Конфетти на любом тапе | confetti только на milestone, floatPlusOne — на каждом |
| BUG-32 | Marketplace карточка с generic title | используем listing.title, fallback → "{type} in {city}" |
| UX-30 | Publish → остаётся после публикации | кнопка меняется на "View on marketplace →" |
| UX-31 | Нет CTA "View on marketplace" | появляется сразу после Go live |

### Исправлено в этой сессии (продолжение — 2026-05-23)

| # | Что | Фикс |
|---|-----|------|
| BUG-04 | City dropdown = только Chiang Mai | `useMarketplaceCities()` → `useReferenceCities()`, новый хук + API call |
| BUG-37 | Self-booking guard (frontend) | ✅ FIXED — BE-22 задеплоен, `ownerId` в `MarketplaceListingDto`; guard через `useMyProfile()` активен |
| BUG-48 | Cover-photo не грузится в карточках | убран `loading="lazy"` с card `<img>` |
| BUG-54 | Move-in date ограничен 30 днями | лимит → 6 месяцев в `booking-widget.tsx` |
| BUG-40 | Deposit в виджете = monthRate | `depositAmount` прокинут в тип + props виджета |

### Требует воспроизведения (frontend, без бэка)

| # | Что | Почему не сделано |
|---|-----|-------------------|
| BUG-18 | Unit floor сбрасывается при выборе типа | не удалось точно воспроизвести причину без запуска браузера |
| BUG-28 | UI сбрасывает фото/прогресс после Save | timing issue при hydration; нужна проверка в live браузере |
| BUG-36 | Dropdown адреса обрезается картой | overflow-hidden на article; нужен React portal — отдельная задача |
| UX-33b/c | Нативный date picker в модалке публикации | нужен кастомный date-picker |
| UX-08 | Пилюли не кликабельны | scroll-to + open логика — отдельная задача |

### Требует бэкенда (добавлено в BACKEND_ISSUES.md)

| BE-# | Что |
|------|-----|
| BE-12 | AI suggest-title → 400 gateway; local fallback игнорирует форму |
| BE-13 | listing.title пустой в preview DTO (BUG-32 workaround на фронте есть) |
| BE-14 | Нет isPublished в ListingDto (UX-30/34 workaround на фронте есть) |
| BE-20 | Finance dashboard ฿0 при реальных платежах (BUG-72) | ✅ FIXED — фильтр `DueDate` → `PaidAt` |
| BE-21 | Тестовые черновики в публичном маркетплейсе (UX-49) | ✅ FIXED — quality gate ≥1 фото + title ≥15 символов |
| BE-22 | Нет `ownerId` в `MarketplaceListingDto` — нужен для BUG-37 guard | ✅ FIXED — `OwnerId` добавлен в DTO |

---

## Cross-flow находки

- [x] **BUG-37. Self-booking: лендлорд успешно бронирует свой же объект.** — ✅ FIXED (2026-05-23): BE-22 задеплоен (`OwnerId` в `MarketplaceListingDto`). Фронтовый guard в `listing-detail-page.tsx` использует `useMyProfile()` для сравнения `myProfile.id === listing.ownerId` — вместо BookingWidget отображается панель "This is your listing · You can't book your own property."
  - Re-verify: Под Marina открыла свой листинг, выбрала даты после booking Sarah (15 Dec 2026 → 15 Mar 2027), кнопка `Request to Book` стала **активной**, модалка booking открылась без блокировки. Сейчас блокирует только date-overlap, **не self-booking**. Изначальный issue:
  - Где: `/listings/{id}` при заходе из аккаунта-владельца (Marina).
  - Что: кнопка "Request to Book" видна как обычно, вся 3-шаговая модалка (Booking → Your details → Confirm) проходится без единой ошибки, в конце "Request received! We've sent your request to the property manager." Ни фронт, ни бэк не валидируют `tenantUserId !== ownerUserId`.
  - Последствия: пользователь может через self-booking манипулировать своими же показателями (occupancy, статистика), создавать фейк-конверсии, искажать рейтинг. Также — двусмысленность: что произойдёт, если он сам себе "approve" эту заявку?
  - Как должно: на детальной странице листинга вместо `Request to Book` показывать `Edit listing` / `Manage`, если viewer === owner. На бэке — 403 при создании booking где `tenantUserId === listing.ownerUserId`.

- [x] **UX-45. Меню аккаунта содержит дубликат: "My account" и "Account".**
  - Где: правый верхний avatar-меню (в режиме лендлорда).
  - Что: два пункта с почти одинаковым названием подряд. Куда ведёт каждый — непонятно.
  - Как должно: оставить один пункт ("Profile" + "Settings", или просто "Account").

- [ ] **UX-46. Login-форма тоже предзаполнена `testtenant@siamo.test` (расширение `UX-12`).** — ✗ STILL BROKEN 2026-05-23.
  - Где: `/login`.
  - Что: при логауте и возврате — поля Email и Password предзаполнены теми же fake-данными. UX-12 фиксировал это для `/register`; подтверждаю, что и на `/login` тот же баг.
  - Как должно: чистые поля при первом визите.

- [ ] **UX-68. Login-форма не сохраняет введённые email/password — JS-state восстанавливает prefill.**
  - Где: `/login`.
  - Что: ввела `tenant@test.local`, нажала Sign in — email вернулся к pre-filled `testtenant@siamo.test`. Пришлось вводить через JS. Похоже на race-condition между React state и form input value.
  - Как должно: что введено — то и остаётся.

---

## Host requests / Reservations

- [ ] **UX-65. После approve хост не получает hint "что дальше".**
  - Где: `/me/host/requests` после approve.
  - Что: карточка перешла в APPROVED раздел, тост "Request approved" — и всё. Хост не знает: пошёл ли запрос на оплату тенанту? Нужно ли что-то делать со своей стороны? Когда видеть деньги?
  - Как должно: после approve открыть briefing-модалку "Tenant has 3 days to sign and pay. You'll be notified when both are done. Until then — status `Awaiting tenant`."

- [ ] **BUG-70. Активный host видит маркетинг-лендинг "Start hosting · ฿64k avg. monthly potential" вместо своего dashboard.**
  - Где: клик по "Hosting" в верхней nav-панели когда залогинена Marina.
  - Что: Marina — действующий host с 1 объектом, active reservation на ฿210k, signed contract. Клик "Hosting" ведёт на `/#host` — маркетинг-лендинг для новых хостов с CTA "Start hosting". Кнопка бесполезна, объекта здесь не видно, dashboard надо искать вручную через URL `/me/host/...`.
  - Как должно: если у юзера >=1 listing → "Hosting" ведёт на `/me/host/properties` (dashboard). Если 0 listings → текущий лендинг.

- [x] **BUG-72. Finance dashboard не отражает реальные платежи — все KPI ฿0 при фактически полученных ฿210,000.** — ✅ FIXED (BE-20, 2026-05-23): корень — фильтр по `DueDate` вместо `PaidAt` в `GetFinanceSummaryAsync`. Исправлено на бэке. Finance dashboard теперь корректно показывает реальные поступления.
  - Где: `/me/host/finance`.
  - Что: после того как tenant (Sarah) оплатила все 6 месяцев + депозит и контракт подписан обеими сторонами, Finance показывает: This month ฿0 (0.0% vs prev), Projected EOM ฿0, Total revenue ฿0, Net profit ฿0, "Revenue by type: No revenue data yet", "Expense breakdown: No expense data yet".
  - Это критический пробел: host не видит свой реальный доход. Может подумать что платежи не прошли и поднять support-тикет, или хуже — пытаться повторно требовать с тенанта оплату.
  - Как должно: финансовая выкладка должна обновляться по факту confirmed payments. Минимум должны быть видны Total revenue ฿245,000 (rent 175k за прошедшие месяцы + 6×35k если считать всё или 1×35k если только текущий месяц + deposit?), Net profit с учётом комиссии Siamo, breakdown по property.

- [x] **BUG-73. Tenant получил пол "Male" по умолчанию без вопроса.** — ✅ FIXED: `UpsertGuestPassportRequest.Gender` → `Gender?` (nullable). Сервис не перезаписывает значение если поле не передано. Новый гость остаётся `null` вместо `Male`.
  - Где: `/me/host/bookings/{id}` Guests tab → блок Sarah Chen.
  - Что: в карточке tenant видна строка `SG · Male · NonImmigrantB`. В booking flow tenant Sarah никогда не указывала пол. Платформа автоматически проставила "Male" — для Sarah это, очевидно, неверно (имя Sarah статистически женское).
  - Последствия: TM-30 form идёт с неверным полом — host рискует штрафом за несоответствие данных. Тенант теряет доверие к платформе если увидит.
  - Как должно: пол либо спрашивается явно (radio buttons Female/Male/Other в Your details), либо вообще не отображается в TM-30 если не требуется.

- [x] **UX-74. "NonImmigrantB" в host-карточке без пробела.** — ✅ FIXED: в `BookingGuestDto` добавлены `VisaTypeLabel` ("Non-Immigrant B") и `GenderLabel` ("Male"/"Female"). Фронт использует label-поля для отображения.
  - Где: `/me/host/bookings/{id}` блок tenant.
  - Что: визуально "NonImmigrantB" — слитное слово, плохо читается. Правильно "Non-Immigrant B" или "Non Immigrant B".
  - Как должно: enum серилизация в UI должна добавлять разделители.

- [x] **BUG-71. После login на главной для Marina нет host-навигации (Properties/Requests/Reservations/Finance).** — ✓ verified 2026-05-23: после login navi с Properties/Requests/Reservations/Finance стабильно показана на любой /me/host/* странице. На главной (`/`) — кнопка `Switch to hosting · 1` (со счётчиком), которая ведёт в host-режим. Хорошо.
  - Где: главная `/` сразу после Sign in под аккаунтом-хостом.
  - Что: header показывает обычные Browse rentals / Services / Hosting + avatar + Sign out. Меню Properties/Requests/Reservations/Finance, которое Marina видела когда заходила через интент-страницу, исчезает. Появляется только при прямом переходе в `/me/host/*`.
  - Как должно: host-навигация в header — стабильно для любой страницы при наличии active host-контекста.

- [ ] **UX-67. Host видит свою же self-booking в "AWAITING YOUR RESPONSE" (последствие `BUG-37`).**
  - Где: `/me/host/requests`.
  - Что: Marina видит заявку "Marina Sokolova · 3 months" в очереди ожидающих её же ответа. Сюрреалистично — она "ждёт ответа от себя".
  - Как должно: после фикса BUG-37 (запрет self-booking) этот UX-кейс уйдёт автоматически.

---

## Сессия 2026-05-24 — polish (theme / i18n / mobile)

- [ ] **BUG-122. Dark/Light theme toggle не работает.**
  - Где: top-bar → 🌙 Dark mode button.
  - Что: клик по кнопке "Dark mode" в шапке не меняет тему. `document.documentElement.className` остаётся "dark", `localStorage.getItem('pmc_theme')` = null до и после клика. Theme stuck в dark. Hook/handler видимо не подключён или ломается на missing default.
  - Как должно: клик переключает class `dark`↔`light` (или удаляет dark для light), сохраняет в `localStorage["pmc_theme"]`, восстанавливает при reload. Стандартный pattern Tailwind dark mode.

- [ ] **BUG-123. Language switcher EN / TH / RU не работает.**
  - Где: top-bar → "EN / TH / RU" клики на TH или RU.
  - Что: клик по TH или RU label не меняет UI язык. Текст остаётся на английском. Также accessible name на кнопках "Switch to Thai" / "Switch to Russian" предполагает что handler есть — но click no-op. Возможно i18n не подключён или translations не загружены.
  - Как должно: переключение языка применяется немедленно (все UI strings перерисовываются), сохраняется в localStorage или URL, восстанавливается при reload.

- [ ] **UX-124. Mobile viewport не проверен — `resize_window` через Chrome MCP не применяется в Cowork (или viewport не меняется в этой сессии).**
  - Что: пытался протестировать marketplace `/listings` на 390×844 viewport — резайз не применился (screenshot вернулся 1456×829). Mobile-flow остался без verify в этой сессии.
  - Нужно: ручной тест на реальном устройстве или DevTools-эмуляция в Chrome (Cmd+Shift+M).

- [ ] **BUG-125. Cover photo моего нового объекта "Verify4 Property" в marketplace card — серый плейсхолдер, хотя 3 фото загружены.**
  - Где: `/listings` Stay in Thailand grid.
  - Что: Verify4 Property опубликован, в Live Preview редактора отображается реальное фото. На marketplace card — серый плейсхолдер. То же и для "Sunny 1-bed near Nimman" (другое тестовое listing). BE-13 / lazy-loading возможно регрессировали для свежих listings, либо cover photo не выставляется автоматически (см. UX-117 — coverMediaId undefined в API ответе).
  - Как должно: при publish первое media по `sortOrder` автоматически назначается cover; marketplace card подгружает cover URL.

## Сессия 2026-05-24 — поздний регресс

- [ ] **BUG-115. Photos upload silent fail: `Listing` record не создан, фронт пытается POST на `/api/listings/undefined/media`.**
  - Где: editor нового объекта, секция Photos, "Add" button.
  - Что: пользователь создал asset (через API/UI), заполнил Address и Pricing — секции отмечены ✓, sidebar "Saved 16m ago". При клике "Add" + выборе файлов **ничего не происходит**, никаких error на UI, в console только Chrome extension noise. Проверка через API: `GET /api/listings/asset/{assetId}` возвращает **count: 0** — listing record не был создан. Frontend `uploadMedia(listingId, file)` дёргает `POST /api/listings/${undefined}/media`, FormData отправляется, BE возвращает 404 (или 400), фронт обрабатывает silently без toast/inline-error.
  - Воспроизведение: 1) Создать asset через `POST /api/assets`. 2) Открыть `/me/host/properties/{assetId}`. 3) Заполнить Pricing (rate + deposit), Save. 4) Открыть Photos. 5) Кликнуть Add → выбрать фото. → Ничего не появляется в галерее, сеть показывает 404 на `/api/listings/undefined/media` или фронт даже не отправляет запрос потому что `listingId === undefined`.
  - Как должно: frontend должен **создавать `Listing` record автоматически** при первом сохранении любой секции (Address/Pricing/Photos) — POST `/api/listings { assetId, defaults }` чтобы получить `listingId`. Затем uploads и updates через тот id. Если listing уже есть — переиспользовать. Сейчас он создаётся только при Photos upload или Save & finish — chicken-and-egg.
  - **Импакт**: блокер publish для всех новых объектов после изменения flow создания. Пользователь не может опубликовать объект — UI принимает asset-fields, но photos не добавляются никогда.

- [ ] **BUG-116. /me/host/finance UI открывается для tenant Sarah — отображает ฿0 везде вместо access-denied.**
  - Где: `/me/host/finance` через прямой URL navigate.
  - Что: BE-28 fixed — API возвращает 403 для tenant на `/api/finance/*`. Но UI route guard на `/me/host/finance` не проверяет `capabilities.isLandlord` — рендерит Finance Dashboard с ฿0 (потому что axios глотает 403, query state idle, скелетон не показан, рендерится empty state). Sarah видит "Finance" заголовок и думает что у неё нет дохода — она tenant, она вообще не должна видеть эту страницу.
  - Как должно: AuthGuard на `/me/host/*` должен проверять `!isLandlord` → redirect на `/me/guest/applications` (или показать "You need to list a property first" page с CTA).

---

- [ ] **UX-144. Host ticket detail не показывает имени тенанта-репортёра.**
  - Где: `/me/host/tickets/:id`.
  - Что: видно `T-E5408A40 🔥 Title · Description · Property: Sunny 1-bed · Opened: 24 May`. Нет блока `Reported by: Sarah Chen · sarah@test.local` или ссылки на её booking detail. Marina не знает, кто это.
  - Как должно: в правой sidebar колонке секция `Reported by` с именем + аватаром + ссылка `View booking →`.
  - Почему важно: при множественных тикетах от разных бронирований host не понимает, кому отвечать в чате; не может быстро открыть нужное бронирование.

## UX-пробег 2026-05-24 — холодное чтение кабинетов

### Landlord cabinet (Marina)

- [x] **UX-157. `My properties` card: «Sarah Chen · Active tenant» — но Sarah pre-checkin (Confirmed, 22 дня до).**
  - Где: `/me/host/properties`.
  - Что: status "Active tenant" — но Sarah ещё не въехала. "Active" = живёт сейчас. Marina путается: тенант реально живёт или ещё нет?
  - Как должно: `Confirmed · Move-in in 22 days`. Active — только после check-in date.

- [ ] **UX-158. `My properties` card lacks revenue / occupancy glance.**
  - Где: `/me/host/properties`.
  - Что: card показывает только фото / title / specs / tenant. Нет `฿35,000/mo · Next payment X · Booked through Dec 15 · 100% occupied next 6mo`.
  - Как должно: 2-3 ключевые финансовые метрики прямо на card — это самый частый glance хоста.

- [ ] **🚨 BUG-159. `Booking requests` показывает Marina её own self-application на её own listing как «Awaiting your response».**
  - Где: `/me/host/requests` → AWAITING YOUR RESPONSE → Marina Sokolova, Sunny 1-bed, 23 May 2026 · 3 months.
  - Что: Marina видит свою собственную заявку (видимо, тест-данные от первого QA). Status «Awaiting your response · Auto-expires in 1d 21h». Если она click Approve — забронирует своё же жильё сама себе. self-booking guard на marketplace (BE-22) есть, но не очищает existing pending requests + не предотвращает host approve self.
  - Как должно: либо host видит свои self-requests в отдельной секции `Your own (test)`, либо backend на этапе query фильтрует `WHERE guestId != listing.ownerId`. Approve self → 403.

- [ ] **🚨 UX-160. `Booking requests`: Liam Walsh показан как «Awaiting your response» хотя Mike на тех же датах уже approved.**
  - Где: `/me/host/requests` (отражение BUG-131 со стороны host).
  - Что: Marina видит 2 заявки на Jan 15 - Mar 15 2027 в AWAITING YOUR RESPONSE — Liam (Pending) и сразу же ниже одобренный Mike в APPROVED. Marina может попытаться approve Liam → 500 (BUG-132). Никакого визуального indication «эти даты конфликтуют с уже подтверждённым Mike».
  - Как должно: после approve Mike — Liam'а карточка автоматически в `AUTO-DECLINED · Dates already booked`, с CTA «Suggest other dates» / `Notify guest`.

- [x] **UX-161. ✅ FIXED —  `Booking requests` — Approved секция захламляет inbox.**
  - Где: `/me/host/requests` → APPROVED.
  - Что: Mike Park + Sarah Chen лежат в APPROVED списке. Это уже стали бронированиями — должны жить в Reservations, не плодить дубли. Inbox теряет фокус.
  - Как должно: APPROVED секция collapsed по умолчанию, или показывает только за последние 7д, либо вообще убирается (есть Reservations).

- [ ] **UX-162. `Booking requests` — все карточки выглядят почти одинаково (та же фото-обложка, тот же price, разные дата+имя).**
  - Где: `/me/host/requests`.
  - Что: 4 карточки Sunny 1-bed подряд — одинаковая обложка, одинаковая цена ฿35,000/mo. Различаются только именем + датами. Marina при множественных request путается, кто кто.
  - Как должно: либо outline avatar тенанта крупным, либо колонка вычитки `Sarah Chen · 6mo · ฿210k total · Pet-friendly` чтобы выделить.

- [ ] **UX-163. `Reservations` карточка lacks contract / payment / TM-30 status glance.**
  - Где: `/me/host/bookings`.
  - Что: card показывает только Sarah Chen / даты / ฿35,000/mo / Move-in 15 Jun. Нет: contract signed, 6/6 paid, TM-30 pending. Marina вынуждена кликнуть чтобы понять полное состояние.
  - Как должно: under tenant name — chips `✓ Signed`, `✓ 6/6 paid`, `⚠ TM-30 pending` (или подобное).

- [x] **UX-164. `Reservations` Past tab — без preview какие там данные / есть ли вообще.**
  - Где: `/me/host/bookings` → Past.
  - Что: tab без счётчика. Marina не знает, есть ли там что — кликает наугад.
  - Как должно: `Past · 0` или скрывать tab пока пусто.

### Profile / Settings (общее для обеих ролей)

## Beauty sweep — Landlord cabinet 2026-05-24

> Вердикт: landlord cabinet — **лучше tenant'а** (есть navigation: Properties / Requests / Reservations / Finance, есть Add property CTA с sparkle, property card с фото). Но финансово/operationally — **shallow data, sparse signals, чувствуется engineer-made**, не «host's command center». Marina не чувствует pride / earnings / momentum.

- [ ] **UX-224. Нет Landlord Dashboard / Home — должен быть main entry.**
  - Где: после login Marina лендит на `/me/host/properties` (Properties list).
  - Что: 4 пустых tab (Properties / Requests / Reservations / Finance) без overview-страницы. Marina хочет видеть: «฿35,000 collected this month · 2 pending requests need review · Sarah checks in in 22 days · 0/1 TM-30 to file · ★ 4.9 average rating · Tip: enable instant-book to fill May».
  - Как должно: `/me/host/` (home) — hero greeting, KPI tiles, next actions (Approve, File TM-30, Sign), upcoming check-ins calendar mini-widget, recent reviews snippet, tips/insights.

- [ ] **UX-225. `My properties` card — bare-bones, missing key data.**
  - Где: `/me/host/properties`.
  - Что: card показывает только photo + title + 1 bed · 2 bath · 62 m² + «Sarah Chen · Active tenant». Нет revenue (฿35k/mo earning), нет occupancy (100% next 6mo / booked through Dec 15), нет next payment, нет rating, нет # requests.
  - Как должно: chips под title `฿35,000/mo · 100% occupied · Next payment Jun 15 · ★ 4.9 · 1 request waiting`. Hover → cooler stats popup.

- [ ] **UX-226. Огромное пустое пространство справа от Property card.**
  - Где: `/me/host/properties` (Marina has 1 property).
  - Что: card в left side ~25%, 75% — пустота. Можно показать «Today» feed: «🆕 Liam applied 2h ago · ✅ Mike signed contract · 💰 May rent received · 📊 Your earnings this month +฿35k».
  - Как должно: 2-column layout — properties list + activity feed.

- [ ] **UX-227. `My properties` нет revenue summary / quick stats top-of-page.**
  - Где: top of /me/host/properties.
  - Что: только title «My properties» + Add property CTA. Нет «฿280,000 total earned · 1 active stay · 2 pending requests · 0 disputes» strip.
  - Как должно: top KPI-strip как у Finance dashboard но более targeted (action-required focus).

- [ ] **UX-228. Finance dashboard — 4 KPI cards все ฿280,000 (идентичные суммы).**
  - Где: `/me/host/finance`.
  - Что: «This month ฿280,000 / Projected EOM ฿280,000 / Total revenue ฿280,000 / Gross revenue ฿280,000» — все 4 одинаковые. Marina видит и не понимает, что разнятся 4 metric'а — выглядит как duplicate data.
  - Как должно: дифференцировать. This month — actually collected this month (rolling); Projected EOM — forecast; Total revenue — historical (life-time); Gross revenue — before fees. Если у Marina все равны (свежий хост) — собрать в один summary card вместо 4 повторяющихся.

- [ ] **UX-229. Finance: «Revenue by type» — 2 bars (Deposit / Rent) — нет time-series.**
  - Где: Finance.
  - Что: chart показывает 2 категории. Нет trend over months — это для долгосрочного хоста critical. «Sep ฿35k · Oct ฿35k · Nov ฿35k» — line chart was bare minimum.
  - Как должно: 12-мес line chart + projection. Hover → tooltip с breakdown.

- [ ] **UX-230. Finance Expense breakdown empty с «No expense data yet» без CTA.**
  - Где: Finance right column.
  - Что: Marina видит «нет expense data» — должна добавить, но нет «Add expense» button. Dead-end card.
  - Как должно: CTA «➕ Add expense (utilities, repairs, taxes)» с modal-form. Чтобы Marina могла tracking своих real costs.

- [ ] **UX-231. Reservations page — пустой («No reservations yet») при Sarah's confirmed booking → backend regression + UX-bare.**
  - Где: `/me/host/bookings`.
  - Что: «No reservations yet» — но Sarah is confirmed (BE-Reg-2 regression). UI even empty looks bare — icon + 1 line.
  - Как должно: даже empty state — «Your first reservation will appear here. Tips on getting more bookings → [Improve listing]».

- [ ] **UX-232. Нет messages / inbox для host'а.**
  - Где: вся nav.
  - Что: tenant хочет message host — нельзя. Host тоже не имеет inbox.
  - Как должно: централизованный Messages-tab — по booking-threads.

- [ ] **UX-233. Нет «Today» / Upcoming task list.**
  - Где: cabinet.
  - Что: Marina не имеет «to-do today» — что approve, что file, кому ответить. Каждый раз — поход в Requests tab + Reservations tab + TM-30 sub-tab.
  - Как должно: top of cabinet — «3 things need your attention: ⚠️ 2 requests pending · ⚠️ TM-30 to file 14 Jun · 💰 Payout received».

- [ ] **UX-234. Mode-toggle «Hosting · 1 / Renting · 1» в header у landlord — Renting=1 для Marina (она не tenant нигде, но badge есть).**
  - Где: header на всех страницах.
  - Что: counter «Renting · 1» — что это? Marina не имеет stays/applications. Возможно self-application (BUG-159 backend leak). Counter лжёт.
  - Как должно: либо честный 0, либо скрыть Renting если у Marina нет guest-activity.

### Approve booking flow

- [ ] **UX-239. Approve кнопка — one-click без confirmation modal.**
  - Где: `/me/host/requests/:id` → Approve.
  - Что: click → loading state → toast «Request approved» → redirect. Никакого «Confirm approving Sarah's request for ฿35,000/mo over 1 month?» dialog.
  - Riska: для финансовой commit (Marina принимает rental commitment ~ ฿100k-1M) — one-click без подтверждения. Случайный tap на mobile — мгновенный approve.
  - Как должно: confirm modal с summary `Approve Sarah Chen for Sunny 1-bed · 1 Oct 2027 – 1 Nov 2027 · ฿35,000 total · ฿70,000 deposit · This sends rental agreement for both signatures`. + checkbox «I confirm dates and amount» + Cancel/Confirm.
  - Как минимум: undo-toast 5s («Approved. Undo?») как Gmail.

- [ ] **UX-240. После approve — toast но никакого «next steps» onboarding.**
  - Где: same screen.
  - Что: toast «Request approved» исчезает за 3s. Marina не знает что дальше — нужно ли подписать contract? Когда payment? Где tracking?
  - Как должно: после approve — fullscreen success modal «✓ Approved! Here's what happens next: 1. Sarah signs the contract (24h) · 2. You countersign · 3. Sarah pays first month + deposit · 4. Move-in on Oct 1. We'll notify you at each step.»

### TM-30 filing UI (host side)

- [ ] **✅ POSITIVE PATTERN. TM-30 filing UI на Guests tab — solid.**
  - Где: `/me/host/bookings/:id` → Guests tab.
  - Что: банер «TM-30 filing required · 1 of 1 foreign guest unreported. Thai immigration fine exposure: up to ฿2,000.» + 3 CTA: `Download TM-30 template`, `How to file`, `Open immigration portal ↗`. + «Each non-Thai guest needs a TM-30 receipt uploaded after you file.» + per-guest card.
  - Это хороший паттерн compliance-flow.

- [x] **🚨 UX-216. ✅ FIXED —  TM-30 red urgency банер показывается за 22 дня до check-in — преждевременная паника.**
  - Где: TM-30 filing banner.
  - Что: Sarah check-in 15 Jun (22 days from now). TM-30 filing required в течение 24h ПОСЛЕ arrival. Сейчас показывать «filing required · fine up to ฿2,000» — early panic.
  - Как должно: до check-in date — show neutral «TM-30 will be required within 24h of check-in (15 Jun). [Prepare template]» серым. После check-in (window opens) — red urgency.
  - Почему важно: marina freaks out, кликает «file now» — backend reject (нельзя filing до arrival). UX disconnect от ритма Thai immigration.

### Property editor sections

- [ ] **UX-207. Address & location autocomplete suggests «Torpong Pediatric Clinic» вместо apartment address.**
  - Где: `/me/host/properties/:id` → Address & location → Street address.
  - Что: Marina ввела `29/1 Hassadhisawee Road` (свой apartment) — autocomplete снизу предложил «Torpong Pediatric Clinic, 29/1, Hassadhisawee Road, Chiang Mai City Municipality, Fa Ham, Mueang Chiang Mai District, Chiang Mai Province, 50030, Thailand». Если хост tap — её листинг станет «Torpong Pediatric Clinic». Опасное merging.
  - Как должно: либо exclude POI-результаты, либо разделить (Street address ↔ Map pin) и autocomplete только для streets, не для businesses.

- [ ] **UX-208. Section status pill green-check для Amenities при «Not set — tap to fill in».**
  - Где: `/me/host/properties/:id` → Amenities.
  - Что: pill ✓ зелёный, но copy «Not set — tap to fill in · 3 min». Contradiction. Same UX-49 anomaly.
  - Как должно: pill stays amber/neutral до явного review.

- [ ] **UX-209. `Hosting · / Renting · 1` персистит над property-editor — для хоста, в работе с listing, режим-toggle не имеет смысла.**

## Round 11 — Hypotheses + TM-30 flow 2026-05-26

- [ ] **✅ TM-30 host UI верифицирован solid.**
  - Где: `/me/host/bookings/:id` → Guests tab.
  - Что отлично:
    - Statefull banner: «You're fully compliant — TM-30 filed for all guests» / «1 of 1 filings on record. No action needed until a new guest arrives.» (compliant) vs red urgency (before filing)
    - Per-guest card с full passport details (number/expiry/nationality/visa/DOB/Entry port)
    - TM-30 row: `Filed 24 May 2026` badge + `View` + `Replace` buttons
    - TM-30 FILING tile: «1/1 filed · Compliant» green
    - Tab counter «Guests · 1 · 1/1 TM-30»
  - Use as референс для compliance flows.

- [x] **🚨 BUG-249. ✅ FRONTEND FIXED (upload disabled before check-in) — BACKEND still needed —  TM-30 можно filed 22 дня до check-in — нарушает Thai immigration law.**
  - Где: `POST /api/bookings/{id}/guests/{guestId}/tm30/upload`.
  - Что: Sarah check-in 15 Jun 2026. TM-30 filed 24 May 2026 (today, 22 days before). По Thai immigration rule TM-30 должен filing within 24h **после** arrival (не до).
  - Как должно: backend reject upload пока `now < checkInDate`. Frontend disables «Upload TM-30 receipt» button или показывает «Available after check-in».

### Hypotheses verified (running notes)

- ✅ **H-01** Host видит «Awaiting payment» badge явно для Mike + Sarah's new booking в Reservations tab.
- ⏳ **H-02** Auto-expire 3d — нельзя проверить без time-travel.
- ✅ **H-03** Reject reason templates — recorded Round 5 (5 pre-canned + custom).
- ⏳ **H-04** Expired application copy — нет реальных expired apps для проверки.
- ✅ **H-05** Two tenants race — BUG-131 recorded.
- ✅ **H-06** Listing видим на marketplace несмотря на confirmed booking. Booking widget сам блокирует conflicting dates.
- ✅ **H-07** Cross-date conflict → «Use this date» pattern works.
- ✅ **H-08** Cancellation refund boundaries — BUG-128 (netRefund ignores pre-paid rent).
- ✅ **H-09** Early-exit penalty — BUG-128.

7/9 закрыты, 2 нельзя проверить без специальной staging.

## Round 10 — Adversarial 2026-05-26

- [x] **BUG-245. ✅ FIXED —  Payment details: Account number принимает спецсимволы и unlimited length.**
  - Где: Property wizard → Payment details → Account number.
  - Что: `<input type="text" maxLength="-1">`. setNative `!@#$%^&*()_` сохраняется, 25-значное число сохраняется. Thai bank account numbers — 10 digits. Backend получит garbage.
  - Как должно: `inputMode="numeric" pattern="\d{10,12}" maxLength={12}` + frontend strip non-digits на blur. Backend separate validation.

- [ ] **UX-246. Payment details: warning «Fill in your bank details — without this, bookings stall at the payment step»** — отличный copy, использовать как референс для других finance fields.

- [ ] **✅ Contact details fix verified**: LINE chip toggle → LINE ID required (*) появляется, value persists через toggle off/on, save blocked если пусто.

- [ ] **✅ Payment details fix verified**: PromptPay убран полностью, только Bank section. Account name prefilled из user.fullName.

- [ ] **UX-247. Photos upload: HEIC явно rejected — Thai iPhone users увидят friction.**
  - Где: Property wizard → Photos section.
  - Что: photos.tsx line 32: `if (/\.(heic|heif)$/i.test(name)) rejected.push({reason: "HEIC/HEIF not supported — export as JPEG"})`. iPhone с iOS 11+ default-saves фото в HEIC. Thai market = много iPhone users. Tenant-host workflow: «сфоткал → загрузить → нет, конвертируй» = drop-off.
  - Как должно: либо frontend конвертирует HEIC→JPEG через `heic-to` / `libheif-js`, либо backend принимает HEIC и конвертирует (preferable — less bundle weight).

- [ ] **UX-248. Photo upload: MIME-only validation bypassable.**
  - Где: photos.tsx — `if (!ALLOWED_MIME.has(file.type))`.
  - Что: `file.type` определяется браузером по extension. Файл `payload.pdf` переименованный в `photo.jpg` имеет `file.type = "image/jpeg"`. Frontend пропустит, backend должен sniff magic bytes.
  - Как должно: backend проверяет actual file header bytes (PNG signature `89 50 4E 47`, JPEG `FF D8 FF`, etc.) перед сохранением. Frontend — best-effort defense.

- [ ] **✅ Publish modal fix verified**: indigo→violet gradient hero + Rocket icon + «Ready to go live?» + «Set your availability — you can change it anytime». «Available from» date (min=today) + «Listed for» dropdown (1/2/3/6/12 months + Open-ended). Hint copy auto-explains. Cancel + «Go live 🚀» с loading state.

### Reject application modal

- [ ] **✅ POSITIVE PATTERN. Reject request modal — образец host-empathy UX.**
  - Где: `/me/host/requests/:id` → Reject CTA.
  - Что отлично: 5 pre-canned reasons (already reserved / другой apliцент / move-in date doesn't work / pets at this time / maintenance) — click → red border на template + auto-fill в textarea. Marina может оставить как есть или дописать. Copy «Let the guest know why — it helps them find better options» снимает guilt с reject.
  - Use as референс для всех reason-required dialogs.

### Utilities flow

- [ ] **🚨 BUG-193. "Open the property page" — текст без link, тенант-booking Utilities tab dead-end.**
  - Где: host `/me/host/bookings/:id` → Utilities tab.
  - Что: видно `No electricity meter linked · Add a PEA meter in property settings to track the bill here.` + footer `Utility setup (PEA / water / internet) is managed at the property level. Open the property page to add or edit contracts.`. **«Open the property page» не link.** Host вынужден сам копать.
  - Как должно: «Open the property page» → clickable link на `/me/host/properties/:assetId#utilities`.

- [ ] **UX-194. `Utilities included` секция: ✓ зелёная галка при ВСЕХ unchecked → UX-49 anomaly.**
  - Где: `/me/host/properties/:id` → Utilities included.
  - Что: «None included — tenant pays separately» = валидный default, но section status pill зелёный ✓ как если бы хост подтвердил. Хост пропускает open, не зная что есть выбор.
  - Как должно: pill stays neutral / amber `Not yet reviewed` пока хост не tap secций или явно не сохранит default.

- [ ] **UX-195. Utility «Air-conditioning» как отдельный пункт — это часть Electricity.**
  - Где: Utilities included checkboxes.
  - Что: Electricity / Water / Internet/WiFi / Air-conditioning / Garbage collection — A/C это под Electricity. Confusing.
  - Как должно: либо убрать A/C (под Electricity), либо чётко объяснить «A/C is metered separately at this property» (что редко).

- [ ] **UX-196. PEA = Provincial Electricity Authority — local Thai abbr, foreigner-landlords не знают.**
  - Где: footer Utilities tab.
  - Что: `Add a PEA meter in property settings` — фаранг-landlord без контекста не понимает.
  - Как должно: «Add an electricity meter (PEA bill number, found on your monthly bill)».

- [ ] **UX-197. Add utility dialog существует но не легко findable.**
  - Где: `src/features/me/host/properties/detail-page.tsx` — есть `addUtilityOpen` dialog с Type / Provider name / Account number. Однако этот file НЕ зарегистрирован как route в App.tsx (только PropertyEditorPage на `/me/host/properties/:id`). UI существует но недоступен через navigation.
  - Как должно: либо integrate dialog в editor's Utilities section, либо отдельный `/me/host/properties/:id/utilities` route.

### Property creation wizard

- [ ] **✅ POSITIVE PATTERN. Wizard /me/host/properties/new — gold standard кабинетной формы.**
  - Где: `/me/host/properties/new`.
  - Что отлично: «0 of 10 required steps» с прогресс-баром, «A few quick steps — most hosts finish in under 6 minutes», «Smart defaults are pre-filled», «Your data saves when you click Save property», numbered step-chips, per-section time estimates («1 min», «30 sec», «3 min»), social proof «200+ tenants looking in Thailand right now», sticky `0/10 required steps · keep going · Save property`, LIVE PREVIEW sidebar «how tenants see it», keyboard hint «↵ to save», «Up next: Address & location» автозовёт к next.
  - **Использовать как UX-референс** для остальных flow (tenant booking, contract signing, переключение режима).

- [ ] **🚨 BUG-188. `Save property` button disabled но выглядит активным green.**
  - Где: top right CTA и sticky bottom CTA — оба зелёные filled при `0/10 required steps`. Хост кликает — silence.
  - Как должно: opacity-50 + cursor not-allowed + inline tooltip «Fill 10 required steps first». Same pattern as Continue (BUG-180) — глобальная проблема UI.

- [ ] **UX-189. Live Preview показывает specs «1 bed · 2 guests» до того, как хост что-то заполнил — UX-49 anomaly.**
  - Где: LIVE PREVIEW sidebar при пустом черновике.
  - Что: внизу превью видны «🛏 — · 1 · 2» = неустановленные beds, 1 bath default, 2 guests default. Live preview обещает «how tenants see it» — но Tenant увидит листинг с этими defaults если хост случайно сохранит без проверки.
  - Как должно: до заполнения Property type — preview показывает «Set specs to see your place» вместо догадочных дефолтов.

- [ ] **UX-190. Social proof «200+ tenants looking in Thailand right now» — реальное число или decorative?**
  - Где: блок ниже стартовой копии.
  - Что: если фейк — постепенно эрозия доверия. Если реально — нужно freshness («updated 5 min ago»).
  - Как должно: либо живой backend feed, либо честная подача «Thousands have signed up».

### First-run (freshly registered Alex)

- [ ] **✅ HOSTING first-run выглядит ОТЛИЧНО.**
  - Где: `/me/host/properties` для пустого аккаунта.
  - Что: Hero icon + «List your first property» + копия про vetted tenants + большая CTA `+ Add property` с sparkle-анимацией + 3 value-prop cards (Verified tenants / On-time payments / Full management). Эмоционально, мотивационно, понятно.
  - **Используйте как референс** для tenant first-run.

- [ ] **UX-171. RENTING first-run в контрасте — анемичный empty state.**
  - Где: `/me/guest/bookings` сразу после регистрации Alex.
  - Что: `No stays yet · Time to find your next place in Thailand · [Browse ads]`. Минимально-плоско. Никаких value props, никаких "Welcome to Siamo, Alex!", никаких профиль-completion stepper'ов, никаких hero-images.
  - Как должно: симметрично landlord-first-run. Hero `Find your home in Thailand` + 3 value-props (`Verified hosts`, `Bilingual contracts`, `Escrowed deposit`) + Browse + Complete profile checklist (3/4 steps to be book-ready).

- [ ] **UX-172. CTA inconsistency: «Browse rentals» (header) vs «Browse ads» (empty state) — одна и та же действие, разный copy.**

- [ ] **UX-173. После регистрации не определена роль / нет onboarding выбора.**
  - Где: после `/register` сразу попадает на /me/guest/bookings.
  - Что: система не спрашивает «вы хотите снимать или сдавать?». Если Alex landlord — он сам должен догадаться кликнуть `Hosting` чтобы добраться до пустого `/me/host/properties` и нажать `Add property`. Нет интро-modal с 2 путями.
  - Как должно: после регистрации показать modal «What brings you to Siamo? · I want to rent a home (Tenant) / I want to list my property (Landlord) / Both». На основе выбора — соответствующий onboarding.

- [ ] **UX-174. Hosting empty mode: navigation tabs (Properties / Requests / Reservations / Finance) скрыты, no breadcrumb.**
  - Где: `/me/host/requests` через direct URL для пустого Alex.
  - Что: top nav показывает только `Browse rentals`. Внутри страницы — нет breadcrumb / back-link. Если пользователь поделил URL — попадает в тупик.
  - Как должно: даже на empty hosting mode оставить breadcrumb `Hosting → Booking requests` или back-link.

- [x] **🚨 BUG-165. Security секция: НЕТ смены пароля, нет 2FA, нет active sessions.**
  - Где: `/me/profile?s=security`.
  - Что: единственный контент — `Email · used to sign in` + `Sign out`. **Нельзя сменить пароль через UI.** Если кто-то скомпрометировал учётку — пользователь беспомощен. На платформе где люди передают паспорта, банк-реквизиты, оплачивают ฿200k+ — отсутствие даже базового password change — production blocker.
  - Как должно: `Change password`, `Two-factor authentication`, `Active sessions / devices`, `Login history`, `Download my data`, `Delete account`.
  - **FIX**: добавлена форма смены пароля в `SectionSecurity` (`profile.tsx`). Current + new + confirm поля, show/hide toggle, валидация длины и совпадения. LINE-only аккаунты видят информационное сообщение вместо формы. Вызов `POST /api/auth/change-password` через новый `useChangePassword` хук.

- [ ] **BUG-166. Documents vault показывает «No documents yet» хотя контракт подписан.**
  - Где: `/me/profile?s=documents` (Marina, у которой подписан 6-мес контракт с Sarah).
  - Что: «A vault for everything legal: TM-30 receipts, signed contracts, passport scans» — но `No documents yet.` Контракт же существует (`Contract: Signed · Download PDF` на booking detail). Vault не подсасывает signed contracts.
  - Как должно: после подписания контракта — PDF автоматически попадает в Documents vault. Фильтры: Contracts / TM-30 / Receipts / Identity.

- [ ] **UX-167. Account menu — только 2 пункта (Profile / Sign out) — отсутствуют важные.**
  - Где: ≡ menu top right.
  - Что: Profile / Sign out. Нет: Help & support, Notifications inbox, Refer a friend, Switch language inline (есть отдельный chip), Dark/light, Legal/terms.
  - Как должно: добавить хотя бы Help / Contact us, Switch theme + lang в одном меню.

- [ ] **UX-168. Sidebar nav pills в Profile (Email/Phone/Passport) — non-clickable.**
  - Где: левая sidebar Profile.
  - Что: `Phone ✓` / `Passport ✗` — кликов нет, нужно догадаться идти в соответствующий раздел.
  - Как должно: clickable pill → go to that section.

- [x] **UX-169. Profile mode-tabs `Hosting · / Renting ·` persist на /me/profile.**
  - Где: header на всех /me/profile/*.
  - Что: tabs «Hosting · 1 / Renting · 1» — на странице settings бессмысленны, добавляют когнитивный шум.
  - Как должно: скрывать на settings.
  - **FIX**: `isToggleHidden` в `topbar.tsx` уже содержал `pathname.startsWith("/me/profile") → true`. Было реализовано в предыдущей сессии.

- [ ] **UX-170. `Hosting · 1 / Renting · 1` у Marina — что значит `Renting · 1`?**
  - Где: header (Marina, landlord one property, but Renting · 1).
  - Что: Marina не подавала заявки и не имеет бронирований как guest (только как host). Renting · 1 — счётчик чего? Tested: возможно это её собственная self-application в Booking requests, или какое-то иное. Tenant cabinet у Marina пуст.
  - Как должно: hover/click показывает что именно. Если это self-application — не считать.

- [ ] **BUG-140. House rules toggle на Occupied property: нет warning хосту, нет notification тенанту.**
  - Где: `/me/host/properties/:assetId` → House rules & WiFi → toggle любого pip (например, добавил "No parties or events") → Update & continue.
  - Что:
    1. На странице property editor статус показан `Occupied` (т.е. UI знает, что Marina сейчас сдаёт). Но при попытке поменять правила — **никакого warning**: "⚠️ Sarah Chen is your current tenant. Adding 'No parties or events' will apply to her active contract — she'll be notified."
    2. После save: `GET /api/bookings/:bookingId` для Sarah отдаёт `listingChangesAfter: []` и `lastSeenListingAt: null`. То есть backend не зафиксировал изменение rules. На tenant UI — никакого банера/уведомления, что rules поменялись.
  - Как должно:
    - На host editor: если property occupied — модалка-подтверждение «Sarah Chen is currently renting — she'll see the new rule in her booking. Continue?»
    - После save: backend пишет change-event в `listingChangesAfter` для всех активных booking'ов на этом listing, шлёт email/push. Tenant UI рисует баннер «Marina updated House rules — review changes».
  - Почему важно: tenant подписал контракт с одним набором правил. Хост в одностороннем порядке может добавить "No pets / No subletting / TM-30 required" задним числом, и tenant узнает только когда нарушит. Юридически правила не меняются, но UI должен это явно отражать.

- [ ] **BUG-137. Finance dashboard не отражает подтверждённую cancellation.**
  - Где: `/me/host/finance` после Marina confirm Sarah's early-exit.
  - Что: This month / Projected EOM / Total revenue / Net profit — все четыре карточки показывают `฿280,000` (= 210k rent + 70k deposit). Нет ни строки про refund ฿245k, нет downward-trend, нет flag «cancellation pending». Revenue by type chart показывает только Rent + Deposit (held).
  - Как должно: после Confirmed cancellation — отдельная строка Refunds (или Adjustments) с `-฿245,000`, Projected EOM пересчитан как `35,000`, Total revenue this month уменьшен. Cancellation также должна влиять на месячный прогноз (5 будущих месяцев не приходят).
  - Почему важно: host думает, что он заработал ฿280k и может вывести их, фактически большая часть подлежит возврату. Финансовое решение на основе фиктивной суммы.

- [ ] **UX-138. `Net profit = Total revenue`. Siamo-комиссия / fees не вычитаются (или их нет).**
  - Где: `/me/host/finance`.
  - Что: Net profit ฿280k == Total revenue ฿280k. Если у Siamo есть комиссия с host'а — она не учтена. Если её нет — формулировка `Net profit` вводит в заблуждение (Profit = Revenue without expenses). У Marina нет занесённых expenses, но в реальности их полно (utilities, repairs, taxes, agent fee).
  - Как должно: либо явно `Gross revenue` вместо `Net profit`, либо честно показать `Net profit · You haven't logged any expenses — add Utilities/Repairs to get accurate P&L`. Или показать Siamo-fee отдельной строкой.

- [ ] **UX-139. Revenue chart: Deposit (held) bar почти невидим (1px), Rent bar выглядит ~1/3 от ฿220k.**
  - Где: Revenue by type chart на /finance.
  - Что: По данным ฿210k rent + ฿70k deposit. На графике Deposit bar — почти невидимая полоска (height ≈ 0), Rent bar — на уровне ~฿55-60k вместо ฿210k. Визуально не соответствует цифрам в карточках выше.
  - Как должно: бары пропорциональны значениям; Deposit ~1/3 от Rent. Либо подписать значения на барах.

- [ ] **BUG-136. Host-side: подтверждённая cancellation НЕ отображается на booking detail у хоста.**
  - Где: `/me/host/bookings/9d186951...` — после того, как Marina сама confirm cancellation Sarah через `POST /api/bookings/cancellations/:id/confirm` ~15 мин назад.
  - Что: на странице **нулевой след** отмены: status `Confirmed`, Move-out `15 Dec 2026` (не `15 Jul`), `All rent collected · ฿210,000 received over 6 months`, Compliance: `CONTRACT Signed · PAYOUTS Set`. Никакого банера «Sarah requested early exit — your approval is recorded — refund processing». Текстовый поиск по DOM: `cancel|refund|early-exit|terminat` → 0 совпадений.
  - Как должно: на host-side booking detail — банер «✓ Early exit confirmed · Sarah moves out 15 Jul · Refund ฿245,000 processing» + Move-out card обновлён + Payments tab показывает Refund-запись. То же в Finance dashboard.
  - Почему важно: **catastrophic** — host физически не видит что отпустил тенанта, продолжает считать что Sarah остаётся до Dec 15, легко может пытаться требовать платежи которые она уже не должна, или сдавать те же даты ещё одному — двойное бронирование.
  - **Связано с BUG-134 / BE-33** — это та же проблема с другой стороны: booking entity не обновляется после Confirmed cancellation, поэтому ни tenant view, ни host view не отражают реальность.

> **Round 12 (2026-05-26) вынесен в [BUG_TRACKER.md](BUG_TRACKER.md)** — единый файл для FE/BE/QA с детальными статусами и acceptance criteria. Сюда (LANDLORD_FLOW_QA) новые находки этого round'а НЕ добавлять.

## Что в [TENANT_FLOW_QA.md](TENANT_FLOW_QA.md)

Tenant-сторона флоу (marketplace, booking, контракт, оплата) и UX-проблемы для гостя вынесены в отдельный файл — ID нумерация сквозная между обоими.
