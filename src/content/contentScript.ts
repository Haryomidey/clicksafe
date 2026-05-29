/**
 * ClickSafe Content Script
 * Runs on every matched page and scans links before navigation is allowed.
 */

import { scanUrl } from '../lib/scanner';
import { getChromeApi } from '../lib/chrome';
import { ProtectionSettings, ScanHistoryItem } from '../types';
import { INITIAL_SETTINGS } from '../lib/constants';

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

const blockEvent = (event: Event) => {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
};

const inspectNavigation = (event: MouseEvent) => {
  const anchor = findAnchor(event.target);
  if (!anchor || !anchor.href || !canInspectUrl(anchor.href)) {
    return;
  }

  const settings = cachedSettings;
  if (!settings.linkProtection) {
    return;
  }

  const result = scanUrl(anchor.href, settings);
  if (result.status === 'safe') {
    return;
  }

  blockEvent(event);

  const message = [
    `ClickSafe scanned this link before opening:`,
    anchor.href,
    '',
    `Risk: ${result.status.toUpperCase()} (${result.score}/100)`,
    ...result.reasons.map((reason) => `- ${reason}`),
    '',
    result.status === 'dangerous'
      ? 'This navigation was blocked.'
      : 'Open this link anyway?',
  ].join('\n');

  if (result.status === 'dangerous') {
    void logScan(anchor.href, result, 'blocked');
    alert(message);
    return;
  }

  const proceed = confirm(message);
  void logScan(anchor.href, result, proceed ? 'warned' : 'blocked');
  if (proceed) {
    if (anchor.target === '_blank' || event.metaKey || event.ctrlKey || event.button === 1) {
      window.open(anchor.href, '_blank', 'noopener,noreferrer');
    } else {
      window.location.assign(anchor.href);
    }
  }
};

const markSuspiciousLinks = async () => {
  const settings = await getSettings();
  if (!settings?.linkProtection) {
    return;
  }

  document.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((link) => {
    if (!link.href || !canInspectUrl(link.href) || scannedLinks.get(link) === link.href) {
      return;
    }

    scannedLinks.set(link, link.href);
    const result = scanUrl(link.href, settings);
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

  markSuspiciousLinks();

  const observer = new MutationObserver(() => {
    void markSuspiciousLinks();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}
