# PMC — Workflow для тестировщика

> Эта инструкция объясняет, как тестировщик работает в одной связке с frontend (Claude / Антон) и бэкенд-командой. Все три стороны координируются через [`BUG_TRACKER.md`](BUG_TRACKER.md). Других каналов (чат, отдельные тикеты, Slack-треды) нет — всё пишется сюда.

---

## TL;DR

1. Открыть [`BUG_TRACKER.md`](BUG_TRACKER.md), отфильтровать тикеты со `Status: 🟩 Done (awaiting QA)` — это ваша очередь.
2. Воспроизвести по «Steps to reproduce» из тикета, проверить «Acceptance criteria» построчно.
3. Если работает — `✅ Closed (verified YYYY-MM-DD)`.
4. Если не работает / есть регрессия — `🟥 Reopened` + **конкретный шаг**, где сломалось.
5. Новые баги — заводить новой секцией внизу того же `BUG_TRACKER.md` по существующему формату.

---

## Где смотреть, что готово к проверке

В таблице **Index** (вверху `BUG_TRACKER.md`) — все тикеты раунда. Ваш фильтр:

| Статус | Что значит | Что делать |
|--------|-----------|-----------|
| 🟩 **Done (awaiting QA)** | FE / BE считают, что починили. | **Брать в работу.** |
| 🟨 **Blocked** | Ждут другую сторону. | Не трогать. |
| 🟧 **In progress** | Кто-то делает. | Не трогать. |
| 🟥 **New** | Никто не взял. | Не трогать (это backlog для FE / BE). |
| ✅ **Closed (verified)** | Уже проверено. | Только справочно. |
| ⛔ **Won't fix** | Решили не чинить. | Только справочно. |

Severity подскажет приоритет:
- 🔥 **Critical** — проверять первым (деньги, privacy, потеря данных).
- 🟠 **Major** — основная масса.
- 🟡 **Minor** — после Major.
- 🔵 **Polish** — когда есть время.

---

## Как верифицировать тикет

### 1. Прочитать тикет целиком

В каждой секции:
- **Problem** — что было сломано.
- **Steps to reproduce** — точный сценарий.
- **Expected behaviour** — как должно быть.
- **Acceptance criteria** — чеклист, **по которому вы и принимаете**.
- **History** — что именно сделали FE / BE (последняя строка обычно с решением).

Если в `Acceptance criteria` есть чекбоксы `[ ]`, последовательно их пройти. Помечать пройденные через UI / API сразу:

```diff
- [ ] Подсказка под полем и поведение валидации согласованы.
+ [x] Подсказка под полем и поведение валидации согласованы.
```

### 2. Воспроизвести по Steps to reproduce

Под нужной ролью (Marina = landlord, Sarah = tenant — см. `~/.claude/projects/-Users-avrefranz-RiderProjects-pmc-web/memory/browser_test_accounts.md` через Антона, у него ключи).

**Важно:** проверять **в браузере, не через curl и не через API-моки**. Тикет считается верифицированным, только если работает в реальном UI под реальным юзером.

### 3. Проверить edge-cases

Не только «happy path». Если тикет про studio bedrooms — проверить и 0, и 1, и 5. Если про cancellation policy — каждую из четырёх. Если про даты — корректные, граничные, заведомо мусорные (хотя браузер теперь не даёт ввести мусор в нативный type=date).

### 4. Проверить регрессии

Многие фиксы трогают общий код. Например, BUG-270 переписал `DateInput` глобально → проверять все формы с датами (booking-modal, contract-sign, co-resident, профиль).

### 5. Принять или отклонить

**Если работает (все Acceptance criteria выполнены):**

```diff
- **Status:** 🟩 Done (awaiting QA) · **Assignee:** Claude 2026-05-26
+ **Status:** ✅ Closed (verified 2026-05-28) · **Assignee:** Claude 2026-05-26
```

В `History`:

