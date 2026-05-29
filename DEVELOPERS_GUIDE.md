# ClickSafe - Developer's Integration & Audit Guide

This guide details the algorithmic weights, storage controllers, and extension mechanics of ClickSafe.

---

## 1. Algorithmic Risk Scoring Schema (`/src/lib/risk.ts`)

Instead of flat flags, ClickSafe calculates an interactive risk score spanning `0` to `100` by aggregating cumulative penalties. These are parsed locally next to recommendations:

| Vulnerability Vector | Assigned Penalty | Critical Actions & Recommendations |
| :--- | :--- | :--- |
| **Dangerous Executable Extension (`.exe`, `.msi`, `.bat`)** | `+55` | Solid warning panel: High Threat. Avoid opening. |
| **Developer Credential Harvest / Targeting (`.env`, SSH keys)** | `+50` | Solid warning panel: Inspect before entering keys. |
| **Punycode Domain Masking (`xn--`)** | `+45` | High Threat: Homograph spoof alert. |
| **Fake Cloud Storage Host (`google-drive-view.com`)** | `+40` | High Threat: Brand mimic alert. |
| **Fake Job Fraud Patterns (recruiting exercises, remote brief run)**| `+35` | Caution: Threat commonly targets Discord/Telegram candidates.|
| **URL Shortener Hideout (`bit.ly`, `t.co`)** | `+25` | Caution: Masked path. Use link scanning. |
| **Multi-level Subdomain Nesting** | `+20` | Caution: Domain nesting used to isolate users. |
| **Insecure Plaintext Stream (`http://`)** | `+15` | Caution: No SSL encryption. |
| **Suspicious Phishing Keyword Match (login, banking, secure)** | `+10` (each) | Review carefully. |

### Severity Scale:
* **Safe (`0 - 19`)**: Verified clean protocols. Generates subtle low-risk emerald badges.
* **Caution (`20 - 59`)**: Medium Risk. Triggers yellow precautionary messages.
* **Dangerous (`60 - 100`)**: High Threat. Triggers deep crimson shield prompts in options.

---

## 2. API Bridge Strategy (`/src/lib/chrome.ts`)

To ensure ClickSafe compiles directly into structured extension resources while fully running inside simulated React sandboxes, it features a dual-compatible bridge pattern:

```ts
import { getChromeApi } from './chrome';
const chromeApi = getChromeApi();

// Resolves to REAL chrome.storage in extension, and Simulated localStorage in standard browser.
const data = await chromeApi.storage.local.get(['settings']);
```

### Mock Actions Hook:
Developers can simulate a physical file download interception using `simulateDownload(filename, url, size)` when testing Chrome listeners inside the standalone options dashboard. This automatically triggers downstream alerts without requiring active connection to Chrome.

---

## 3. Customizing Threat Keywords (`/src/lib/constants.ts`)

To add new keywords or default whitelisted domains:
1. Open `/src/lib/constants.ts`
2. Update the respective array:
   * `DANGEROUS_EXTENSIONS`: File download endings to target.
   * `FAKE_JOB_KEYWORDS`: Phrases targeted by recruiter scams.
   * `DEVELOPER_KEYWORDS`: Local configuration file names to guard.
   * `PHISHING_KEYWORDS`: Domain structures that indicate fake payment or sign-in walls.
3. Reload or rebundle the files.
