/**
 * ClickSafe Content Script
 * Runs on every matched page and scans links before navigation is allowed.
 */

import { scanDownloadedFile, scanUrl } from '../lib/scanner';
import { getChromeApi } from '../lib/chrome';
import { ProtectionSettings, ScanHistoryItem } from '../types';
import { DEVELOPER_KEYWORDS, FAKE_JOB_KEYWORDS, INITIAL_SETTINGS } from '../lib/constants';
import { evaluateRisk, RiskEvaluation } from '../lib/risk';

const chromeApi = getChromeApi();
let scannedLinks = new WeakMap<HTMLAnchorElement, string>();
let cachedSettings: ProtectionSettings = INITIAL_SETTINGS;
const repositoryRiskCache = new Map<string, RiskEvaluation>();

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

const isGitHubRepositoryAction = (url: URL) => {
  const pathParts = url.pathname.split('/').filter(Boolean);
  if (url.protocol === 'x-github-client:' && url.href.includes('github.com')) {
    return true;
  }

  if (url.hostname !== 'github.com' && url.hostname !== 'codeload.github.com' && !url.hostname.endsWith('.github.com')) {
    return false;
  }

  if (pathParts.length < 2 && url.hostname !== 'codeload.github.com') {
    return false;
  }

  return url.pathname.includes('/archive/') ||
    url.hostname === 'codeload.github.com' ||
    url.pathname.endsWith('.git') ||
    url.protocol === 'x-github-client:';
};

const getGitHubRepositoryFromUrl = (url: URL) => {
  if (url.hostname === 'codeload.github.com') {
    const [owner, repo] = url.pathname.split('/').filter(Boolean);
    return owner && repo ? { owner, repo } : null;
  }

  if (url.hostname !== 'github.com' && !url.hostname.endsWith('.github.com')) {
    return null;
  }

  const [owner, repoWithSuffix] = url.pathname.split('/').filter(Boolean);
  if (!owner || !repoWithSuffix) {
    return null;
  }

  return {
    owner,
    repo: repoWithSuffix.replace(/\.git$/i, ''),
  };
};

const getCurrentGitHubRepository = () => {
  try {
    return getGitHubRepositoryFromUrl(new URL(window.location.href));
  } catch {
    return null;
  }
};

