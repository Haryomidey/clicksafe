# ClickSafe

ClickSafe is a Chrome MV3 security extension that scans links and downloads before they can cause trouble. It runs in the background on every page, marks suspicious links, blocks dangerous navigation, and records local activity in the dashboard.

## Usage Terms

This project is shared for learning, review, and personal non-commercial use only.

If you clone, fork, modify, or share this project, you must give clear credit to the original creator. Do not remove attribution from the README, source comments, or project materials.

Commercial use is not permitted without written permission from the original creator. This includes selling the code, publishing a paid version, using it inside a commercial product, or offering it as part of a paid service.

## What It Does

- Scans links before opening them from normal clicks and middle-clicks.
- Blocks dangerous links before the browser navigates.
- Marks caution links without interrupting safe browsing.
- Checks download filenames, including masked names like `download="resume.exe"`.
- Watches Chrome download events in the background.
- Detects risky patterns such as executable files, phishing keywords, fake cloud-drive domains, URL shorteners, punycode, redirect parameters, fake job scams, and developer-secret traps.
- Stores settings, history, and download scan results locally with `chrome.storage.local`.

## Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS v4
- Chrome Extension Manifest V3

## Project Structure

```text
src/popup/              Extension popup UI
src/dashboard/          Website/options dashboard
src/content/            Page-level content script
src/background/         MV3 background service worker
src/lib/                Scanner, risk scoring, storage, and Chrome API helpers
src/styles/             Global Tailwind/CSS styling
scripts/build-extension.ts
manifest.json
```

## Getting Started

Install dependencies:

```sh
pnpm install
```

Run the dashboard/popup in Vite development mode:

```sh
pnpm run dev
```

Build the Chrome extension:

```sh
pnpm run build
```

The loadable extension is generated in `dist`.

## Load In Chrome

1. Run `pnpm run build`.
2. Open `chrome://extensions`.
3. Enable Developer mode.
4. Click Load unpacked.
5. Select the `dist` folder.
6. Pin ClickSafe and refresh any page you want to test.

## Settings

Settings are available in both places:

- The extension popup for quick protection controls.
- The dashboard/options page for full activity, scanner, allow list, and block list management.

Allow-listed domains reduce heuristic noise for trusted sites. Block-listed domains are treated as dangerous.

## Notes

ClickSafe uses local heuristic scanning. It does not claim to replace a full antivirus, browser safe-browsing service, or server-side malware analysis system. The goal is to catch common link and download tricks early, especially before a risky link opens.
