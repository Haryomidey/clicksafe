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
  'stackoverflow.com',
  'npmjs.com',
  'npmjs.org',
  'gitlab.com',
  'bitbucket.org'
];

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

/**
 * Scan a URL against all protection algorithms
 */
export const scanUrl = (rawUrlString: string, settings?: ProtectionSettings): RiskEvaluation => {
  const reasons: string[] = [];
  const cleanUrl = rawUrlString.trim();
  
  if (!cleanUrl) {
    return evaluateRisk([]);
  }

  const urlObj = parseUrl(cleanUrl);
  if (!urlObj) {
    return evaluateRisk(['Invalid URL format. This link cannot be resolved.']);
  }

  const host = urlObj.hostname.toLowerCase();
  const path = urlObj.pathname.toLowerCase();
  const search = urlObj.search.toLowerCase();
  const protocol = urlObj.protocol.toLowerCase();

  const isAllowed = settings?.allowedDomains?.some((domain) => hostMatchesDomain(host, domain));
  const isBlocked = settings?.blockedDomains?.some((domain) => hostMatchesDomain(host, domain));

  if (isBlocked) {
    reasons.push('Domain is on your ClickSafe blocked list.');
  }

  // 1. Protocol Evaluation (HTTP vs HTTPS)
  if (protocol === 'http:' && !isAllowed) {
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
    return pattern.test(path) || pattern.test(search) || pattern.test(host);
  });
  if (containsJobKeyword && settings?.fakeJobWarnings !== false && !isAllowed) {
    reasons.push('Fake Job Scam indicators (page requests tasks, command executions, or download-briefs).');
  }

  // 7. Developer credential request
  const containsDevKeyword = DEVELOPER_KEYWORDS.some(kw => {
    // Escape dots for regex
    const escaped = kw.replace(/\./g, '\\.');
    const pattern = new RegExp(escaped, 'i');
    return pattern.test(path) || pattern.test(search);
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
  const hasDangerousExt = DANGEROUS_EXTENSIONS.some(ext => {
    return path.endsWith(ext) || path.includes(ext + '?') || path.includes(ext + '/');
  });
  if (hasDangerousExt) {
    const matchedExt = DANGEROUS_EXTENSIONS.find(ext => path.includes(ext));
    reasons.push(`Direct URL executable download (${matchedExt}) which can run system-level commands.`);
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
  const lowercaseFile = filename.toLowerCase();

  // 1. Check dangerous extension
  const hasDangerousExt = DANGEROUS_EXTENSIONS.some(ext => lowercaseFile.endsWith(ext));
  if (hasDangerousExt) {
    const ext = DANGEROUS_EXTENSIONS.find(e => lowercaseFile.endsWith(e)) || '';
    reasons.push(`Dangerous extension (${ext}) that can execute code, scripts, or modify settings.`);
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
