import { ProtectionSettings, ChecklistItem } from '../types';

export const STORAGE_VERSION = 1;

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

export const INITIAL_CHECKLIST: ChecklistItem[] = [];
