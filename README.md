# Soft-Percent — Chrome Extension Template

This is a minimal Chrome extension template (Manifest V3). Included files:

- `manifest.json` — extension manifest (v3)
- `background.js` — service worker background process
- `content.js` — example content script
- `popup.html`, `popup.js`, `popup.css` — popup UI
- `icons/` — simple SVG icons

How to load the extension in Developer mode (Unpacked):

1. Open chrome://extensions/ in Chrome
2. Enable "Developer mode"
3. Click "Load unpacked" and select this project folder

Notes:
- Replace icons in `icons/` with your own PNG/SVG as needed.
- Add or remove permissions in `manifest.json` as functionality grows.

Next steps / ideas:
- Add options via `options.html` and set `options_ui` in `manifest.json`.
- Add tests and CI for builds and linting.
