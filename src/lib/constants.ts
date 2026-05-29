import { ProtectionSettings, ChecklistItem } from '../types';

export const DANGEROUS_EXTENSIONS = [
  '.exe', '.msi', '.bat', '.cmd', '.ps1', '.vbs', '.js',
  '.jar', '.scr', '.reg', '.hta', '.lnk', '.zip', '.rar', '.7z'
];

export const FAKE_JOB_KEYWORDS = [
  'remote job offer',
  'interview task',
  'salary discussion',
  'coding assessment',
  'job details',
  'recruiter',
  'hr',
  'google drive',
  'dropbox',
  'download brief',
  'project files',
  'install this app',
  'run this command',
  'telegram interview',
  'whatsapp recruiter',
  'upwork deposit',
  'fiverr task',
  'pdf description'
];

export const DEVELOPER_KEYWORDS = [
  '.env',
  'github token',
  'ssh key',
  'api key',
  'npm token',
  'wallet seed phrase',
  'browser cookies',
  'localstorage token',
  'aws credentials',
  'private key',
  'credential leak'
];

export const PHISHING_KEYWORDS = [
  'login', 'verify', 'secure', 'account', 'update', 'job', 'offer',
  'salary', 'interview', 'assessment', 'drive', 'document', 'billing',
  'bank', 'signin', 'support', 'refutes', 'urgent'
];

export const INITIAL_SETTINGS: ProtectionSettings = {
  linkProtection: true,
  downloadMonitoring: true,
  fakeJobWarnings: true,
  developerProtection: true,
  strictMode: false,
  allowedDomains: [],
  blockedDomains: []
};

export const INITIAL_CHECKLIST: ChecklistItem[] = [
  {
    id: 'link1',
    category: 'links',
    title: 'Check domain spelling',
    description: 'Verify if a domain name uses visual tricks like "goog1e.com" or "g00gle.com". This is called typosquatting.',
    checked: true
  },
  {
    id: 'link2',
    category: 'links',
    title: 'Avoid shortened URLs from strangers',
    description: 'Shortened URLs (t.co, bit.ly) hide the final destination. Scan them first with ClickSafe.',
    checked: false
  },
  {
    id: 'job1',
    category: 'jobs',
    title: 'Never run recruiter code',
    description: 'Legitimate interview assessments are hosted on platforms like HackerRank. Never run a local script or .exe from a recruiter.',
    checked: true
  },
  {
    id: 'job2',
    category: 'jobs',
    title: 'Question "Document briefs" on cloud storage',
    description: 'Phishing actors upload dangerous self-extracting zip or .exe files with job descriptions to Google Drive/Dropbox.',
    checked: false
  },
  {
    id: 'download1',
    category: 'downloads',
    title: 'Enable native file-extension view',
    description: 'Ensure Windows/macOS shows full file extensions so you do not accidentally open "contract.pdf.exe".',
    checked: false
  },
  {
    id: 'dev1',
    category: 'dev',
    title: 'Separate your SSH & GitHub keys',
    description: 'Store credentials in highly secure credential vaults. Never type them or paste them into web forums.',
    checked: true
  }
];

export const SAFETY_TIPS = [
  {
    title: 'The Double-Extension Trick',
    description: 'Attackers name files like "job_description.pdf.exe" hoping your device hides the ".exe" suffix, leading you to run computer instructions.',
    cta: 'Learn more'
  },
  {
    title: 'LinkedIn Recruiters & Discord Tasks',
    description: 'Scammers create high-profile recruiter profiles on LinkedIn, then move you to Discord or Telegram to share a zipped node task containing credential stealers.',
    cta: 'Read case study'
  },
  {
    title: 'Punycode Spoofing Explained',
    description: 'Punycode represents Unicode in ASCII (like "xn--ca-nsa.com"). Attackers use cyrillic letters that look identical to latin letters (e.g., а vs a) to spoof banks.',
    cta: 'Scan site'
  }
];
