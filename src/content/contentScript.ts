/**
 * ClickSafe Content Script
 * Runs on every matched page and scans links before navigation is allowed.
 */

import { scanDownloadedFile, scanUrl } from '../lib/scanner';
import { getChromeApi } from '../lib/chrome';
import { ProtectionSettings, ScanHistoryItem } from '../types';
import { INITIAL_SETTINGS } from '../lib/constants';
import { evaluateRisk } from '../lib/risk';

const chromeApi = getChromeApi();
let scannedLinks = new WeakMap<HTMLAnchorElement, string>();
let cachedSettings: ProtectionSettings = INITIAL_SETTINGS;

const getSettings = async (): Promise<ProtectionSettings | null> => {
  const store = await chromeApi.storage.local.get(['settings']);
  return store.settings || null;
};

const refreshSettings = async () => {
  cachedSettings = (await getSettings()) || INITIAL_SETTINGS;
};

const getLinkType = (reasons: string[]): ScanHistoryItem['type'] => {
  if (reasons.some((reason) => reason.toLowerCase().includes('job'))) {
    return 'job';
  }
  if (reasons.some((reason) => reason.toLowerCase().includes('developer') || reason.toLowerCase().includes('credential'))) {
    return 'developer';
  }
  if (reasons.some((reason) => reason.toLowerCase().includes('download') || reason.toLowerCase().includes('executable'))) {
    return 'download';
  }
  return 'link';
};

const logScan = async (
  url: string,
  result: ReturnType<typeof scanUrl>,
  actionTaken: ScanHistoryItem['actionTaken'],
) => {
  if (result.status === 'safe') {
    return;
  }

  const store = await chromeApi.storage.local.get(['history']);
  const history: ScanHistoryItem[] = Array.isArray(store.history) ? store.history : [];
  const item: ScanHistoryItem = {
    id: `h_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    url,
    timestamp: Date.now(),
    riskScore: result.score,
    status: result.status,
    reasons: result.reasons,
    type: getLinkType(result.reasons),
    actionTaken,
  };

  await chromeApi.storage.local.set({
    history: [item, ...history].slice(0, 250),
  });
};

const findAnchor = (target: EventTarget | null): HTMLAnchorElement | null => {
  if (!(target instanceof Element)) {
    return null;
  }
  return target.closest('a[href]');
};

const canInspectUrl = (url: string) => {
  return /^https?:\/\//i.test(url);
};

const scanAnchor = (anchor: HTMLAnchorElement, settings: ProtectionSettings) => {
  const urlResult = canInspectUrl(anchor.href)
    ? scanUrl(anchor.href, settings)
    : evaluateRisk([]);
  const downloadName = anchor.getAttribute('download')?.trim();

  if (!downloadName) {
    return urlResult;
  }

  const downloadResult = scanDownloadedFile(downloadName, anchor.href, settings);
  if (downloadResult.score <= urlResult.score) {
    return urlResult;
  }

  return downloadResult;
};

const getNavigationMessage = (target: string, result: ReturnType<typeof scanUrl>) => {
  return [
    'ClickSafe scanned this link before opening:',
    target,
    '',
    `Risk: ${result.status.toUpperCase()} (${result.score}/100)`,
    ...result.reasons.map((reason) => `- ${reason}`),
    '',
    result.status === 'dangerous'
      ? 'This navigation was blocked.'
      : 'Open this link anyway?',
  ].join('\n');
};

const blockEvent = (event: Event) => {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
};

const inspectNavigation = (event: MouseEvent) => {
  const anchor = findAnchor(event.target);
  if (!anchor || !anchor.href) {
    return;
  }

  const settings = cachedSettings;
  if (!settings.linkProtection) {
    return;
  }

  const result = scanAnchor(anchor, settings);
  if (result.status === 'safe') {
    return;
  }

  if (result.status === 'caution') {
    return;
  }

  blockEvent(event);

  const message = getNavigationMessage(anchor.href, result);

  void logScan(anchor.href, result, 'blocked');
  alert(message);
};

const markSuspiciousLinks = async () => {
  const settings = await getSettings();
  if (!settings?.linkProtection) {
    return;
  }

  document.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((link) => {
    const cacheKey = `${link.href}|${link.getAttribute('download') || ''}`;
    if (!link.href || scannedLinks.get(link) === cacheKey) {
      return;
    }

    scannedLinks.set(link, cacheKey);
    const result = scanAnchor(link, settings);
    if (result.status === 'safe') {
      return;
    }

    link.dataset.clicksafeStatus = result.status;
    link.title = `${link.title ? `${link.title}\n` : ''}ClickSafe: ${result.status} (${result.score}/100)`;

    if (!link.querySelector('.clicksafe-indicator')) {
      const badge = document.createElement('span');
      badge.className = 'clicksafe-indicator';
      badge.textContent = result.status === 'dangerous' ? ' [blocked]' : ' [caution]';
      badge.style.color = result.status === 'dangerous' ? '#E11D48' : '#D97706';
      badge.style.fontWeight = '700';
      badge.style.cursor = 'help';
      link.appendChild(badge);
    }
  });
};

const inspectFormSubmit = (event: SubmitEvent) => {
  const form = event.target instanceof HTMLFormElement ? event.target : null;
  if (!form || !form.action || !canInspectUrl(form.action)) {
    return;
  }

  const settings = cachedSettings;
  if (!settings.linkProtection) {
    return;
  }

  const result = scanUrl(form.action, settings);
  if (result.status === 'safe') {
    return;
  }

  if (result.status === 'caution') {
    return;
  }

  blockEvent(event);
  const message = getNavigationMessage(form.action, result);

  void logScan(form.action, result, 'blocked');
  alert(message);
};

const wrapWindowOpen = () => {
  const nativeOpen = window.open.bind(window);
  window.open = (url?: string | URL, target?: string, features?: string) => {
    const targetUrl = url?.toString() || '';
    if (!targetUrl || !canInspectUrl(targetUrl) || !cachedSettings.linkProtection) {
      return nativeOpen(url, target, features);
    }

    const result = scanUrl(targetUrl, cachedSettings);
    if (result.status === 'safe') {
      return nativeOpen(url, target, features);
    }

    if (result.status === 'caution') {
      return nativeOpen(url, target, features);
    }

    const message = getNavigationMessage(targetUrl, result);
    void logScan(targetUrl, result, 'blocked');
    alert(message);
    return null;
  };
};

if (typeof document !== 'undefined') {
  void refreshSettings();
  chromeApi.storage?.onChanged?.addListener?.((changes: Record<string, { newValue?: ProtectionSettings }>, areaName: string) => {
    if (areaName === 'local' && changes.settings?.newValue) {
      cachedSettings = changes.settings.newValue;
      scannedLinks = new WeakMap<HTMLAnchorElement, string>();
      void markSuspiciousLinks();
    }
  });

  document.addEventListener('click', inspectNavigation, true);

  document.addEventListener('auxclick', inspectNavigation, true);
  document.addEventListener('submit', inspectFormSubmit, true);
  wrapWindowOpen();

  markSuspiciousLinks();

  const startObserver = () => {
    const root = document.documentElement || document.body;
    if (!root) {
      window.setTimeout(startObserver, 25);
      return;
    }

    const observer = new MutationObserver(() => {
      void markSuspiciousLinks();
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
    });
  };

  startObserver();
}
