import React, { useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeft, ExternalLink, Play, Settings, Shield } from 'lucide-react';
import { getStorageData, saveSettings, addHistoryItem } from '../lib/storage';
import { scanUrl } from '../lib/scanner';
import { ProtectionSettings, ScanHistoryItem } from '../types';
import { RiskBadge } from '../components/RiskBadge';
import { getChromeApi, isRealExtension } from '../lib/chrome';

interface PopupProps {
  onOpenDashboard?: (tabId?: string) => void;
  standalone?: boolean;
}

const MiniToggle = ({
  checked,
  onClick,
}: {
  checked: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={onClick}
    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full p-1 transition-colors ${
      checked ? 'bg-[#4d7ed8]' : 'bg-[#d9dce5]'
    }`}
  >
    <span
      className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
        checked ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </button>
);

export const Popup: React.FC<PopupProps> = ({ onOpenDashboard, standalone = false }) => {
  const chromeApi = getChromeApi();
  const runningInChrome = isRealExtension();
  const [settings, setSettings] = useState<ProtectionSettings | null>(null);
  const [currentUrl, setCurrentUrl] = useState('');
  const [currentTitle, setCurrentTitle] = useState('Active tab');
  const [siteScanResult, setSiteScanResult] = useState<ReturnType<typeof scanUrl> | null>(null);
  const [scanning, setScanning] = useState(false);
  const [recentBlocked, setRecentBlocked] = useState<ScanHistoryItem[]>([]);
  const [view, setView] = useState<'home' | 'settings'>('home');
  const [newAllowedDomain, setNewAllowedDomain] = useState('');
  const [newBlockedDomain, setNewBlockedDomain] = useState('');

  const loadData = async () => {
    if (runningInChrome) {
      const tabs = await chromeApi.tabs.query({ active: true, currentWindow: true });
      const activeTab = tabs?.[0];
      if (activeTab?.url) setCurrentUrl(activeTab.url);
      if (activeTab?.title) setCurrentTitle(activeTab.title);
    }

    const data = await getStorageData();
    setSettings(data.settings);
    setRecentBlocked(data.history.filter((h) => h.status !== 'safe').slice(0, 3));
  };

  useEffect(() => {
    loadData();
    const handleStorageChange = () => loadData();
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleToggle = async (key: keyof ProtectionSettings) => {
    if (!settings) return;
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    await saveSettings(updated);
    window.dispatchEvent(new Event('storage'));
  };

  const handleScanPage = () => {
    if (!settings || !currentUrl) return;
    setScanning(true);
    setTimeout(() => {
      const res = scanUrl(currentUrl, settings);
      setSiteScanResult(res);
      setScanning(false);

      let type: ScanHistoryItem['type'] = 'link';
      if (res.reasons.some((r) => r.includes('Job Scam'))) type = 'job';
      else if (res.reasons.some((r) => r.includes('Developer secret'))) type = 'developer';

      addHistoryItem({
        url: currentUrl,
        riskScore: res.score,
        status: res.status,
        reasons: res.reasons,
        type,
        actionTaken: res.status === 'dangerous' ? 'blocked' : res.status === 'caution' ? 'warned' : 'allowed'
      }).then(() => window.dispatchEvent(new Event('storage')));
    }, 450);
  };

  const handleOpenDashboard = () => {
    if (onOpenDashboard) {
      onOpenDashboard('overview');
      return;
    }

    if (runningInChrome) chromeApi.runtime.openOptionsPage?.();
  };

  const handleAddAllowedDomain = async () => {
    if (!settings || !newAllowedDomain.trim()) return;
    const domain = newAllowedDomain.trim().toLowerCase();
    if (settings.allowedDomains.includes(domain)) return;

    const updated = {
      ...settings,
      allowedDomains: [...settings.allowedDomains, domain]
    };
    setSettings(updated);
    await saveSettings(updated);
    setNewAllowedDomain('');
    window.dispatchEvent(new Event('storage'));
  };

  const handleAddBlockedDomain = async () => {
    if (!settings || !newBlockedDomain.trim()) return;
    const domain = newBlockedDomain.trim().toLowerCase();
    if (settings.blockedDomains.includes(domain)) return;

    const updated = {
      ...settings,
      blockedDomains: [...settings.blockedDomains, domain]
    };
    setSettings(updated);
    await saveSettings(updated);
    setNewBlockedDomain('');
    window.dispatchEvent(new Event('storage'));
  };

  const handleRemoveAllowedDomain = async (domain: string) => {
    if (!settings) return;
    const updated = {
      ...settings,
      allowedDomains: settings.allowedDomains.filter((item) => item !== domain)
    };
    setSettings(updated);
    await saveSettings(updated);
    window.dispatchEvent(new Event('storage'));
  };

  const handleRemoveBlockedDomain = async (domain: string) => {
    if (!settings) return;
    const updated = {
      ...settings,
      blockedDomains: settings.blockedDomains.filter((item) => item !== domain)
    };
    setSettings(updated);
    await saveSettings(updated);
    window.dispatchEvent(new Event('storage'));
  };

  if (!settings) {
    return (
      <div className="grid h-[550px] w-[375px] place-items-center bg-[#f6f8fc] font-sans text-[#181936]">
        <div className="text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#4f4d69] text-white shadow-lg">
            <Shield className="h-7 w-7" />
          </div>
          <p className="mt-4 text-sm font-extrabold text-[#74758d]">Starting ClickSafe...</p>
        </div>
      </div>
    );
  }

  const activeShieldCount = [
    settings.linkProtection,
    settings.downloadMonitoring,
    settings.fakeJobWarnings,
    settings.developerProtection,
  ].filter(Boolean).length;

  const currentStatus = siteScanResult?.status || 'safe';
  const statusLabel = siteScanResult
    ? siteScanResult.status === 'dangerous'
      ? 'Blocked before opening'
      : siteScanResult.status === 'caution'
        ? 'Needs a closer look'
        : 'Looks okay'
    : 'Monitoring this page';

  return (
    <div className={`w-full bg-[#f6f8fc] font-sans text-[#181936] ${standalone ? 'rounded-2xl border border-[#dfe7f5] shadow-xl' : 'h-full min-h-[550px] flex flex-col'}`}>
      <header className="flex items-center justify-between border-b border-[#e6edf8] bg-white px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#181936] text-white">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <p className="text-lg font-extrabold leading-none">ClickSafe</p>
            <p className="mt-1 text-[11px] font-bold text-[#74758d]">Link and download guard</p>
          </div>
        </div>

        {view === 'settings' ? (
          <button
            onClick={() => setView('home')}
            className="cursor-pointer rounded-xl p-2 text-[#74758d] transition hover:bg-[#f1f4fa] hover:text-[#181936]"
            title="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        ) : (
          <button
            onClick={() => setView('settings')}
            className="cursor-pointer rounded-xl p-2 text-[#74758d] transition hover:bg-[#f1f4fa] hover:text-[#181936]"
            title="Settings"
          >
            <Settings className="h-5 w-5" />
          </button>
        )}
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        {view === 'settings' ? (
          <div className="space-y-4">
            <section className="rounded-2xl border border-[#dfe7f5] bg-white p-4 shadow-[0_16px_34px_rgba(71,92,132,0.08)]">
              <h2 className="text-base font-extrabold">Quick settings</h2>
              <p className="mt-1 text-sm font-semibold text-[#74758d]">
                Change the main protections without opening the dashboard.
              </p>

              <div className="mt-4 space-y-3">
                {[
                  { key: 'linkProtection' as const, label: 'Block dangerous links', desc: 'Checks clicked links before they open.' },
                  { key: 'downloadMonitoring' as const, label: 'Watch downloads', desc: 'Flags risky files and filenames.' },
                  { key: 'fakeJobWarnings' as const, label: 'Job scam warnings', desc: 'Looks for fake recruiter task patterns.' },
                  { key: 'developerProtection' as const, label: 'Developer secret watch', desc: 'Warns on .env, token, and SSH-key traps.' },
                  { key: 'strictMode' as const, label: 'Strict mode', desc: 'Treats unknown domains more carefully.' },
                ].map((toggle) => (
                  <div key={toggle.key} className="flex items-center justify-between gap-3 rounded-xl bg-[#f6f8fc] p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold text-[#181936]">{toggle.label}</p>
                      <p className="mt-0.5 text-xs font-semibold text-[#74758d]">{toggle.desc}</p>
                    </div>
                    <MiniToggle checked={Boolean(settings[toggle.key])} onClick={() => handleToggle(toggle.key)} />
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-[#dfe7f5] bg-white p-4">
              <h2 className="text-sm font-extrabold">Allowed domains</h2>
              <div className="mt-3 flex gap-2">
                <input
                  value={newAllowedDomain}
                  onChange={(event) => setNewAllowedDomain(event.target.value)}
                  onKeyDown={(event) => { if (event.key === 'Enter') handleAddAllowedDomain(); }}
                  placeholder="domain to allow"
                  className="min-w-0 flex-1 rounded-xl border border-[#dfe7f5] bg-[#f6f8fc] px-3 py-2 text-sm font-semibold focus:border-[#4f4d69] focus:outline-hidden"
                />
                <button
                  onClick={handleAddAllowedDomain}
                  className="cursor-pointer rounded-xl bg-[#181936] px-3 py-2 text-sm font-extrabold text-white"
                >
                  Add
                </button>
              </div>
              <div className="mt-3 flex max-h-24 flex-wrap gap-2 overflow-y-auto">
                {settings.allowedDomains.length === 0 ? (
                  <p className="text-xs font-semibold text-[#74758d]">No allowed domains yet.</p>
                ) : settings.allowedDomains.map((domain) => (
                  <button
                    key={domain}
                    onClick={() => handleRemoveAllowedDomain(domain)}
                    className="cursor-pointer rounded-full border border-[#dfe7f5] bg-[#f6f8fc] px-2 py-1 text-xs font-bold text-[#4f4d69]"
                    title="Remove domain"
                  >
                    {domain} x
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-[#dfe7f5] bg-white p-4">
              <h2 className="text-sm font-extrabold">Blocked domains</h2>
              <div className="mt-3 flex gap-2">
                <input
                  value={newBlockedDomain}
                  onChange={(event) => setNewBlockedDomain(event.target.value)}
                  onKeyDown={(event) => { if (event.key === 'Enter') handleAddBlockedDomain(); }}
                  placeholder="domain to block"
                  className="min-w-0 flex-1 rounded-xl border border-[#dfe7f5] bg-[#f6f8fc] px-3 py-2 text-sm font-semibold focus:border-[#4f4d69] focus:outline-hidden"
                />
                <button
                  onClick={handleAddBlockedDomain}
                  className="cursor-pointer rounded-xl bg-[#181936] px-3 py-2 text-sm font-extrabold text-white"
                >
                  Add
                </button>
              </div>
              <div className="mt-3 flex max-h-24 flex-wrap gap-2 overflow-y-auto">
                {settings.blockedDomains.length === 0 ? (
                  <p className="text-xs font-semibold text-[#74758d]">No blocked domains yet.</p>
                ) : settings.blockedDomains.map((domain) => (
                  <button
                    key={domain}
                    onClick={() => handleRemoveBlockedDomain(domain)}
                    className="cursor-pointer rounded-full border border-[#f5bad4] bg-[#fff0f6] px-2 py-1 text-xs font-bold text-[#d41470]"
                    title="Remove domain"
                  >
                    {domain} x
                  </button>
                ))}
              </div>
            </section>
          </div>
        ) : (
        <>
        <section className="rounded-2xl border border-[#dfe7f5] bg-white p-4 shadow-[0_16px_34px_rgba(71,92,132,0.08)]">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-extrabold uppercase text-[#74758d]">Current page</p>
              <p className="mt-1 truncate text-base font-extrabold" title={currentTitle}>{currentTitle || 'Active tab'}</p>
              <p className="mt-1 truncate text-[11px] font-semibold text-[#74758d]" title={currentUrl}>{currentUrl || 'No URL found'}</p>
            </div>
            <RiskBadge status={currentStatus} score={siteScanResult?.score} size="sm" showIcon />
          </div>

          <button
            onClick={handleScanPage}
            disabled={scanning || !currentUrl}
            className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#4f4d69] px-4 py-3 text-sm font-extrabold text-white shadow-[0_12px_24px_rgba(79,77,105,0.18)] transition hover:bg-[#3f3d58] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {scanning ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              <Play className="h-4 w-4 fill-white" />
            )}
            {scanning ? 'Checking this page...' : 'Scan this page'}
          </button>
        </section>

        <section className="mt-4 rounded-2xl border border-[#dfe7f5] bg-white p-4">
          <div className="flex items-center gap-3">
            <span className={`h-3 w-3 rounded-full ${currentStatus === 'dangerous' ? 'bg-[#e33a5f]' : currentStatus === 'caution' ? 'bg-[#f2a72b]' : 'bg-[#21b321]'}`} />
            <div>
              <p className="text-lg font-extrabold">{statusLabel}</p>
              <p className="text-xs font-semibold text-[#74758d]">
                {activeShieldCount} protection layers are on
              </p>
            </div>
          </div>

          {siteScanResult?.reasons.length ? (
            <div className="mt-3 max-h-24 overflow-y-auto rounded-xl bg-[#fff4f8] p-3 text-xs font-semibold text-[#7a314f]">
              {siteScanResult.reasons.slice(0, 3).map((reason) => (
                <p key={reason} className="truncate">- {reason}</p>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm font-semibold leading-relaxed text-[#74758d]">
              ClickSafe is checking links in the background. You only need to step in when something looks risky.
            </p>
          )}
        </section>

        <section className="mt-4 rounded-2xl border border-[#dfe7f5] bg-white p-4">
          <h2 className="text-sm font-extrabold">Protection</h2>
          <div className="mt-3 space-y-3">
            {[
              { key: 'linkProtection' as const, label: 'Block risky links' },
              { key: 'downloadMonitoring' as const, label: 'Watch downloads' },
              { key: 'fakeJobWarnings' as const, label: 'Flag job scams' },
              { key: 'developerProtection' as const, label: 'Protect dev secrets' },
            ].map((toggle) => (
              <div key={toggle.key} className="flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-[#181936]">{toggle.label}</span>
                <MiniToggle checked={Boolean(settings[toggle.key])} onClick={() => handleToggle(toggle.key)} />
              </div>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-[#dfe7f5] bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold">Recent alerts</h2>
            <span className="text-xs font-extrabold text-[#4d7ed8]">{recentBlocked.length}</span>
          </div>
          {recentBlocked.length === 0 ? (
            <p className="mt-3 text-sm font-semibold text-[#74758d]">Nothing suspicious in the latest checks.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {recentBlocked.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-xl bg-[#f6f8fc] p-3">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-[#d41470]" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-extrabold">{item.url}</p>
                    <p className="text-[11px] font-semibold text-[#74758d]">{item.type} - {item.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        </>
        )}
      </main>

      {(onOpenDashboard || runningInChrome) && (
        <footer className="border-t border-[#e6edf8] bg-white px-4 py-3">
          <button
            onClick={handleOpenDashboard}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#dfe7f5] bg-white px-4 py-2.5 text-sm font-extrabold text-[#181936] transition hover:bg-[#f6f8fc]"
          >
            Open full dashboard
            <ExternalLink className="h-4 w-4" />
          </button>
        </footer>
      )}
    </div>
  );
};