```markdown
- 2026-05-28 · QA · verified. Проверил под Marina (studio листинг доходит до publish,
  на маркетплейс пишется как Studio), под Sarah (booking-modal видит Studio в превью).
  Edge: bathrooms=0 заблокировано (правильно, min=1 в коде).
```

**Если не работает:**

```diff
- **Status:** 🟩 Done (awaiting QA) · **Assignee:** Claude 2026-05-26
+ **Status:** 🟥 Reopened · **Assignee:** Claude 2026-05-26
```

В `History` обязательно:

- **Дата + QA.**
- **Точный шаг**, на котором сломалось (не «не работает» — а «на шаге 4 после клика Studio bedrooms сохраняется как 1, проверял curl GET /api/assets/{id}»).
- **Скриншот / curl-вывод**, если есть. Если есть — приложить рядом в репо в `/qa-screenshots/{дата}-{тикет}.png` и сослаться путём.
- **Под какой ролью / в каком браузере** воспроизводилось.

Пример:

```markdown
- 2026-05-28 · QA · 🟥 Reopened. На шаге 5 (Save & publish) — после клика
  не отправляется запрос на /api/assets, в Network вкладке пусто. Reproduced
  в Chrome 122 под Marina (landlord). Скриншот: qa-screenshots/2026-05-28-BUG-251.png.
  Похоже specsTouched стал true, но bedrooms всё ещё null — отдельный кейс,
  не покрытый фиксом.
```

После этого ответственная сторона (FE/BE) увидит `🟥 Reopened` и доделает.

---

## Когда заводить новый баг

Если нашли что-то, чего нет в трекере — завести **новой секцией внизу `BUG_TRACKER.md`** по существующему формату:

```markdown
## BUG-281

**Title:** Короткое название проблемы

**Severity:** 🟠 Major  ·  **Status:** 🟥 New  ·  **Owner:** FE+BE  ·  **Assignee:** —

### Problem
Что сломано (1-2 абзаца).

### Steps to reproduce
1. ...
2. ...
3. **Observed:** ...
4. **Expected:** ...

### Expected behaviour
Как должно быть.

### Acceptance criteria
- [ ] ...
- [ ] ...

### Files (hints)
- путь/предположение.tsx
- backend service / endpoint

### History
- 2026-05-28: создан (QA). Reproduced в Chrome под Sarah, build 40c346d.
```

Не забыть **добавить строку в таблицу Index** наверху файла:

```markdown
| [BUG-281](#bug-281) | 🟠 | 🟥 | FE+BE | Короткое название проблемы |
```

`Owner` ставится по лучшему предположению. FE / BE при разборе могут переклассифицировать — это нормально.

---

## Что нельзя делать

- **Не закрывать тикет `✅ Closed` без полной проверки Acceptance criteria.** Лучше оставить 🟩 и дописать в History «частично проверено, X — да, Y — пока не воспроизводится» — чем поспешно закрыть и упустить регрессию.
- **Не возвращать 🟥 Reopened без конкретики.** Без шага и скриншота FE / BE не смогут диагностировать и будут переспрашивать → потеря дня.
- **Не дублировать обсуждение в чате.** Всё в History секции тикета.
- **Не править чужие тикеты** (Severity, Owner) без согласования. Только свой статус и свои History-строки.
- **Не бypass'ить обязательные uploads / валидации** (passport photos, TM-30 receipts) ради «упростить тест». Если что-то блокирует — спросить Антона. Bypass = иллюзия проверки.

---

## Архив (read-only)

Эти файлы — слепки QA-прогонов прошлых раундов. **Не комитить туда, не дополнять**, только читать для контекста:

- [`LANDLORD_FLOW_QA.md`](LANDLORD_FLOW_QA.md) — landlord-сторона, Round 1-11.
- [`TENANT_FLOW_QA.md`](TENANT_FLOW_QA.md) — tenant-сторона, Round 1-11.
- [`BACKEND_ISSUES.md`](BACKEND_ISSUES.md) — backend-проблемы, Round 1-11.

---

