import React, { useState, useEffect } from 'react';
import {
  getStorageData,
  saveSettings,
  saveHistory,
  saveDownloads,
  saveChecklist,
  addHistoryItem,
  addDownloadItem,
  clearAllData
} from '../lib/storage';
import { ProtectionSettings, ScanHistoryItem, LoggedDownload, ChecklistItem } from '../types';
import { StatCard } from '../components/StatCard';
import { RiskBadge } from '../components/RiskBadge';
import { ToggleRow } from '../components/ToggleRow';
import { EmptyState } from '../components/EmptyState';
import { ActivityTable } from '../components/ActivityTable';
import { UrlScanner } from '../components/UrlScanner';
import { isRealExtension } from '../lib/chrome';
import { scanDownloadedFile } from '../lib/scanner';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  ClipboardList,
  Plus,
  Trash2,
  ListFilter,
  RefreshCw,
  Clock,
  HelpCircle,
  FolderOpen,
  ArrowRight,
  Info
} from 'lucide-react';
import { SAFETY_TIPS } from '../lib/constants';

interface DashboardProps {
  currentTab: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ currentTab }) => {
  const runningInChrome = isRealExtension();
  const [settings, setSettings] = useState<ProtectionSettings | null>(null);
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [downloads, setDownloads] = useState<LoggedDownload[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Simulation parameters for downloads
  const [simFilename, setSimFilename] = useState('');
  const [simUrlInput, setSimUrlInput] = useState('');
  const [activeWarningItem, setActiveWarningItem] = useState<LoggedDownload | null>(null);

  // Settings Allowed / Blocked list inputs
  const [newAllowedDomain, setNewAllowedDomain] = useState('');
  const [newBlockedDomain, setNewBlockedDomain] = useState('');

  // Loaded details toggle
  const [activeChecklistFilter, setActiveChecklistFilter] = useState<'all' | 'links' | 'jobs' | 'downloads' | 'dev'>('all');

  const loadData = async () => {
    try {
      const db = await getStorageData();
      setSettings(db.settings);
      setHistory(db.history);
      setDownloads(db.downloads);
      setChecklist(db.checklist);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Sync storage events in preview sandbox
    const syncState = () => {
      loadData();
    };
    window.addEventListener('storage', syncState);
    return () => window.removeEventListener('storage', syncState);
  }, []);

  const handleToggleSetting = async (key: keyof ProtectionSettings) => {
    if (!settings) return;
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    await saveSettings(updated);
    window.dispatchEvent(new Event('storage'));
  };

  const handleToggleChecklist = async (id: string) => {
    const updated = checklist.map((item) => {
      if (item.id === id) {
        return { ...item, checked: !item.checked };
      }
      return item;
    });
    setChecklist(updated);
    await saveChecklist(updated);
  };

  const handleRemoveHistoryItem = async (id: string) => {
    const updated = history.filter((item) => item.id !== id);
    setHistory(updated);
    await saveHistory(updated);
  };

  const handleClearHistory = async () => {
    setHistory([]);
    await saveHistory([]);
  };

  const handleSimulateDownloadEvent = async (filename: string, sourceUrl: string) => {
    if (!filename) return;
    const scanResult = scanDownloadedFile(filename, sourceUrl, settings || undefined);
    
    let type: 'standard' | 'dangerous' | 'job' | 'developer' = 'standard';
    if (scanResult.reasons.some(r => r.includes('Job Scam'))) type = 'job';
    else if (scanResult.reasons.some(r => r.includes('developer secrets'))) type = 'developer';
    else if (scanResult.reasons.some(r => r.includes('Dangerous extension'))) type = 'dangerous';

    const newItem = await addDownloadItem({
      filename,
      url: sourceUrl,
      fileSize: '4.8 MB',
      riskScore: scanResult.score,
      status: scanResult.status,
      flaggedReasons: scanResult.reasons,
      warningViewed: false,
      type
    });

    setSimFilename('');
    setSimUrlInput('');
    await loadData();

    // If file is caution or dangerous, immediately show simulated extension threat screen!
    if (scanResult.status !== 'safe') {
      setActiveWarningItem(newItem);
    }
  };

  const handleAddAllowedDomain = async () => {
    if (!settings || !newAllowedDomain.trim()) return;
    const cleanDomain = newAllowedDomain.trim().toLowerCase();
    if (settings.allowedDomains.includes(cleanDomain)) return;

    const updated = {
      ...settings,
      allowedDomains: [...settings.allowedDomains, cleanDomain]
    };
    setSettings(updated);
    await saveSettings(updated);
    setNewAllowedDomain('');
  };

  const handleRemoveAllowedDomain = async (domain: string) => {
    if (!settings) return;
    const updated = {
      ...settings,
      allowedDomains: settings.allowedDomains.filter(d => d !== domain)
    };
    setSettings(updated);
    await saveSettings(updated);
  };

  const handleAddBlockedDomain = async () => {
    if (!settings || !newBlockedDomain.trim()) return;
    const cleanDomain = newBlockedDomain.trim().toLowerCase();
    if (settings.blockedDomains.includes(cleanDomain)) return;

    const updated = {
      ...settings,
      blockedDomains: [...settings.blockedDomains, cleanDomain]
    };
    setSettings(updated);
    await saveSettings(updated);
    setNewBlockedDomain('');
  };

  const handleRemoveBlockedDomain = async (domain: string) => {
    if (!settings) return;
    const updated = {
      ...settings,
      blockedDomains: settings.blockedDomains.filter(d => d !== domain)
    };
    setSettings(updated);
    await saveSettings(updated);
  };

  const handleFullStorageClear = async () => {
    if (confirm('Are you sure you want to restore all initial settings and empty your scanning databases?')) {
      await clearAllData();
      await loadData();
    }
  };

  if (loading || !settings) {
    return (
      <div className="flex flex-col items-center justify-center p-12 py-24 text-neutral-500 font-mono text-xs">
        <RefreshCw className="h-6 w-6 stroke-[1.5] animate-spin mb-3 text-neutral-800" />
        <span>Loading ClickSafe Central Module...</span>
      </div>
    );
  }

  // Calculate quick stats totals
  const totalScans = history.length;
  const suspiciousLinksCount = history.filter((h) => h.status === 'caution').length;
  const dangerousBlockedLinksCount = history.filter((h) => h.status === 'dangerous').length;
  const dangerousDownloadsCount = downloads.filter((d) => d.status === 'dangerous').length;

  return (
    <div className="space-y-6">
      {/* Simulation Warning Floating Banner inside development */}
      {activeWarningItem && (
        <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-lg border border-neutral-200 shadow-2xl max-w-lg w-full p-6 relative">
            <div className="flex items-center gap-3 text-rose-700 font-sans border-b border-rose-100 pb-4 mb-4">
              <ShieldAlert className="h-7 w-7 stroke-[2]" />
              <div>
                <h3 className="text-base font-bold text-neutral-950">
                  ClickSafe Warning: Suspicious File Triggered
                </h3>
                <p className="text-xs text-rose-800 font-medium">
                  Threat Mitigation Block
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 bg-neutral-50 rounded-lg border border-neutral-150 text-xs">
                <span className="text-[10px] uppercase font-mono text-neutral-400">Inspected Download</span>
                <p className="font-semibold text-neutral-900 font-mono truncate mt-0.5 select-all">
                  {activeWarningItem.filename}
                </p>
                <p className="text-[10px] text-neutral-500 font-mono truncate mt-0.5">
                  URL: {activeWarningItem.url}
                </p>
              </div>

              {/* Warning core alert labels */}
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-900 leading-normal text-xs font-medium space-y-1">
                <p className="font-semibold text-rose-950">Pause before opening this.</p>
                <p className="font-sans font-medium text-rose-850">
                  This file can run commands on your computer that bypass standard operating checks.
                </p>
                {activeWarningItem.type === 'job' && (
                  <p className="text-[11px] text-rose-750 font-serif leading-snug pt-1.5 border-t border-rose-200/50">
                    “This looks like a job-related file or link. Attackers often use fake job offers (e.g., mock recruiter coding briefs) to trick people into running malware.”
                  </p>
                )}
                {activeWarningItem.type === 'developer' && (
                  <p className="text-[11px] text-rose-750 font-serif leading-snug pt-1.5 border-t border-rose-200/50">
                    “Warn: Developer credentials threat detected. File attempts to index .env keys, github credentials, or security configurations.”
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-mono text-neutral-400">Heuristic Flag Reasons:</span>
                <div className="space-y-1">
                  {activeWarningItem.flaggedReasons.map((reason, idx) => (
                    <div key={idx} className="text-[11px] font-sans flex items-start gap-1 p-2 bg-neutral-50 border border-neutral-150 rounded">
                      <span className="text-rose-600 block leading-none">•</span>
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2.5 mt-6 border-t border-neutral-150 pt-4 justify-end text-xs font-mono">
              <button
                onClick={() => {
                  // Acknowledge risk and set warning viewed
                  const updatedList = downloads.map(d => d.id === activeWarningItem.id ? { ...d, warningViewed: true } : d);
                  setDownloads(updatedList);
                  saveDownloads(updatedList);
                  setActiveWarningItem(null);
                }}
                className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded font-semibold cursor-pointer"
              >
                Acknowledge Warning
              </button>
              <button
                onClick={() => {
                  // Simulate deleting / isolating the file
                  const filteredList = downloads.filter(d => d.id !== activeWarningItem.id);
                  setDownloads(filteredList);
                  saveDownloads(filteredList);
                  setActiveWarningItem(null);
                }}
                className="px-4 py-2 border border-neutral-200 bg-white hover:text-rose-700 hover:border-rose-300 rounded text-neutral-700 cursor-pointer"
              >
                Isolate file (Simulated deletion)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW PANEL: OVERVIEW */}
      {currentTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          {/* Main banner block */}
          <div className="p-6 bg-white border border-neutral-200 rounded-lg shadow-xs flex flex-col md:flex-row items-start justify-between gap-6">
            <div className="space-y-1 md:max-w-xl">
              <h2 className="text-xl font-bold tracking-tight text-neutral-900">
                Local Security Sandbox Console
              </h2>
              <p className="text-xs text-neutral-500 leading-relaxed font-sans">
                ClickSafe protects you directly from your browser utilizing local heuristic databases. It inspects links, protects your developer credentials from being leaked, block fake recruitment task scams, and logs file download extensions safely.
              </p>
            </div>
            
            <div className="p-4 bg-neutral-950 text-white rounded-lg flex items-center gap-3 border border-neutral-900 self-stretch md:self-auto min-w-[200px] shrink-0 justify-center">
              <ShieldCheck className="h-6 w-6 text-emerald-400 stroke-[2.25]" />
              <div className="font-mono">
                <span className="text-[10px] text-neutral-400 block uppercase leading-none">Guard Status</span>
                <span className="text-xs font-bold font-sans mt-1 block">Active Shield Mode</span>
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Processed URLs"
              value={totalScans}
              icon={Shield}
              description="Total processed hyperlinks during browser session"
              trend={{ value: '100% Secure', label: 'Local screening', isPositive: true }}
            />
            <StatCard
              title="Scam Threats Flagged"
              value={dangerousBlockedLinksCount + suspiciousLinksCount}
              icon={AlertTriangle}
              description="Heuristically blocked phishing or clone pages"
              trend={{ value: 'Mitigated', label: 'Blocked redirects', isPositive: true }}
            />
            <StatCard
              title="Dangerous Downloads"
              value={dangerousDownloadsCount}
              icon={ShieldAlert}
              description="Dangerous file extension formats detected"
              trend={{ value: 'Protected', label: 'Execution prevented', isPositive: true }}
            />
            <StatCard
              title="Active Rules"
              value={Object.values(settings).filter(v => v === true).length + 15}
              icon={ClipboardList}
              description="Active threat databases and protocol checkers"
              trend={{ value: 'Shield Enabled', label: 'Real-time protection', isPositive: true }}
            />
          </div>

          {/* Activity Table */}
          <ActivityTable
            history={history}
            onRemoveItem={handleRemoveHistoryItem}
            onClearAll={handleClearHistory}
          />

          {/* Lower layout grid: Safety Tips & Quick settings summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg border border-neutral-200 p-5 md:col-span-2 space-y-4">
              <h3 className="text-sm font-semibold text-neutral-950 font-sans pb-2 border-b border-neutral-100">
                ClickSafe Anti-Phishing Advisory & Tips
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {SAFETY_TIPS.map((tip, index) => (
                  <div key={index} className="p-3 bg-neutral-50 rounded border border-neutral-150 flex flex-col justify-between">
                    <div>
                      <h4 className="text-[11px] font-bold text-neutral-900 leading-tight">
                        {tip.title}
                      </h4>
                      <p className="text-[10px] text-neutral-500 font-sans mt-1.5 leading-relaxed">
                        {tip.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-neutral-200 p-5 space-y-3 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-neutral-400 font-semibold mb-2.5">
                  Protection Metrics Check
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between pb-1.5 border-b border-neutral-50">
                    <span className="text-neutral-500 font-sans">Active Link Protection</span>
                    <span className={`font-mono font-bold ${settings.linkProtection ? 'text-emerald-700' : 'text-neutral-400'}`}>
                      {settings.linkProtection ? '[ONLINE]' : '[OFFLINE]'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pb-1.5 border-b border-neutral-50">
                    <span className="text-neutral-500 font-sans font-medium">Developer secret key watch</span>
                    <span className={`font-mono font-bold ${settings.developerProtection ? 'text-emerald-700' : 'text-neutral-400'}`}>
                      {settings.developerProtection ? '[ON]' : '[OFF]'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pb-1.5 border-b border-neutral-50">
                    <span className="text-neutral-500 font-sans font-medium">Recruit phishing scanner</span>
                    <span className={`font-mono font-bold ${settings.fakeJobWarnings ? 'text-emerald-700' : 'text-neutral-400'}`}>
                      {settings.fakeJobWarnings ? '[ON]' : '[OFF]'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-neutral-900 text-white rounded border border-neutral-800 flex items-center gap-1.5 mt-4">
                <Info className="h-4 w-4 shrink-0 text-amber-400" />
                <p className="text-[9px] font-mono leading-tight">
                  No active server backend is required. Absolute security through local sandbox runtime.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW PANEL: MANUAL LINK SCANNER */}
      {currentTab === 'scanner' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white rounded-lg border border-neutral-200 p-5">
            <h2 className="text-md font-bold tracking-tight text-neutral-900">
              Manual Link Diagnostics
            </h2>
            <p className="text-xs text-neutral-500 max-w-2xl mt-1 leading-relaxed">
              Verify links before navigating to them. Enter any URL below. It scans the protocol, subdomains list, redirects structures, punycode characters, and flags threat criteria immediately.
            </p>
          </div>

          <UrlScanner
            settings={settings}
            onScanCompleted={(newItem) => {
              addHistoryItem(newItem).then(() => {
                loadData();
              });
            }}
          />
        </div>
      )}

      {/* VIEW PANEL: FILE DOWNLOAD PROTECTION */}
      {currentTab === 'downloads' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white rounded-lg border border-neutral-200 p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-md font-bold tracking-tight text-neutral-900">
                Download Protection Sandbox
              </h2>
              <p className="text-xs text-neutral-500">
                Simulate downloading files to experience physical endpoint warning blocks.
              </p>
            </div>

            {!runningInChrome && (
            <div className="flex flex-wrap gap-2 text-xs font-mono">
              <button
                onClick={() => handleSimulateDownloadEvent('financial_ledger.xlsx', 'https://sharepoint.company.com/files/financial_ledger.xlsx')}
                className="px-2.5 py-1.5 rounded border border-neutral-200 hover:border-neutral-950 bg-white cursor-pointer"
              >
                📥 Simulate Excel File
              </button>
              <button
                onClick={() => handleSimulateDownloadEvent('interview_tasks.pdf.exe', 'https://drive-google-job-brief.net/recruit/test-run.exe')}
                className="px-2.5 py-1.5 rounded border border-neutral-200 hover:border-neutral-950 bg-white cursor-pointer hover:bg-rose-50 hover:text-rose-700"
              >
                🚨 Simulate Job Assessment .exe
              </button>
              <button
                onClick={() => handleSimulateDownloadEvent('credentials_secrets.env', 'https://github.com/profile/settings/.env')}
                className="px-2.5 py-1.5 rounded border border-neutral-200 hover:border-neutral-955 bg-white cursor-pointer hover:bg-amber-50"
              >
                🔐 Simulate Secret Keys .env
              </button>
            </div>
            )}
          </div>

          <div className="bg-white rounded-lg border border-neutral-200 p-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-neutral-100 mb-4">
              <div className="p-1.5 rounded bg-neutral-100 border border-neutral-200">
                <FolderOpen className="h-4 w-4 text-neutral-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-neutral-900">
                  Inspected Files Registry
                </h3>
                <p className="text-xs text-neutral-400">
                  List of downloaded files tracked by Chrome download monitor.
                </p>
              </div>
            </div>

            {downloads.length === 0 ? (
              <EmptyState
                icon={FolderOpen}
                title="No file downloads scanned yet"
                description="Simulate downloads using the quick actions above to verify extension safety alerts."
              />
            ) : (
              <div className="divide-y divide-neutral-100">
                {downloads.map((item) => (
                  <div key={item.id} className="py-3 px-1 hover:bg-neutral-50 flex items-start gap-4 justify-between leading-snug">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-neutral-800 truncate select-all">{item.filename}</span>
                        {item.status !== 'safe' && !item.warningViewed && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-100 text-amber-800 font-mono font-bold uppercase tracking-wider">
                            Warning Pending
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-neutral-400 font-mono truncate mt-0.5" title={item.url}>
                        Scanned source: {item.url}
                      </p>
                      <p className="text-[9px] font-mono mt-1 text-neutral-500 uppercase tracking-widest gap-2 flex flex-wrap">
                        <span>Size: {item.fileSize || 'N/A'}</span>
                        <span>•</span>
                        <span>Scanned: {new Date(item.timestamp).toLocaleTimeString()}</span>
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <RiskBadge status={item.status} score={item.riskScore} size="sm" />
                      
                      {item.status !== 'safe' && (
                        <button
                          onClick={() => setActiveWarningItem(item)}
                          className="px-2 py-1 bg-neutral-900 text-white rounded text-[10px] font-mono cursor-pointer"
                        >
                          View Warning Block
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW PANEL: SAFE CHECKLIST */}
      {currentTab === 'checklist' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white rounded-lg border border-neutral-200 p-5">
            <h2 className="text-md font-bold tracking-tight text-neutral-900">
              Interactive Self-Protection Checklists
            </h2>
            <p className="text-xs text-neutral-500">
              Technical tools are powerful, but maintaining solid habits is the key to preventing attacks. Use these lists to audit your security practices.
            </p>
          </div>

          <div className="bg-white border border-neutral-200 rounded-lg p-5">
            {/* Checklist Category Nav */}
            <div className="flex flex-wrap gap-1.5 pb-4 border-b border-neutral-150 mb-5">
              {(['all', 'links', 'jobs', 'downloads', 'dev'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveChecklistFilter(filter)}
                  className={`px-3 py-1 text-xs font-mono capitalize rounded-md cursor-pointer transition-colors ${
                    activeChecklistFilter === filter
                      ? 'bg-neutral-900 text-white font-semibold'
                      : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100'
                  }`}
                >
                  {filter === 'all' ? 'All categories' : filter === 'dev' ? 'Developer' : filter}
                </button>
              ))}
            </div>

            {/* Core list grid of habits */}
            <div className="space-y-4">
              {checklist
                .filter((item) => activeChecklistFilter === 'all' || item.category === activeChecklistFilter)
                .map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleToggleChecklist(item.id)}
                    className={`p-4 border rounded-lg transition-all cursor-pointer flex items-start gap-4 ${
                      item.checked
                        ? 'bg-emerald-50/20 border-emerald-150 text-neutral-700'
                        : 'bg-white border-neutral-200 hover:border-neutral-900 text-neutral-900'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={item.checked}
                      readOnly
                      className="h-4 w-4 rounded border-neutral-300 text-neutral-900 bg-neutral-50/20"
                    />
                    
                    <div>
                      <h4 className="text-xs font-semibold leading-none flex items-center gap-1.5">
                        <span className="font-sans">{item.title}</span>
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-mono tracking-wider bg-neutral-100 text-neutral-500 uppercase">
                          {item.category === 'dev' ? 'developer' : item.category}
                        </span>
                      </h4>
                      <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed font-sans font-medium">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW PANEL: SHIELD SETTINGS */}
      {currentTab === 'settings' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white rounded-lg border border-neutral-200 p-5">
            <h2 className="text-md font-bold tracking-tight text-neutral-900">
              Heuristic Mitigation Configuration
            </h2>
            <p className="text-xs text-neutral-500">
              Adjust how local algorithms audit your browsing experience.
            </p>
          </div>

          <div className="bg-white border border-neutral-200 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-neutral-950 pb-3 border-b border-neutral-100">
              Active Security Shields
            </h3>

            <div className="divide-y divide-neutral-100">
              <ToggleRow
                title="Real-Time Hyperlink Audit"
                description="Checks URLs you hover or query. Automatically assesses subdomain depth, punycode spoofing, and insecure unencrypted protocol streams."
                checked={settings.linkProtection}
                onChange={() => handleToggleSetting('linkProtection')}
              />
              <ToggleRow
                title="Download Extension Monitor"
                description="Intercepts file download requests to warning-flag potentially risky installer payloads (e.g. exe, msi, ps1, bat, zip)."
                checked={settings.downloadMonitoring}
                onChange={() => handleToggleSetting('downloadMonitoring')}
              />
              <ToggleRow
                title="Anti Job Scam Shield"
                description="Checks recruiter briefs, coding assessments, or task installer URLs for fraud indicators (such as 'assessments brief' or 'interview run' matching)."
                checked={settings.fakeJobWarnings}
                onChange={() => handleToggleSetting('fakeJobWarnings')}
              />
              <ToggleRow
                title="Developer Secret Watch"
                description="Flags files or requests trying to access .env secrets, git config folders, wallet seeds, npm tokens, or SSH keys."
                checked={settings.developerProtection}
                onChange={() => handleToggleSetting('developerProtection')}
              />
              <ToggleRow
                title="Maximum Tight Mode"
                description="Requires absolute domain-level verification. Flags any domain without secure records or high reputation score directly, regardless of keywords."
                checked={settings.strictMode}
                onChange={() => handleToggleSetting('strictMode')}
              />
            </div>
          </div>

          {/* Whitelisting & Blocklists */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-neutral-200 rounded-lg p-5">
              <h3 className="text-xs font-mono uppercase tracking-wider text-neutral-400 font-semibold mb-3">
                Allowed Domain Registry
              </h3>
              
              <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <input
                  type="text"
                  value={newAllowedDomain}
                  onChange={(e) => setNewAllowedDomain(e.target.value)}
                  placeholder="e.g. trustedport.msdn.com"
                  className="flex-1 px-3 py-1.5 text-xs font-mono rounded border border-neutral-200 focus:outline-hidden focus:border-neutral-900 bg-neutral-50/25 w-full"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddAllowedDomain(); }}
                />
                <button
                  onClick={handleAddAllowedDomain}
                  className="px-3 py-1.5 text-xs font-mono bg-neutral-900 text-white rounded cursor-pointer w-full sm:w-auto text-center shrink-0"
                >
                  White list
                </button>
              </div>

              <div className="space-y-1 max-h-[160px] overflow-y-auto">
                {settings.allowedDomains.map((domain) => (
                  <div key={domain} className="flex items-center justify-between p-2 bg-neutral-50 rounded border border-neutral-100 text-xs">
                    <span className="font-mono">{domain}</span>
                    <button
                      onClick={() => handleRemoveAllowedDomain(domain)}
                      className="p-1 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-neutral-200 rounded-lg p-5">
              <h3 className="text-xs font-mono uppercase tracking-wider text-neutral-400 font-semibold mb-3">
                Restricted Domain Blocklist
              </h3>
              
              <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <input
                  type="text"
                  value={newBlockedDomain}
                  onChange={(e) => setNewBlockedDomain(e.target.value)}
                  placeholder="e.g. bad-link-phish-alert.ru"
                  className="flex-1 px-3 py-1.5 text-xs font-mono rounded border border-neutral-200 focus:outline-hidden focus:border-neutral-900 bg-neutral-50/25 w-full"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddBlockedDomain(); }}
                />
                <button
                  onClick={handleAddBlockedDomain}
                  className="px-3 py-1.5 text-xs font-mono bg-neutral-900 text-white rounded cursor-pointer w-full sm:w-auto text-center shrink-0"
                >
                  Block list
                </button>
              </div>

              <div className="space-y-1 max-h-[160px] overflow-y-auto">
                {settings.blockedDomains.map((domain) => (
                  <div key={domain} className="flex items-center justify-between p-2 bg-neutral-50 rounded border border-neutral-100 text-xs">
                    <span className="font-mono">{domain}</span>
                    <button
                      onClick={() => handleRemoveBlockedDomain(domain)}
                      className="p-1 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Danger zone actions */}
          <div className="bg-white border border-rose-200 rounded-lg p-5">
            <h3 className="text-xs font-mono uppercase text-rose-850 font-bold mb-2">
              System Operations Zone
            </h3>
            <p className="text-xs text-neutral-500 mb-4 max-w-xl leading-relaxed">
              These commands immediately modify the underlying simulated storage registries. Be certain when erasing alert history files.
            </p>
            <div className="flex gap-3 text-xs font-mono">
              <button
                onClick={handleFullStorageClear}
                className="px-4 py-2 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 rounded font-semibold transition-all cursor-pointer"
              >
                Reset databases & clear history log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
