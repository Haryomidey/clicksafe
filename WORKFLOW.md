# ClickSafe Verification Workflow

## Build And Load

1. Run `pnpm run build`.
2. Open `chrome://extensions`.
3. Enable Developer Mode.
4. Load the `dist` folder as an unpacked extension.
5. Open the ClickSafe options page from the extension details or popup settings button.

## Link Interception

1. Visit any normal web page.
2. Click a link that matches a risk rule, such as an HTTP sign-in URL, a shortened URL, a punycode domain, a blocked domain, or a direct executable URL.
3. Expected behavior:
   - Safe links open normally.
   - Caution links ask before opening.
   - Dangerous links are blocked before navigation.
   - Risky link activity appears in the dashboard history.

## Manual Link Scanner

1. Open the options dashboard.
2. Go to Link Scanner.
3. Enter any URL and run the scan.
4. Expected behavior:
   - The result uses current shield settings, allowed domains, blocked domains, and strict mode.
   - The scan is added to history.

## Download Protection

1. Keep Download Extension Monitor enabled.
2. Download a file whose filename or source URL matches a risky rule.
3. Expected behavior:
   - The background service worker scans the Chrome download event.
   - Risky downloads appear in File Protection.
   - The extension badge shows an alert marker.

## Settings

1. Add a domain to the block list.
2. Click or scan a URL from that domain.
3. Expected behavior: it is treated as dangerous.
4. Add a domain to the allow list.
5. Click or scan a URL from that domain.
6. Expected behavior: allow-listed domains avoid heuristic noise unless direct file risk still applies.
