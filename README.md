# DummyHub

Single-page app in vanilla JavaScript (ES modules) that consumes the DummyJSON REST API.

1. **Name / section / date:** [Your name], [Section], [Date submitted]

## How to run
Open the `dummyhub/` folder in VS Code and start **Live Server**. Modules do not load from `file://`.
Add `?delay=1500` to the address (for example `http://127.0.0.1:5500/?delay=1500`) to slow every GET and see the loading states.

## Test account
`emilys` / `emilyspass`

## Requirements checklist
Statuses are based on reading the code; re-test each item in the browser before submitting.

**SHELL** — SHELL-1 Done · SHELL-2 Done · SHELL-3 Done · SHELL-4 Done · SHELL-5 Done · SHELL-6 Done · SHELL-7 Done
**AUTH** — AUTH-1 Done · AUTH-2 Done · AUTH-3 Done · AUTH-4 Done · AUTH-5 Done (on start it runs when a saved session exists) · AUTH-6 Done
**DASH** — DASH-1 Done · DASH-2 Done · DASH-3 Done · DASH-4 Done (whole-dashboard error with Retry; no allSettled)
**SHOP** — SHOP-1 to SHOP-10 Done
**CART** — CART-1 to CART-6 Done
**RCP** — RCP-1 to RCP-4 Done
**POST** — POST-1 Done · POST-2 Done · POST-3 Done · POST-4 Done (the author request starts as soon as the post arrives, because the author id comes from the post; all three run inside one Promise.all) · POST-5 Done · POST-6 Done
**PPL** — PPL-1 to PPL-3 Done
**TASK** — TASK-1 to TASK-4 Done · TASK-5 Done (local tasks are marked `local: true` instead of using an id threshold, because the server returns the same new id every time) · TASK-6 Done
**NF** — NF-1 Done

**Cross-cutting** — JS-1 Done · JS-2 Done · JS-3 Done · JS-4 Done · JS-5 Done · JS-6 Done · JS-7 Done (functions kept short)
**HTML/CSS** — UI-1 to UI-6 Done

## Bonus items attempted
- Session survives a refresh (tokens in sessionStorage, verified with /auth/me on start)
- Expired access token: on a 401 the app calls POST /auth/refresh once, retries, and logs out if the refresh fails
- Cart persists across refreshes (sessionStorage, restored on start)
- Skeleton placeholders shaped like the content
- Not attempted: Promise.allSettled on the Dashboard, URL query state

## Known issues
- Typing in a search box re-renders the list on each keystroke; the request itself is debounced (300 ms).
- Search and category/tag/role filters replace each other because the API cannot combine them.
- After a failed login or a validation error the password field is cleared (the password is never kept in state).
- Tag chips in Community show only the first 20 tags.
- Routes use `#/` hashes, so individual pages are not indexable by search engines.

## Pairs
Not applicable (individual project).
