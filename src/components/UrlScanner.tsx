import React, { useState } from 'react';
import { Shield, ShieldAlert, AlertTriangle, HelpCircle } from 'lucide-react';
import { scanUrl } from '../lib/scanner';
import { RiskBadge } from './RiskBadge';
import { ProtectionSettings, ScanHistoryItem } from '../types';

interface UrlScannerProps {
  onScanCompleted?: (item: Omit<ScanHistoryItem, 'id' | 'timestamp'>) => void;
  settings?: ProtectionSettings;
}

export const UrlScanner: React.FC<UrlScannerProps> = ({ onScanCompleted, settings }) => {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState<ReturnType<typeof scanUrl> | null>(null);

  const handleScan = (targetUrl: string) => {
    if (!targetUrl.trim()) return;
    const scanResult = scanUrl(targetUrl, settings);
    setResult(scanResult);

    if (onScanCompleted) {
      // Determine scanning context type
      let type: 'link' | 'download' | 'job' | 'developer' = 'link';
      if (scanResult.reasons.some((r) => r.includes('Job Scam'))) {
        type = 'job';
      } else if (scanResult.reasons.some((r) => r.includes('Developer secret'))) {
        type = 'developer';
      } else if (scanResult.reasons.some((r) => r.includes('Direct URL executable'))) {
        type = 'download';
      }

      onScanCompleted({
        url: targetUrl,
        riskScore: scanResult.score,
        status: scanResult.status,
        reasons: scanResult.reasons,
        type,
        actionTaken: scanResult.status === 'dangerous' ? 'blocked' : scanResult.status === 'caution' ? 'warned' : 'allowed',
      });
    }
  };

  const clearScanner = () => {
    setUrl('');
    setResult(null);
  };

  return (
    <div className="bg-white rounded-lg border border-neutral-200 shadow-xs p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-md bg-neutral-900 text-white">
          <Shield className="h-4 w-4 stroke-[2]" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">
            Heuristic URL Threat Scanner
          </h3>
          <p className="text-xs text-neutral-400 font-sans">
            Paste any link below to verify domain anomalies, subdomains, and scam keywords.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste URL to analyze"
          className="flex-1 px-3 py-2 text-xs font-mono rounded-md border border-neutral-200 focus:outline-hidden focus:border-neutral-900 bg-neutral-50/20 w-full"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleScan(url);
          }}
        />
        <button
          onClick={() => handleScan(url)}
          className="px-4 py-2 text-xs font-mono font-medium rounded-md bg-neutral-900 text-white hover:bg-neutral-800 transition-colors shrink-0 w-full sm:w-auto text-center cursor-pointer"
        >
          Check Link
        </button>
      </div>

      {/* Results details */}
      {result && (
        <div className="mt-5 border-t border-neutral-100 pt-5 animate-slide-up">
          <div className="flex items-start justify-between gap-4 flex-wrap pb-2 border-b border-neutral-100">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                Target URL
              </span>
              <p className="text-xs font-mono text-neutral-800 break-all select-all font-medium mt-0.5">
                {url}
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <RiskBadge status={result.status} score={result.score} size="md" />
              <button
                onClick={clearScanner}
                className="text-[10px] font-mono text-neutral-400 hover:text-neutral-900 underline ml-1 cursor-pointer"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="md:col-span-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block mb-2">
                Identified Security Indicators
              </span>
              {result.reasons.length === 0 ? (
                <div className="flex items-center gap-2 text-emerald-800 text-xs py-2 px-3 rounded bg-emerald-50 border border-emerald-100">
                  <Shield className="h-4 w-4 stroke-[2]" />
                  <span>Verified Clean: This site is clean. It displays secure HTTPS and standard domain structures.</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {result.reasons.map((r, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-2 text-xs p-2.5 rounded border ${
                        result.status === 'dangerous'
                          ? 'bg-rose-50/50 text-rose-900 border-rose-100'
                          : 'bg-amber-50/50 text-amber-900 border-amber-100'
                      }`}
                    >
                      {result.status === 'dangerous' ? (
                        <ShieldAlert className="h-4 w-4 stroke-[1.75] shrink-0 text-rose-700 mt-0.5" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 stroke-[1.75] shrink-0 text-amber-700 mt-0.5" />
                      )}
                      <span className="leading-tight font-sans">{r}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-neutral-50 rounded-md border border-neutral-150 p-4">
              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block mb-1">
                Security Mandate
              </span>
              <p className="text-xs text-neutral-800 font-semibold mb-3">
                {result.status === 'dangerous'
                  ? '⚠️ Pause before opening this.'
                  : result.status === 'caution'
                  ? '🔍 Examine before entering keys.'
                  : '✅ Action Recommended'}
              </p>
              <p className="text-xs text-neutral-600 leading-relaxed font-sans mb-3 font-medium">
                {result.recommendedAction}
              </p>
              
              {result.status !== 'safe' && (
                <div className="text-[10px] text-neutral-400 flex items-start gap-1 p-1 bg-white rounded border border-neutral-150">
                  <HelpCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>
                    Heuristic score was calculated dynamically local to your device. ClickSafe does not log URLs externally.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
