import { FAKE_JOB_KEYWORDS, DEVELOPER_KEYWORDS, PHISHING_KEYWORDS, DANGEROUS_EXTENSIONS } from './constants';
import { evaluateRisk, RiskEvaluation } from './risk';
import { ProtectionSettings } from '../types';

const SHORTENED_DOMAINS = [
  'bit.ly', 't.co', 'tinyurl.com', 'rebrand.ly', 'is.gd', 'buff.ly',
  'adf.ly', 'goo.gl', 'ow.ly', 'shorte.st', 'lnkd.in', 't.me'
];

const LEGITIMATE_CLOUD_DOMAINS = [
  'drive.google.com',
  'docs.google.com',
  'dropbox.com',
  'onedrive.live.com',
  'sharepoint.com',
  'box.com',
  'icloud.com'
];

const OFFICIAL_DEVELOPER_DOMAINS = [
  'github.com',
  'github.community',
  'githubstatus.com',
  'stackoverflow.com',
  'npmjs.com',
  'npmjs.org',
  'gitlab.com',
  'bitbucket.org'
];

const BRAND_DOMAINS: Record<string, string[]> = {
  paypal: ['paypal.com'],
  google: ['google.com', 'googleusercontent.com', 'gstatic.com', 'youtube.com'],
  microsoft: ['microsoft.com', 'live.com', 'office.com', 'office365.com', 'sharepoint.com', 'windows.com'],
  apple: ['apple.com', 'icloud.com'],
  amazon: ['amazon.com', 'amazonaws.com'],
  facebook: ['facebook.com', 'fb.com', 'meta.com'],
  instagram: ['instagram.com'],
  netflix: ['netflix.com'],
  github: ['github.com', 'githubusercontent.com', 'github.community', 'githubstatus.com'],
  npm: ['npmjs.com', 'npmjs.org']
};

const REDIRECT_PARAM_NAMES = [
  'url', 'u', 'uri', 'redirect', 'redirect_url', 'redirect_uri', 'next',
  'continue', 'target', 'to', 'dest', 'destination', 'return', 'returnurl',
  'return_url', 'callback', 'checkout_url', 'download', 'file', 'filename'
];

const FILE_REFERENCE_PARAM_NAMES = [
  'download', 'file', 'filename', 'attachment', 'installer', 'package',
  'payload', 'script', 'setup'
];

const CONTROL_AND_DIRECTIONAL_CHARS = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g;
const HAS_CONTROL_OR_DIRECTIONAL_CHARS = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/;

const safeDecode = (value: string) => {
  let decoded = value;
  for (let i = 0; i < 3; i += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      break;
    }
  }
  return decoded;
};

const normalizeForInspection = (value: string) => {
  return safeDecode(value)
    .replace(CONTROL_AND_DIRECTIONAL_CHARS, '')
    .replace(/\\/g, '/')
    .trim()
    .toLowerCase();
};