## Полезные ссылки

- [`BUG_TRACKER.md`](BUG_TRACKER.md) — backlog раунда (единственный источник правды).
- [`CLAUDE.md`](CLAUDE.md) — общая карта проекта.
- [`BACKEND_WORKFLOW.md`](BACKEND_WORKFLOW.md) — что видит backend с другой стороны.

---

## Как загружать изображения в тестах (фото листинга, паспорт, TM-30, pet photo)

> **Почему «из sandbox не получается».** Headless-браузер и sandbox **не имеют системного файлового диалога** ОС. Если кликнуть кнопку `Add` / `Upload` и ждать, что откроется окно выбора файла — оно не откроется (нет GUI-пикера), тест зависает или падает. Решение: **никогда не полагаться на нативный диалог**. Файл нужно подсунуть либо программно в `<input type="file">`, либо напрямую в API. Оба способа ниже работают в headless/sandbox.

### Шаг 0. Сначала получить картинку-файл

Реального файла на диске может не быть — сгенерируй валидный JPEG на лету:

```bash
# Через Pillow (есть в окружении). Цвет/размер любые.
python3 -c "from PIL import Image; Image.new('RGB',(800,600),(99,102,241)).save('/tmp/room.jpg','JPEG')"

# Если Pillow нет — скачать заглушку:
curl -s -o /tmp/room.jpg "https://picsum.photos/800/600"
```

Для паспорта/TM-30 точно так же — это просто JPEG/PNG, бэкенду важен валидный image-файл, не содержимое.

### Способ A. Через Playwright (UI E2E) — `set_input_files`, БЕЗ нативного диалога

Playwright кладёт файл в input **программно**, системное окно не открывается:

```python
# найти именно <input type="file"> (часто скрыт за стилизованной кнопкой "Add")
page.set_input_files('input[type="file"]', '/tmp/room.jpg')
page.wait_for_timeout(1500)  # дать прогрузиться превью / загрузке
```

- Не кликай по визуальной кнопке `Add` и не жди диалог — сразу `set_input_files` по скрытому `input[type=file]`.
- Несколько файлов: `set_input_files('input[type=file]', ['/tmp/a.jpg', '/tmp/b.jpg'])`.
- Если input скрыт (`display:none`) — Playwright всё равно его заполнит, видимость не требуется.
- MCP-обёртка webapp-testing: тот же приём через её file-upload вызов; суть — programmatic, не клик по пикеру.

### Способ B. Прямо в API через curl (быстрее для подготовки данных)

Так Claude и догонял листинг до 8/8 — минуя UI:

```bash
# 1) токен
TOKEN=$(curl -s -X POST http://localhost:5149/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"claude@pmc-test.dev","password":"Test1234!"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")

# 2) multipart upload. Поле формы называется ИМЕННО "file".
curl -s -X POST "http://localhost:5149/api/listings/{LISTING_ID}/media" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/room.jpg;type=image/jpeg"
# → {"mediaId":"..."}  — успех
```

Эндпоинты загрузки (поле всегда `file`/`photos`, multipart/form-data):
- фото листинга — `POST /api/listings/{listingId}/media` (поле `file`)
- паспорт гостя, TM-30 receipt, pet-photo — смотри соответствующий `*.api.ts` в `src/lib/api/`, у всех тот же паттерн `form.append("file", …)` либо `("photos", …)`.

### Если sandbox режет сеть к localhost

Curl к `http://localhost:5149` — это сетевой вызов; в строгом sandbox он может блокироваться. В Bash-инструменте выстави `dangerouslyDisableSandbox: true` для этого конкретного вызова (только для доверенного localhost-бэкенда, не для произвольных URL).

### Чего НЕ делать

- ❌ Не кликать `Add` и ждать системное окно выбора файла — в headless его нет.
- ❌ Не «обходить» обязательность загрузки, убирая required/skip в коде ради зелёного теста — это иллюзия проверки (см. правило выше). Лучше реально подсунуть файл способом A или B.
