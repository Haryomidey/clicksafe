import React, { useEffect, useState } from 'react';
import { Shield, ShieldCheck, ShieldAlert, AlertTriangle, ExternalLink, Settings, Play, CheckCircle } from 'lucide-react';
import { getStorageData, saveSettings, addHistoryItem } from '../lib/storage';
import { scanUrl } from '../lib/scanner';
import { ProtectionSettings, ScanHistoryItem } from '../types';
import { RiskBadge } from '../components/RiskBadge';
import { getChromeApi, isRealExtension } from '../lib/chrome';

interface PopupProps {
  onOpenDashboard?: (tabId?: string) => void;
  standalone?: boolean;
}

export const Popup: React.FC<PopupProps> = ({ onOpenDashboard, standalone = false }) => {
  const chromeApi = getChromeApi();
  const runningInChrome = isRealExtension();
  const [settings, setSettings] = useState<ProtectionSettings | null>(null);
  const [currentUrl, setCurrentUrl] = useState('');
  const [currentTitle, setCurrentTitle] = useState('Active tab');
  const [siteScanResult, setSiteScanResult] = useState<ReturnType<typeof scanUrl> | null>(null);
  const [scanning, setScanning] = useState(false);
  const [recentBlocked, setRecentBlocked] = useState<ScanHistoryItem[]>([]);

  // Load storage details on load
  const loadData = async () => {
    if (runningInChrome) {
      const tabs = await chromeApi.tabs.query({ active: true, currentWindow: true });
      const activeTab = tabs?.[0];
      if (activeTab?.url) {
        setCurrentUrl(activeTab.url);
      }
      if (activeTab?.title) {
        setCurrentTitle(activeTab.title);
      }
    } else {
      localStorage.setItem('sim_current_url', currentUrl);
      localStorage.setItem('sim_current_title', currentTitle);
    }
    const data = await getStorageData();
    setSettings(data.settings);
    // Find recent threats
    const threats = data.history.filter(h => h.status !== 'safe').slice(0, 3);
    setRecentBlocked(threats);
  };

  useEffect(() => {
    loadData();
    
    // Listen for storage changes in-app
    const handleStorageChange = () => {
      loadData();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    loadData();
  }, [currentUrl]);

  const handleToggle = async (key: keyof ProtectionSettings) => {
    if (!settings) return;
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    await saveSettings(updated);
    // Dispatch standard storage event to update other parts of screen
    window.dispatchEvent(new Event('storage'));
  };

  const handleScanPage = () => {
    setScanning(true);
    setTimeout(() => {
      const res = scanUrl(currentUrl, settings || undefined);
      setSiteScanResult(res);
      setScanning(false);

      // Log the scan result into history
      let type: 'link' | 'download' | 'job' | 'developer' = 'link';
      if (res.reasons.some(r => r.includes('Job Scam'))) type = 'job';
      else if (res.reasons.some(r => r.includes('Developer secret'))) type = 'developer';

      addHistoryItem({
        url: currentUrl,
        riskScore: res.score,
        status: res.status,
        reasons: res.reasons,
        type,
        actionTaken: res.status === 'dangerous' ? 'blocked' : res.status === 'caution' ? 'warned' : 'allowed'
      }).then(() => {
        window.dispatchEvent(new Event('storage'));
      });
    }, 750);
  };

  const handleOpenDashboard = () => {
    if (onOpenDashboard) {
      onOpenDashboard('overview');
      return;
    }

    if (runningInChrome) {
      chromeApi.runtime.openOptionsPage?.();
    }
  };

  if (!settings) {
    return (
      <div className="w-full bg-neutral-900 text-white p-6 font-mono text-center flex flex-col items-center justify-center">
        <Shield className="h-8 w-8 text-neutral-400 animate-spin mb-2" />
        <span className="text-xs">Initializing ClickSafe Core...</span>
      </div>
    );
  }

  return (
    <div className={`w-full select-none text-neutral-950 bg-white font-sans ${standalone ? 'border border-neutral-200 shadow-xl rounded-xl' : 'h-full flex flex-col'}`}>
      {/* Mini header */}
      <div className="bg-neutral-900 text-white p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-white text-neutral-900 flex items-center justify-center font-bold">
            <Shield className="h-3.5 w-3.5 fill-neutral-900" />
          </div>
          <div>
            <span className="font-extrabold text-sm tracking-tight block">ClickSafe</span>
            <span className="text-[8px] font-mono text-neutral-400 block tracking-wider uppercase leading-none">Protection Module</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {(onOpenDashboard || runningInChrome) && (
            <button
              onClick={handleOpenDashboard}
              className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title="Open full options"
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="overflow-y-auto flex-1 max-h-[440px] p-4 space-y-4">
        {/* URL site status bar */}
        <div className="p-3.5 rounded-lg border border-neutral-200/80 bg-neutral-50 flex items-center gap-3 relative overflow-hidden">
          <div className="min-w-0 flex-1">
            <span className="text-[9px] font-mono tracking-wider text-neutral-400 block uppercase">
              Current Active Tab
            </span>
            <p className="text-xs font-semibold text-neutral-900 truncate mt-0.5" title={currentTitle}>
              {currentTitle}
            </p>
            <p className="text-[10px] text-neutral-500 font-mono truncate mt-0.5 select-all" title={currentUrl}>
              {currentUrl}
            </p>
          </div>

          <div className="shrink-0">
            {siteScanResult ? (
              <RiskBadge status={siteScanResult.status} size="sm" showIcon />
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-neutral-200 bg-white text-[10px] font-mono text-neutral-500">
                <span className="h-1.5 w-1.5 rounded-full bg-neutral-400"></span>
                <span>Unscanned</span>
              </span>
            )}
          </div>
        </div>

        {/* Scan Button section */}
        <div className="flex flex-col gap-2">
          {!siteScanResult ? (
            <button
              onClick={handleScanPage}
              disabled={scanning || !currentUrl}
              className="w-full py-2 px-3 border border-neutral-900 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-400 disabled:border-neutral-400 transition-colors rounded-md text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Play className={`h-3 w-3 ${scanning ? 'animate-pulse' : ''}`} />
              <span>{scanning ? 'Computing Heuristics...' : 'Scan Active Page'}</span>
            </button>
          ) : (
            <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-150 relative animate-fade-in">
              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block mb-1">
                Scan Diagnostic
              </span>
              <p className="text-xs text-neutral-800 font-sans font-semibold mb-2">
                {siteScanResult.status === 'dangerous' 
                  ? 'Warning: Suspicious anomalies detected.' 
                  : siteScanResult.status === 'caution'
                  ? 'Caution: Potential privacy risk found.'
                  : 'Safe: No threat triggers found.'}
              </p>
              
              {siteScanResult.reasons.length > 0 ? (
                <ul className="space-y-1 mb-2">
                  {siteScanResult.reasons.slice(0, 2).map((r, i) => (
                    <li key={i} className="text-[10px] text-neutral-600 font-sans bg-white border border-neutral-150 p-1.5 rounded flex items-start gap-1">
                      <span className="text-rose-600 block leading-none">-</span>
                      <span>{r}</span>
                    </li>
                  ))}
                  {siteScanResult.reasons.length > 2 && (
                    <li className="text-[9px] text-neutral-400 font-mono italic pl-2">
                      + {siteScanResult.reasons.length - 2} more risk factors.
                    </li>
                  )}
                </ul>
              ) : (
                <p className="text-[10px] text-neutral-500 font-sans mb-2 leading-relaxed">
                  Verified using ClickSafe domain databases, protocol tests, and length analytics. No triggers matched.
                </p>
              )}

              <button
                onClick={() => setSiteScanResult(null)}
                className="w-full text-center text-[10px] font-mono text-neutral-500 hover:text-neutral-900 pt-1 block cursor-pointer"
              >
                Clear scan parameters
              </button>
            </div>
          )}
        </div>

        {/* Quick protection systems toggles */}
        <div className="border border-neutral-200/80 rounded-lg overflow-hidden bg-white">
          <div className="bg-neutral-50 border-b border-neutral-200/80 p-2.5 px-3 flex justify-between items-center">
            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-semibold">
              Shield Protection Array
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>

          <div className="divide-y divide-neutral-100 px-3">
            {[
              { key: 'linkProtection' as const, label: 'Link Phish Shield', desc: 'Scan redirects & punycode' },
              { key: 'downloadMonitoring' as const, label: 'Download Scanner', desc: 'Detect executable extension risk' },
              { key: 'fakeJobWarnings' as const, label: 'Anti Job Scams', desc: 'Alert on fake coding assessments' },
              { key: 'developerProtection' as const, label: 'Dev Key Shield', desc: 'Detect .env & SSH key requests' },
            ].map((toggle) => (
              <div key={toggle.key} className="flex items-center justify-between py-2 text-xs">
                <div>
                  <p className="font-semibold text-neutral-800 text-[11px]">{toggle.label}</p>
                  <p className="text-[9px] text-neutral-400 font-mono leading-tight">{toggle.desc}</p>
                </div>
                
                <button
                  type="button"
                  onClick={() => handleToggle(toggle.key)}
                  className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out ${
                    settings[toggle.key] ? 'bg-neutral-900' : 'bg-neutral-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      settings[toggle.key] ? 'translate-x-3' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Recent block stats */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block pl-1">
            Recent Alert Triggers ({recentBlocked.length})
          </span>
          {recentBlocked.length === 0 ? (
            <div className="p-3 text-center border border-dashed border-neutral-200 rounded-lg text-[10px] text-neutral-400">
              No threats flagged in this log window.
            </div>
          ) : (
            <div className="space-y-1">
              {recentBlocked.map((item) => (
                <div
                  key={item.id}
                  className="p-2 border border-neutral-200/80 rounded bg-white font-sans flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-mono text-neutral-800 truncate select-all">
                      {item.url}
                    </p>
                    <p className="text-[8px] font-mono text-neutral-400 uppercase tracking-wide mt-0.5">
                      {item.type} protection module
                    </p>
                  </div>
                  
                  <span className="px-1.5 py-0.5 font-mono text-[8px] font-bold rounded bg-rose-50 border border-rose-100 text-rose-700 uppercase tracking-widest shrink-0">
                    Flagged
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Popup Footer */}
      {(onOpenDashboard || runningInChrome) && (
        <div className="border-t border-neutral-150 p-2.5 bg-neutral-50 px-4 flex justify-between items-center text-[10px] font-mono shrink-0">
          <span className="text-neutral-400">Status: {runningInChrome ? 'Chrome Extension' : 'Browser Fallback'}</span>
          <button
            onClick={handleOpenDashboard}
            className="text-neutral-900 hover:text-neutral-700 underline flex items-center gap-1 cursor-pointer font-semibold"
          >
            <span>Console Board</span>
            <ExternalLink className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
};
