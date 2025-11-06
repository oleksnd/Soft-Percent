# Auth / future integration

This folder contains notes for a future Google sign-in integration. For now the popup shows a UI-only CTA.

Planned approach:
- Use the Chrome Identity API or an external OAuth provider (depending on desired scopes).
- On sign-in, migrate local data to cloud (merge by skill id) and switch `user.mode` to `oauth`.
- Keep sync/local separation: continue using `chrome.storage.sync` for lightweight durable state; store larger caches in `chrome.storage.local`.

Security notes:
- Do not request extra scopes before the user opts in.
- Provide an explicit migration step and show progress.

This file is a placeholder and intentionally contains no implementation.
