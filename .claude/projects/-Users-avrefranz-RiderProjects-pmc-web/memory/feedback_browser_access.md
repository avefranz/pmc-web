---
name: feedback-browser-access
description: У Claude есть доступ к браузеру — использовать preview tools для верификации вместо отказа от задачи
metadata:
  type: feedback
---

Если задача "требует браузера" — не откладывать и не помечать как "нужна живая проверка". Запускать dev-сервер через preview_start и проверять прямо в браузере.

**Why:** пользователь явно сообщил что все разрешения в браузере есть.

**How to apply:**
- Вместо "требует воспроизведения в браузере" → `preview_start` + `preview_snapshot` / `preview_click` / `preview_screenshot`
- Перед закрытием сессии с UI-багами: запустить сервер, потыкать сценарий, приложить скриншот
- Инструменты: `mcp__Claude_Preview__preview_*` — для dev-сервера; `mcp__Claude_in_Chrome__*` — если нужен Chrome
