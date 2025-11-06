# Soft-Percent — Chrome Extension Template

Это базовый шаблон расширения Chrome (Manifest V3). Файлы включают:

- `manifest.json` — manifest v3
- `background.js` — сервис-воркер фонового процесса
- `content.js` — content script (пример)
- `popup.html`, `popup.js`, `popup.css` — UI всплывающего окна
- `icons/` — примитивные SVG-иконки

Как загрузить расширение в режиме разработчика (Unpacked):

1. Откройте chrome://extensions/ в Chrome
2. Включите "Режим разработчика" (Developer mode)
3. Нажмите "Load unpacked" (Загрузить распакованное) и укажите папку этого проекта

Примечания:
- Замените иконки в `icons/` на ваши PNG/SVG при необходимости.
- Добавляйте/удаляйте разрешения в `manifest.json` по мере роста функциональности.

Примеры/идеи для следующего шага:
- Добавить опции в `options.html` и прописать `options_ui` в `manifest.json`.
- Добавить тесты и CI для сборки и проверки lint.