const fetchRepositoryFile = async (owner: string, repo: string, path: string) => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 2500);

  try {
    const response = await fetch(`https://github.com/${owner}/${repo}/raw/HEAD/${path}`, {
      credentials: 'omit',
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    return await response.text();
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
};

const addUniqueReason = (reasons: string[], reason: string) => {
  if (!reasons.includes(reason)) {
    reasons.push(reason);
  }
};

const inspectCommandText = (text: string, reasons: string[]) => {
  const normalized = text.toLowerCase();
  const checks: Array<[RegExp, string]> = [
    [/(curl|wget|iwr|invoke-webrequest)[^|;&]*(\||;|&&)\s*(sh|bash|zsh|powershell|pwsh|cmd|node|python)/i, 'Suspicious install script downloads remote code and executes it.'],
    [/(powershell|pwsh)\s+(-enc|-encodedcommand|hidden|-w\s+hidden)/i, 'Suspicious install script uses hidden or encoded PowerShell execution.'],
    [/(base64\s+(-d|--decode)|frombase64string|atob\()[^|;&]*(\||;|&&)?\s*(sh|bash|node|python|powershell|pwsh)?/i, 'Suspicious install script uses encoded command execution.'],
    [/\b(eval|new function|function\()\s*\(/i, 'Suspicious install script uses dynamic code execution.'],
    [/(discordapp\.com\/api\/webhooks|webhook\.site|telegram\.org\/bot|api\.telegram\.org)/i, 'Suspicious script sends data to a webhook or bot endpoint.'],
    [/(\.ssh\/id_rsa|\.aws\/credentials|\.npmrc|\.env|login data|local state|cookies|wallet\.dat|seed phrase|private key)/i, 'Developer secret targeting inside repository scripts.'],
  ];

  checks.forEach(([pattern, reason]) => {
    if (pattern.test(normalized)) {
      addUniqueReason(reasons, reason);
    }
  });
};

const inspectPackageJson = (contents: string, reasons: string[]) => {
  try {
    const pkg = JSON.parse(contents) as { scripts?: Record<string, unknown> };
    const scripts = pkg.scripts || {};

    Object.entries(scripts).forEach(([name, value]) => {
      if (typeof value !== 'string') {
        return;
      }

      inspectCommandText(value, reasons);

      if (/^(preinstall|install|postinstall|prepare)$/i.test(name)) {
        const beforeCount = reasons.length;
        inspectCommandText(value, reasons);
        if (reasons.length > beforeCount) {
          addUniqueReason(reasons, `Package lifecycle script "${name}" runs suspicious commands during install.`);
        }
      }
    });
  } catch {
    inspectCommandText(contents, reasons);
  }
};

const inspectWorkflowFile = (contents: string, reasons: string[]) => {
  const normalized = contents.toLowerCase();
  inspectCommandText(contents, reasons);

  if (normalized.includes('pull_request_target') && normalized.includes('secrets.')) {
    addUniqueReason(reasons, 'GitHub Actions workflow exposes secrets during pull_request_target execution.');
  }

  if (normalized.includes('pull_request_target') && /checkout@v\d/.test(normalized) && normalized.includes('github.event.pull_request.head')) {
    addUniqueReason(reasons, 'GitHub Actions workflow checks out untrusted pull request code with elevated permissions.');
  }
};

const inspectReadmeText = (contents: string, reasons: string[], settings: ProtectionSettings) => {
  const normalized = contents.toLowerCase();

  if (
    settings.fakeJobWarnings !== false &&
    FAKE_JOB_KEYWORDS.some((keyword) => normalized.includes(keyword.toLowerCase())) &&
    ['run this command', 'copy and paste', 'install this app', 'download brief'].some((phrase) => normalized.includes(phrase))
  ) {
    addUniqueReason(reasons, 'Fake Job Scam indicators inside repository instructions.');
  }

  if (
    settings.developerProtection !== false &&
    ['send your .env', 'upload your .env', 'paste your token', 'send api key', 'send private key', 'wallet seed phrase'].some((phrase) => normalized.includes(phrase))
  ) {
    addUniqueReason(reasons, 'Developer secret request inside repository instructions.');
  }
};

const inspectRepositoryFiles = async (anchor: HTMLAnchorElement, settings: ProtectionSettings) => {
  let target: URL;
  try {
    target = new URL(anchor.href);
  } catch {
    return evaluateRisk([]);
  }

  if (!isGitHubRepositoryAction(target)) {
    return evaluateRisk([]);
  }

  const repo = getGitHubRepositoryFromUrl(target) || getCurrentGitHubRepository();
  if (!repo) {
    return evaluateRisk([]);
  }

  const cacheKey = `${repo.owner}/${repo.repo}`;
  const cached = repositoryRiskCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const reasons: string[] = [];
  const filesToInspect = [
    'package.json',
    'README.md',
    'readme.md',
    'install.sh',
    'setup.sh',
    'scripts/install.sh',
    'scripts/setup.sh',
    '.github/workflows/ci.yml',
    '.github/workflows/main.yml',
    '.github/workflows/build.yml',
    '.github/workflows/node.js.yml',
  ];

  await Promise.all(filesToInspect.map(async (path) => {
    const contents = await fetchRepositoryFile(repo.owner, repo.repo, path);
    if (!contents) {
      return;
    }

    if (path === 'package.json') {
      inspectPackageJson(contents, reasons);
    } else if (path.includes('/workflows/')) {
      inspectWorkflowFile(contents, reasons);
    } else if (path.toLowerCase().includes('readme')) {
      inspectReadmeText(contents, reasons, settings);
    } else {
      inspectCommandText(contents, reasons);
    }
  }));

  const result = evaluateRisk(reasons);
  repositoryRiskCache.set(cacheKey, result);
  return result;
};

const pageTextIncludes = (patterns: string[]) => {
  const bodyText = document.body?.innerText?.toLowerCase() || '';
  return patterns.some((pattern) => bodyText.includes(pattern.toLowerCase()));
};

const getRepositoryContextReasons = (anchor: HTMLAnchorElement, settings: ProtectionSettings) => {
  if (settings.fakeJobWarnings === false && settings.developerProtection === false) {
    return [];
  }

  let target: URL;
  try {
    target = new URL(anchor.href);
  } catch {
    return [];
  }

  if (!isGitHubRepositoryAction(target)) {
    return [];
  }

  const reasons: string[] = [];
  const runOrInstallLanguage = [
    'run this command',
    'copy and paste',
    'npm install',
    'npm start',
    'install this app',
    'download brief',
    'project files',
  ];
  const secretRequestLanguage = [
    'send your .env',
    'upload your .env',
    'share your .env',
    'paste your token',
    'send api key',
    'send private key',
    'share private key',
    'wallet seed phrase',
    'browser cookies',
  ];

  if (
    settings.fakeJobWarnings !== false &&
    pageTextIncludes(FAKE_JOB_KEYWORDS) &&
    pageTextIncludes(runOrInstallLanguage)
  ) {
    reasons.push('Fake Job Scam indicators on this repository page before clone/download.');
  }

  if (
    settings.developerProtection !== false &&
    (pageTextIncludes(DEVELOPER_KEYWORDS) || pageTextIncludes(secretRequestLanguage)) &&
    pageTextIncludes(['send', 'upload', 'share', 'paste', 'submit'])
  ) {
    reasons.push('Developer secret targeting on this repository page before clone/download.');
  }

  return reasons;
};

const mergeScanReasons = (base: ReturnType<typeof scanUrl>, extraReasons: string[]) => {
  if (extraReasons.length === 0) {
    return base;
  }

  return evaluateRisk([...base.reasons, ...extraReasons]);
};

const getCachedRepositoryRisk = (anchor: HTMLAnchorElement) => {
  try {
    const target = new URL(anchor.href);
    const repo = getGitHubRepositoryFromUrl(target) || getCurrentGitHubRepository();
    return repo ? repositoryRiskCache.get(`${repo.owner}/${repo.repo}`) : undefined;
  } catch {
    return undefined;
  }
};

const scanAnchor = (anchor: HTMLAnchorElement, settings: ProtectionSettings) => {
  const urlResult = canInspectUrl(anchor.href)
    ? scanUrl(anchor.href, settings)
    : evaluateRisk([]);
  const downloadName = anchor.getAttribute('download')?.trim();
  const repositoryContextReasons = getRepositoryContextReasons(anchor, settings);
  const repositoryFileRisk = getCachedRepositoryRisk(anchor);
  const repositoryFileReasons = repositoryFileRisk?.reasons || [];
  const allRepositoryReasons = [...repositoryContextReasons, ...repositoryFileReasons];

  if (!downloadName) {
    return mergeScanReasons(urlResult, allRepositoryReasons);
  }

  const downloadResult = scanDownloadedFile(downloadName, anchor.href, settings);
  if (downloadResult.score <= urlResult.score) {
    return mergeScanReasons(urlResult, allRepositoryReasons);
  }

  return mergeScanReasons(downloadResult, allRepositoryReasons);
};

const cleanClickSafeTitle = (title: string) => {
  return title
    .split('\n')
    .filter((line) => !line.startsWith('ClickSafe: '))
    .join('\n');
};

const removeClickSafeIndicator = (link: HTMLAnchorElement) => {
  link.querySelectorAll('.clicksafe-indicator').forEach((indicator) => indicator.remove());
  link.title = cleanClickSafeTitle(link.title);
  delete link.dataset.clicksafeStatus;
};

const applyClickSafeIndicator = (link: HTMLAnchorElement, result: ReturnType<typeof scanUrl>) => {
  link.dataset.clicksafeStatus = result.status;
  const cleanTitle = cleanClickSafeTitle(link.title);
  link.title = `${cleanTitle ? `${cleanTitle}\n` : ''}ClickSafe: ${result.status} (${result.score}/100)`;

  let badge = link.querySelector<HTMLSpanElement>('.clicksafe-indicator');
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'clicksafe-indicator';
    badge.style.fontWeight = '700';
    badge.style.cursor = 'help';
    link.appendChild(badge);
  }

  badge.textContent = result.status === 'dangerous' ? ' [blocked]' : ' [caution]';
  badge.style.color = result.status === 'dangerous' ? '#E11D48' : '#D97706';
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

  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'));
  for (const link of links) {
    const cacheKey = `${link.href}|${link.getAttribute('download') || ''}`;
    if (!link.href || (scannedLinks.get(link) === cacheKey && !link.querySelector('.clicksafe-indicator'))) {
      continue;
    }

    await inspectRepositoryFiles(link, settings);

    scannedLinks.set(link, cacheKey);
    const result = scanAnchor(link, settings);
    if (result.status === 'safe') {
      removeClickSafeIndicator(link);
      continue;
    }

    applyClickSafeIndicator(link, result);
  }
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

if (typeof document !== 'undefined') {
  try {
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

    void markSuspiciousLinks();

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
  } catch (error) {
    console.warn('ClickSafe could not start on this page.', error);
  }
}