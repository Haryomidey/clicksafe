# ClickSafe Developer Guide

ClickSafe is a Chrome MV3 extension with a React/Tailwind options dashboard, popup, background service worker, and content script.

## Build Outputs

Run:

```sh
pnpm run build
```

The build writes a loadable extension to `dist`:

- `popup.html` and bundled popup assets
- `dashboard.html` and bundled options assets
- `background.js` as the MV3 module service worker
- `contentScript.js` as a non-module content script
- `manifest.json`
- generated PNG icons

## Runtime Flow

- `src/content/contentScript.ts` runs on all matched pages and scans clicked links before navigation.
- Dangerous links are blocked and written to local history.
- Caution links ask for confirmation before navigation.
- `src/background/serviceWorker.ts` monitors Chrome download events and records risky downloads.
- `src/popup/Popup.tsx` reads the active tab and scans it with the same settings used by the content script.
- `src/dashboard/Dashboard.tsx` manages history, downloads, checklist state, allow lists, block lists, and protection toggles.

## Local Data

ClickSafe stores data only in `chrome.storage.local` when installed as an extension. In Vite development, `src/lib/chrome.ts` provides a browser fallback backed by `localStorage` so the real dashboard can run outside Chrome extension APIs.

No default history or download records are seeded. A new install starts with empty history, empty downloads, and empty allow/block lists.

## Risk Scoring

Risk scoring lives in `src/lib/risk.ts` and scanner rules live in `src/lib/scanner.ts`.

Notable weights:

- Blocked domain: `+100`
- Dangerous executable extension: `+55`
- Developer credential targeting: `+50`
- Punycode domain masking: `+45`
- Cloud storage brand mimic: `+40`
- Job scam patterns: `+35`
- URL shortener: `+25`
- Strict mode unknown domain: `+25`
- Excessive subdomain nesting: `+20`
- Insecure HTTP: `+15`

Severity:

- Safe: `0 - 19`
- Caution: `20 - 59`
- Dangerous: `60 - 100`

## Updating Rules

Update `src/lib/constants.ts` to change:

- `DANGEROUS_EXTENSIONS`
- `FAKE_JOB_KEYWORDS`
- `DEVELOPER_KEYWORDS`
- `PHISHING_KEYWORDS`
- `INITIAL_SETTINGS`
- `INITIAL_CHECKLIST`
