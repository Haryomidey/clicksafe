import React, { useState, useEffect } from 'react';
import {
  getStorageData,
  saveSettings,
  saveHistory,
  saveDownloads,
  saveChecklist,
  addHistoryItem,
  clearAllData
} from '../lib/storage';
import { ProtectionSettings, ScanHistoryItem, LoggedDownload, ChecklistItem } from '../types';
import { StatCard } from '../components/StatCard';
import { RiskBadge } from '../components/RiskBadge';
import { ToggleRow } from '../components/ToggleRow';
import { EmptyState } from '../components/EmptyState';
import { ActivityTable } from '../components/ActivityTable';
import { UrlScanner } from '../components/UrlScanner';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  ClipboardList,
  Plus,
  Trash2,
  RefreshCw,
  FolderOpen,
  Info
} from 'lucide-react';

interface DashboardProps {
  currentTab: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ currentTab }) => {
  const [settings, setSettings] = useState<ProtectionSettings | null>(null);
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [downloads, setDownloads] = useState<LoggedDownload[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeWarningItem, setActiveWarningItem] = useState<LoggedDownload | null>(null);

  // Settings Allowed / Blocked list inputs
  const [newAllowedDomain, setNewAllowedDomain] = useState('');
  const [newBlockedDomain, setNewBlockedDomain] = useState('');

  // Loaded details toggle
  const [activeChecklistFilter, setActiveChecklistFilter] = useState<'all' | 'links' | 'jobs' | 'downloads' | 'dev'>('all');
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [newChecklistDescription, setNewChecklistDescription] = useState('');
  const [newChecklistCategory, setNewChecklistCategory] = useState<ChecklistItem['category']>('links');

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

    // Sync storage events when running outside the extension options page.
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

  const handleAddChecklistItem = async () => {
    const title = newChecklistTitle.trim();
    const description = newChecklistDescription.trim();
    if (!title || !description) return;

    const updated: ChecklistItem[] = [
      {
        id: `c_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        category: newChecklistCategory,
        title,
        description,
        checked: false
      },
      ...checklist
    ];

    setChecklist(updated);
    await saveChecklist(updated);
    setNewChecklistTitle('');
    setNewChecklistDescription('');
  };

  const handleRemoveChecklistItem = async (id: string) => {
    const updated = checklist.filter((item) => item.id !== id);
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
        <span>Loading your protection dashboard...</span>
      </div>
    );
  }

  // Calculate quick stats totals
  const totalScans = history.length;
  const suspiciousLinksCount = history.filter((h) => h.status === 'caution').length;
  const dangerousBlockedLinksCount = history.filter((h) => h.status === 'dangerous').length;
  const dangerousDownloadsCount = downloads.filter((d) => d.status === 'dangerous').length;
  const activeShieldCount = [
    settings.linkProtection,
    settings.downloadMonitoring,
    settings.fakeJobWarnings,
    settings.developerProtection,
    settings.strictMode
  ].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Download warning details */}
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
                  Blocked before it could open
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
                    This looks like a job-related file or link. Attackers often use fake job offers to trick people into running malware.
                  </p>
                )}
                {activeWarningItem.type === 'developer' && (
                  <p className="text-[11px] text-rose-750 font-serif leading-snug pt-1.5 border-t border-rose-200/50">
                    Warn: Developer credentials threat detected. File attempts to index .env keys, github credentials, or security configurations.
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-mono text-neutral-400">Why ClickSafe flagged it:</span>
                <div className="space-y-1">
                  {activeWarningItem.flaggedReasons.map((reason, idx) => (
                    <div key={idx} className="text-[11px] font-sans flex items-start gap-1 p-2 bg-neutral-50 border border-neutral-150 rounded">
                      <span className="text-rose-600 block leading-none">-</span>
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
                  // Remove the flagged file record from the local registry.
                  const filteredList = downloads.filter(d => d.id !== activeWarningItem.id);
                  setDownloads(filteredList);
                  saveDownloads(filteredList);
                  setActiveWarningItem(null);
                }}
                className="px-4 py-2 border border-neutral-200 bg-white hover:text-rose-700 hover:border-rose-300 rounded text-neutral-700 cursor-pointer"
              >
                Remove file record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW PANEL: OVERVIEW */}
      {currentTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          {/* Main banner block */}
          <div className="cs-glass-card relative overflow-hidden rounded-[28px] p-7">
            <div className="absolute right-[-80px] top-[-160px] h-72 w-72 rounded-full bg-[#ffd5e5]/70" />
            <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row">
            <div className="space-y-1 md:max-w-xl">
              <h2 className="text-3xl font-extrabold tracking-tight text-[#181936]">
                Security dashboard
              </h2>
              <p className="mt-3 text-base font-semibold leading-relaxed text-[#74758d]">
                ClickSafe checks links before you open them, watches suspicious downloads, and keeps risky pages away from your sensitive developer files.
              </p>
            </div>
            
            <div className="rounded-[22px] bg-[#4f4d69] p-5 text-white shadow-[0_18px_38px_rgba(79,77,105,0.22)] flex items-center gap-3 self-stretch md:self-auto min-w-[220px] shrink-0 justify-center">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 text-white">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <span className="block text-xs font-extrabold uppercase text-white/65">Status</span>
                <span className="mt-1 block text-base font-extrabold">Working in the background</span>
              </div>
            </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Processed URLs"
              value={totalScans}
              icon={Shield}
              description="Links checked by the extension"
              trend={{ value: 'Local', label: 'no server required', isPositive: true }}
            />
            <StatCard
              title="Risky Links"
              value={dangerousBlockedLinksCount + suspiciousLinksCount}
              icon={AlertTriangle}
              description="Links that needed a warning or block"
              trend={{ value: 'Handled', label: 'before navigation', isPositive: true }}
            />
            <StatCard
              title="Dangerous Downloads"
              value={dangerousDownloadsCount}
              icon={ShieldAlert}
              description="Downloads flagged by filename or source"
              trend={{ value: 'Blocked', label: 'when dangerous', isPositive: true }}
            />
            <StatCard
              title="Active Shields"
              value={activeShieldCount}
              icon={ClipboardList}
              description="Protection layers currently enabled"
              trend={{ value: `${settings.blockedDomains.length} blocked`, label: `${settings.allowedDomains.length} allowed`, isPositive: true }}
            />
          </div>

          {/* Activity Table */}
          <ActivityTable
            history={history}
            onRemoveItem={handleRemoveHistoryItem}
            onClearAll={handleClearHistory}
          />

          {/* Lower layout grid: current configuration summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-[24px] border border-[#dfe7f5] bg-white/90 p-5 shadow-[0_16px_36px_rgba(71,92,132,0.08)] md:col-span-2 space-y-4">
              <h3 className="border-b border-[#eef3fb] pb-3 text-lg font-extrabold text-[#181936]">
                Current Domain Rules
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-[18px] border border-[#dfe7f5] bg-[#f4f8ff] p-4">
                  <h4 className="text-sm font-extrabold leading-tight text-[#181936]">
                    Allowed Domains
                  </h4>
                  {settings.allowedDomains.length === 0 ? (
                    <p className="mt-1.5 text-sm font-semibold leading-relaxed text-[#74758d]">
                      No allowed domains have been added.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {settings.allowedDomains.slice(0, 8).map((domain) => (
                        <span key={domain} className="rounded-full border border-[#dfe7f5] bg-white px-2 py-1 text-xs font-extrabold text-[#4f4d69]">
                          {domain}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-[18px] border border-[#dfe7f5] bg-[#f4f8ff] p-4">
                  <h4 className="text-sm font-extrabold leading-tight text-[#181936]">
                    Blocked Domains
                  </h4>
                  {settings.blockedDomains.length === 0 ? (
                    <p className="mt-1.5 text-sm font-semibold leading-relaxed text-[#74758d]">
                      No blocked domains have been added.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {settings.blockedDomains.slice(0, 8).map((domain) => (
                        <span key={domain} className="rounded-full border border-[#f5bad4] bg-white px-2 py-1 text-xs font-extrabold text-[#d41470]">
                          {domain}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-[#dfe7f5] bg-white/90 p-5 shadow-[0_16px_36px_rgba(71,92,132,0.08)] space-y-3 flex flex-col justify-between">
              <div>
                <h3 className="mb-3 text-sm font-extrabold uppercase text-[#74758d]">
                  Protection Metrics Check
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-[#eef3fb] pb-2">
                    <span className="font-semibold text-[#74758d]">Active Link Protection</span>
                    <span className={`font-extrabold ${settings.linkProtection ? 'text-[#1f5dcc]' : 'text-[#b9bbc8]'}`}>
                      {settings.linkProtection ? '[ONLINE]' : '[OFFLINE]'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-[#eef3fb] pb-2">
                    <span className="font-semibold text-[#74758d]">Developer secret key watch</span>
                    <span className={`font-extrabold ${settings.developerProtection ? 'text-[#1f5dcc]' : 'text-[#b9bbc8]'}`}>
                      {settings.developerProtection ? '[ON]' : '[OFF]'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-[#eef3fb] pb-2">
                    <span className="font-semibold text-[#74758d]">Recruit phishing scanner</span>
                    <span className={`font-extrabold ${settings.fakeJobWarnings ? 'text-[#1f5dcc]' : 'text-[#b9bbc8]'}`}>
                      {settings.fakeJobWarnings ? '[ON]' : '[OFF]'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-2xl border border-[#dfe7f5] bg-[#f4f8ff] p-4 text-[#4f4d69]">
                <Info className="h-4 w-4 shrink-0 text-[#4d7ed8]" />
                <p className="text-xs font-bold leading-tight">
                  Your settings and scan history stay in this browser.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW PANEL: MANUAL LINK SCANNER */}
      {currentTab === 'scanner' && (
        <div className="space-y-6 animate-fade-in">
          <div className="rounded-[24px] border border-[#dfe7f5] bg-white/90 p-5 shadow-[0_16px_36px_rgba(71,92,132,0.08)]">
            <h2 className="text-xl font-extrabold tracking-tight text-[#181936]">
              Check a link manually
            </h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-[#74758d]">
              Paste a link when you want a second look before opening it.
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
          <div className="rounded-[24px] border border-[#dfe7f5] bg-white/90 p-5 shadow-[0_16px_36px_rgba(71,92,132,0.08)] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-xl font-extrabold tracking-tight text-[#181936]">
                Download protection
              </h2>
              <p className="text-sm font-semibold text-[#74758d]">
                Suspicious downloads appear here when the background scanner catches them.
              </p>
            </div>
          </div>

          <div className="rounded-[24px] border border-[#dfe7f5] bg-white/90 p-5 shadow-[0_16px_36px_rgba(71,92,132,0.08)]">
            <div className="flex items-center gap-2.5 pb-3 border-b border-neutral-100 mb-4">
              <div className="rounded-2xl border border-[#dfe7f5] bg-[#f4f8ff] p-2">
                <FolderOpen className="h-4 w-4 text-[#4d7ed8]" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#181936]">
                  Checked downloads
                </h3>
                <p className="text-sm font-semibold text-[#74758d]">
                  Files that matched risky filename or source patterns.
                </p>
              </div>
            </div>

            {downloads.length === 0 ? (
              <EmptyState
                icon={FolderOpen}
                title="No file downloads scanned yet"
                description="Downloaded files that match risk indicators will appear here."
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
                        <span>-</span>
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
          <div className="rounded-[24px] border border-[#dfe7f5] bg-white/90 p-5 shadow-[0_16px_36px_rgba(71,92,132,0.08)]">
            <h2 className="text-xl font-extrabold tracking-tight text-[#181936]">
              Personal safety checklist
            </h2>
            <p className="mt-2 text-sm font-semibold text-[#74758d]">
              Keep your own reminders for the habits you care about.
            </p>
          </div>

          <div className="rounded-[24px] border border-[#dfe7f5] bg-white/90 p-5 shadow-[0_16px_36px_rgba(71,92,132,0.08)]">
            <div className="grid grid-cols-1 md:grid-cols-[160px_1fr_1fr_auto] gap-2 pb-5 border-b border-neutral-150 mb-5">
              <select
                value={newChecklistCategory}
                onChange={(e) => setNewChecklistCategory(e.target.value as ChecklistItem['category'])}
                className="px-3 py-2 text-xs font-mono rounded border border-neutral-200 bg-neutral-50/25 focus:outline-hidden focus:border-neutral-900"
              >
                <option value="links">Links</option>
                <option value="jobs">Jobs</option>
                <option value="downloads">Downloads</option>
                <option value="dev">Developer</option>
              </select>
              <input
                type="text"
                value={newChecklistTitle}
                onChange={(e) => setNewChecklistTitle(e.target.value)}
                placeholder="Checklist item"
                className="px-3 py-2 text-xs font-mono rounded border border-neutral-200 bg-neutral-50/25 focus:outline-hidden focus:border-neutral-900"
              />
              <input
                type="text"
                value={newChecklistDescription}
                onChange={(e) => setNewChecklistDescription(e.target.value)}
                placeholder="Why this matters"
                className="px-3 py-2 text-xs font-mono rounded border border-neutral-200 bg-neutral-50/25 focus:outline-hidden focus:border-neutral-900"
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddChecklistItem(); }}
              />
              <button
                onClick={handleAddChecklistItem}
                className="px-3 py-2 text-xs font-mono bg-neutral-900 text-white rounded cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            </div>

            {/* Checklist Category Nav */}
            <div className="flex flex-wrap gap-1.5 pb-4 border-b border-neutral-150 mb-5">
              {(['all', 'links', 'jobs', 'downloads', 'dev'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveChecklistFilter(filter)}
                  className={`px-3 py-1 text-xs font-mono capitalize rounded-md cursor-pointer transition-colors ${
                    activeChecklistFilter === filter
                      ? 'bg-[#4f4d69] text-white font-extrabold'
                      : 'bg-[#f4f8ff] text-[#74758d] hover:bg-white'
                  }`}
                >
                  {filter === 'all' ? 'All categories' : filter === 'dev' ? 'Developer' : filter}
                </button>
              ))}
            </div>

            {/* Core list grid of habits */}
            <div className="space-y-4">
              {checklist.filter((item) => activeChecklistFilter === 'all' || item.category === activeChecklistFilter).length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  title="No checklist items"
                  description="Add your own protection habits above and track them here."
                />
              ) : (
                checklist
                  .filter((item) => activeChecklistFilter === 'all' || item.category === activeChecklistFilter)
                  .map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleToggleChecklist(item.id)}
                    className={`p-4 border rounded-lg transition-all cursor-pointer flex items-start gap-4 ${
                      item.checked
                        ? 'bg-[#eefbf1] border-[#bdecc8] text-[#181936]'
                        : 'bg-white border-[#dfe7f5] hover:border-[#aac5ed] text-[#181936]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={item.checked}
                      readOnly
                      className="h-4 w-4 rounded border-neutral-300 text-neutral-900 bg-neutral-50/20"
                    />
                    
                    <div className="min-w-0 flex-1">
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
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        handleRemoveChecklistItem(item.id);
                      }}
                      className="p-1 hover:text-rose-600 cursor-pointer shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW PANEL: SHIELD SETTINGS */}
      {currentTab === 'settings' && (
        <div className="space-y-6 animate-fade-in">
          <div className="rounded-[24px] border border-[#dfe7f5] bg-white/90 p-5 shadow-[0_16px_36px_rgba(71,92,132,0.08)]">
            <h2 className="text-xl font-extrabold tracking-tight text-[#181936]">
              Protection settings
            </h2>
            <p className="mt-2 text-sm font-semibold text-[#74758d]">
              Choose what ClickSafe should watch for while you browse.
            </p>
          </div>

          <div className="rounded-[24px] border border-[#dfe7f5] bg-white/90 p-5 shadow-[0_16px_36px_rgba(71,92,132,0.08)]">
            <h3 className="border-b border-[#eef3fb] pb-3 text-lg font-extrabold text-[#181936]">
              Active Security Shields
            </h3>

            <div className="divide-y divide-neutral-100">
              <ToggleRow
                title="Scan links before opening"
                description="Checks clicked links for disguised files, redirects, fake brands, punycode, and suspicious hosts."
                checked={settings.linkProtection}
                onChange={() => handleToggleSetting('linkProtection')}
              />
              <ToggleRow
                title="Watch downloads"
                description="Flags files with risky names, extensions, or sources before they become easy to miss."
                checked={settings.downloadMonitoring}
                onChange={() => handleToggleSetting('downloadMonitoring')}
              />
              <ToggleRow
                title="Job scam warnings"
                description="Looks for recruiter-task patterns that try to push you into running a file or script."
                checked={settings.fakeJobWarnings}
                onChange={() => handleToggleSetting('fakeJobWarnings')}
              />
              <ToggleRow
                title="Developer secret watch"
                description="Warns on links and files that mention .env files, tokens, SSH keys, wallets, or credentials."
                checked={settings.developerProtection}
                onChange={() => handleToggleSetting('developerProtection')}
              />
              <ToggleRow
                title="Strict mode"
                description="Treats unknown domains with extra caution unless you add them to your allowed list."
                checked={settings.strictMode}
                onChange={() => handleToggleSetting('strictMode')}
              />
            </div>
          </div>

          {/* Whitelisting & Blocklists */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-[24px] border border-[#dfe7f5] bg-white/90 p-5 shadow-[0_16px_36px_rgba(71,92,132,0.08)]">
              <h3 className="mb-3 text-sm font-extrabold uppercase text-[#74758d]">
                Allowed Domain Registry
              </h3>
              
              <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <input
                  type="text"
                  value={newAllowedDomain}
                  onChange={(e) => setNewAllowedDomain(e.target.value)}
                  placeholder="domain to allow"
                  className="flex-1 px-3 py-1.5 text-xs font-mono rounded border border-neutral-200 focus:outline-hidden focus:border-neutral-900 bg-neutral-50/25 w-full"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddAllowedDomain(); }}
                />
                <button
                  onClick={handleAddAllowedDomain}
                  className="w-full shrink-0 cursor-pointer rounded-xl bg-[#4f4d69] px-4 py-2 text-center text-sm font-extrabold text-white sm:w-auto"
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

            <div className="rounded-[24px] border border-[#dfe7f5] bg-white/90 p-5 shadow-[0_16px_36px_rgba(71,92,132,0.08)]">
              <h3 className="mb-3 text-sm font-extrabold uppercase text-[#74758d]">
                Restricted Domain Blocklist
              </h3>
              
              <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <input
                  type="text"
                  value={newBlockedDomain}
                  onChange={(e) => setNewBlockedDomain(e.target.value)}
                  placeholder="domain to block"
                  className="flex-1 px-3 py-1.5 text-xs font-mono rounded border border-neutral-200 focus:outline-hidden focus:border-neutral-900 bg-neutral-50/25 w-full"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddBlockedDomain(); }}
                />
                <button
                  onClick={handleAddBlockedDomain}
                  className="w-full shrink-0 cursor-pointer rounded-xl bg-[#4f4d69] px-4 py-2 text-center text-sm font-extrabold text-white sm:w-auto"
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
              These commands immediately modify local extension storage. Be certain when erasing alert history files.
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