const stripFilenameNoise = (value: string) => {
  return normalizeForInspection(value)
    .split(/[?#]/)[0]
    .replace(/["'()[\]{}<>]/g, '')
    .replace(/[\s.]+$/g, '');
};

const findDangerousExtension = (value: string) => {
  const cleaned = stripFilenameNoise(value);
  return DANGEROUS_EXTENSIONS.find((ext) => {
    return cleaned.endsWith(ext) || cleaned.includes(`${ext}/`);
  });
};

const looksLikeUrl = (value: string) => {
  return /^https?:\/\//i.test(safeDecode(value).trim());
};

const looksLikeFileReference = (name: string, value: string) => {
  return FILE_REFERENCE_PARAM_NAMES.includes(name) || looksLikeUrl(value);
};

const isIpAddressHost = (host: string) => {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || /^\[[0-9a-f:]+\]$/i.test(host);
};

const isLocalOrPrivateHost = (host: string) => {
  if (host === 'localhost' || host.endsWith('.localhost') || host === '[::1]') {
    return true;
  }

  const parts = host.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return false;
  }

  const [first, second] = parts;
  return first === 10 ||
    first === 127 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168);
};

const isOfficialBrandDomain = (host: string, domains: string[]) => {
  return domains.some((domain) => host === domain || host.endsWith(`.${domain}`));
};

/**
 * Clean and parse URL for scanning
 */
export const parseUrl = (urlString: string): URL | null => {
  try {
    let url = urlString.trim();
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }
    return new URL(url);
  } catch (err) {
    return null;
  }
};

const hostMatchesDomain = (host: string, domain: string) => {
  const normalized = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  return normalized.length > 0 && (host === normalized || host.endsWith(`.${normalized}`));
};

const getHostLabels = (host: string) => {
  return host.split('.').filter(Boolean);
};

const referencesBrandInHost = (host: string, brand: string) => {
  return getHostLabels(host).some((label) => label === brand || label.startsWith(`${brand}-`) || label.endsWith(`-${brand}`));
};

const isTrustedRepositoryFilePage = (urlObj: URL, host: string, path: string) => {
  if (host === 'github.com' || host.endsWith('.github.com')) {
    return /^\/[^/]+\/[^/]+\/(blob|tree)\//.test(path);
  }

  if (host === 'gitlab.com' || host.endsWith('.gitlab.com')) {
    return /^\/[^/]+\/[^/]+\/-\/(blob|tree)\//.test(path);
  }

  if (host === 'bitbucket.org' || host.endsWith('.bitbucket.org')) {
    return /^\/[^/]+\/[^/]+\/src\//.test(path);
  }

  return urlObj.searchParams.get('raw') !== '1' && OFFICIAL_DEVELOPER_DOMAINS.some((domain) => hostMatchesDomain(host, domain));
};

/**
 * Scan a URL against all protection algorithms
 */
export const scanUrl = (rawUrlString: string, settings?: ProtectionSettings, depth = 0): RiskEvaluation => {
  const reasons: string[] = [];
  const cleanUrl = rawUrlString.trim();
  
  if (!cleanUrl) {
    return evaluateRisk([]);
  }

  const urlObj = parseUrl(cleanUrl);
  if (!urlObj) {
    return evaluateRisk(['Invalid URL format. This link cannot be resolved.']);
  }

  const host = normalizeForInspection(urlObj.hostname);
  const path = normalizeForInspection(urlObj.pathname);
  const search = normalizeForInspection(urlObj.search);
  const fullUrlText = normalizeForInspection(urlObj.href);
  const protocol = urlObj.protocol.toLowerCase();
  const isLocalHost = isLocalOrPrivateHost(host);

  const isAllowed = settings?.allowedDomains?.some((domain) => hostMatchesDomain(host, domain));
  const isBlocked = settings?.blockedDomains?.some((domain) => hostMatchesDomain(host, domain));

  if (isBlocked) {
    reasons.push('Domain is on your ClickSafe blocked list.');
  }

  if ((urlObj.username || urlObj.password) && !isAllowed) {
    reasons.push('URL hides the real destination after a username/password marker.');
  }

  if (isIpAddressHost(host) && !isAllowed && !isLocalHost) {
    reasons.push('Uses a raw IP address instead of a recognizable domain.');
  }

  if (urlObj.port && !['80', '443'].includes(urlObj.port) && !isAllowed && !isLocalHost) {
    reasons.push(`Uses a non-standard network port (${urlObj.port}).`);
  }

  // 1. Protocol Evaluation (HTTP vs HTTPS)
  if (protocol === 'http:' && !isAllowed && !isLocalHost) {
    reasons.push('Insecure connection (HTTP protocol is unencrypted and vulnerable to monitoring).');
  }

  // 2. Shortened URLs
  const isShortened = SHORTENED_DOMAINS.some(domain => host === domain || host.endsWith('.' + domain));
  if (isShortened && !isAllowed) {
    reasons.push('Uses a shortened URL service (hides the final destination).');
  }

  // 3. Punycode (Cyrillic-Latin character substitution)
  if ((host.startsWith('xn--') || host.includes('.xn--')) && !isAllowed) {
    reasons.push('Punycode domain detected (potential homograph attack to mimic trusted brands).');
  }

  Object.entries(BRAND_DOMAINS).forEach(([brand, officialDomains]) => {
    if (referencesBrandInHost(host, brand) && !isOfficialBrandDomain(host, officialDomains) && !isAllowed) {
      reasons.push(`Domain references ${brand} but is not an official ${brand} domain.`);
    }
  });

  // 4. Subdomains inspection
  const hostParts = host.split('.').filter(p => p !== 'www');
  // If host is like secure.login.bank.com-id.ru -> size is high
  // Usually, tld is last: domains like co.uk or com might have 2-3 standard parts (e.g., google.com has 2, google.co.uk has 3)
  if (hostParts.length > 4 && !isAllowed) {
    reasons.push(`Too many subdomains (${hostParts.length} levels). Attacker likely nests domains to conceal the core domain.`);
  }

  // 5. Cloud drive spoofing (Fake Google Drive / Dropbox / OneDrive)
  const isCloudKeyword = ['drive', 'dropbox', 'onedrive', 'sharepoint', 'doc-view', 'cloud-folder'].some(kw => host.includes(kw));
  const isWebLegitCloud = LEGITIMATE_CLOUD_DOMAINS.some(legit => host === legit || host.endsWith('.' + legit));
  if (isCloudKeyword && !isWebLegitCloud && !isAllowed) {
    reasons.push('Mimics a trusted Cloud Storage brand in the domain host (e.g. Google Drive/Dropbox mimic).');
  }

  // 6. Job Scam keywords
  const containsJobKeyword = FAKE_JOB_KEYWORDS.some(kw => {
    const pattern = new RegExp(kw.replace(/\s+/g, '[\\s\\-_/]*'), 'i');
    return pattern.test(path) || pattern.test(search) || pattern.test(host) || pattern.test(fullUrlText);
  });
  if (containsJobKeyword && settings?.fakeJobWarnings !== false && !isAllowed) {
    reasons.push('Fake Job Scam indicators (page requests tasks, command executions, or download-briefs).');
  }

  // 7. Developer credential request
  const containsDevKeyword = DEVELOPER_KEYWORDS.some(kw => {
    // Escape dots for regex
    const escaped = kw.replace(/\./g, '\\.');
    const pattern = new RegExp(escaped, 'i');
    return pattern.test(path) || pattern.test(search) || pattern.test(fullUrlText);
  });
  if (containsDevKeyword) {
    // Exclude legitimate developer portals to avoid high false positives
    const isLegitDev = OFFICIAL_DEVELOPER_DOMAINS.some(legit => host === legit || host.endsWith('.' + legit));
    if (!isLegitDev && settings?.developerProtection !== false && !isAllowed) {
      reasons.push('Developer secret targeting (requests access or references .env files, SSH keys, or API tokens).');
    }
  }

  // 8. Phishing keywords
  const matchedPhishingWords = PHISHING_KEYWORDS.filter(kw => {
    // Avoid double counting if already matched on job/dev
    if (['job', 'offer', 'salary', 'interview', 'assessment', 'drive', 'document'].includes(kw) && (containsJobKeyword || containsDevKeyword)) {
      return false;
    }
    const pattern = new RegExp('\\b' + kw + '\\b', 'i');
    return pattern.test(path) || pattern.test(search) || (host.includes(kw) && !host.endsWith('google.com') && !host.endsWith('github.com') && !host.endsWith('microsoft.com'));
  });

  if (matchedPhishingWords.length >= 2 && !isAllowed) {
    reasons.push(`Suspicious phishing keywords found: [${matchedPhishingWords.join(', ')}] inside URL structure.`);
  }

  // 9. Unusual files in URL
  const pathFilename = path.split('/').pop() || path;
  const matchedExt = findDangerousExtension(pathFilename) || findDangerousExtension(path);
  if (matchedExt && !isTrustedRepositoryFilePage(urlObj, host, path)) {
    reasons.push(`Direct URL executable download (${matchedExt}) which can run system-level commands.`);
  }

  for (const [name, value] of urlObj.searchParams.entries()) {
    const normalizedName = normalizeForInspection(name);
    const normalizedValue = normalizeForInspection(value);
    const queryExt = findDangerousExtension(normalizedValue);

    if (queryExt && looksLikeFileReference(normalizedName, value)) {
      reasons.push(`Query parameter "${normalizedName}" references a dangerous file extension (${queryExt}).`);
    }

    if (depth < 1 && REDIRECT_PARAM_NAMES.includes(normalizedName) && looksLikeUrl(value)) {
      const nestedRisk = scanUrl(value, settings, depth + 1);
      if (nestedRisk.status !== 'safe') {
        reasons.push(`Redirect parameter "${normalizedName}" points to a risky destination.`);
      }
    }
  }

  if (settings?.strictMode && !isAllowed && reasons.length === 0) {
    reasons.push('Strict mode: domain has not been added to your allowed list.');
  }

  return evaluateRisk(reasons, false);
};

/**
 * Scan static filenames (downloads)
 */
export const scanDownloadedFile = (filename: string, sourceUrl: string, settings?: ProtectionSettings): RiskEvaluation => {
  const reasons: string[] = [];
  const lowercaseFile = normalizeForInspection(filename);

  // 1. Check dangerous extension
  const ext = findDangerousExtension(lowercaseFile);
  if (ext) {
    reasons.push(`Dangerous extension (${ext}) that can execute code, scripts, or modify settings.`);
  }

  if (HAS_CONTROL_OR_DIRECTIONAL_CHARS.test(filename)) {
    reasons.push('Filename contains invisible or direction-changing characters used to disguise extensions.');
  }

  // 2. Check Job Scam related downloads
  const containsJobKeyword = FAKE_JOB_KEYWORDS.some(kw => lowercaseFile.includes(kw.replace(/\s+/g, '_')) || lowercaseFile.includes(kw));
  if (containsJobKeyword) {
    reasons.push('Fake Job Scam pattern (contract brief, interview code, install task disguised as a job).');
  }

  // 3. Check developer secret leaks/traps
  const containsDevKeyword = DEVELOPER_KEYWORDS.some(kw => lowercaseFile.includes(kw));
  if (containsDevKeyword) {
    reasons.push('Targeting developer secrets (contains key names like .env, key-file, SSH, or tokens).');
  }

  // Check source url as well
  const urlObj = parseUrl(sourceUrl);
  if (urlObj) {
    const urlRisk = scanUrl(sourceUrl, settings);
    urlRisk.reasons.forEach(r => {
      if (!reasons.includes(r)) {
        reasons.push(`Source URL Warning: ${r}`);
      }
    });
  }

  return evaluateRisk(reasons, true);
};
