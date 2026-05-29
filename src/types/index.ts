export type SafetyStatus = 'safe' | 'caution' | 'dangerous';

export interface ScanResult {
  url: string;
  riskScore: number;
  status: SafetyStatus;
  reasons: string[];
  recommendedAction: string;
  screenshotUrl?: string;
}

export interface ScanHistoryItem {
  id: string;
  url: string;
  timestamp: number;
  riskScore: number;
  status: SafetyStatus;
  reasons: string[];
  type: 'link' | 'download' | 'job' | 'developer';
  actionTaken?: 'blocked' | 'warned' | 'allowed' | 'cleaned';
}

export interface ProtectionSettings {
  linkProtection: boolean;
  downloadMonitoring: boolean;
  fakeJobWarnings: boolean;
  developerProtection: boolean;
  strictMode: boolean;
  allowedDomains: string[];
  blockedDomains: string[];
}

export interface LoggedDownload {
  id: string;
  filename: string;
  url: string;
  fileSize?: string;
  timestamp: number;
  riskScore: number;
  status: SafetyStatus;
  flaggedReasons: string[];
  warningViewed: boolean;
  type: 'standard' | 'dangerous' | 'job' | 'developer';
}

export interface ChecklistItem {
  id: string;
  category: 'links' | 'jobs' | 'downloads' | 'dev';
  title: string;
  description: string;
  checked: boolean;
}
