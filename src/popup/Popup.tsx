import React, { useEffect, useState } from 'react';
import { AlertTriangle, ExternalLink, Play, Settings, Shield, ShieldCheck } from 'lucide-react';
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

        {(onOpenDashboard || runningInChrome) && (
          <button
            onClick={handleOpenDashboard}
            className="cursor-pointer rounded-xl p-2 text-[#74758d] transition hover:bg-[#f1f4fa] hover:text-[#181936]"
            title="Open dashboard"
          >
            <Settings className="h-5 w-5" />
          </button>
        )}
      </header>

      <main className="flex-1 overflow-y-auto p-4">
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
