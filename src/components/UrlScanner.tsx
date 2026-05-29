import React, { useState } from 'react';
import { AlertTriangle, HelpCircle, Shield, ShieldAlert } from 'lucide-react';
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
      let type: ScanHistoryItem['type'] = 'link';
      if (scanResult.reasons.some((r) => r.includes('Job Scam'))) type = 'job';
      else if (scanResult.reasons.some((r) => r.includes('Developer secret'))) type = 'developer';
      else if (scanResult.reasons.some((r) => r.includes('Direct URL executable'))) type = 'download';

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
    <div className="rounded-[24px] border border-[#dfe7f5] bg-white/90 p-5 shadow-[0_16px_36px_rgba(71,92,132,0.08)]">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-xl bg-[#181936] p-2 text-white">
          <Shield className="h-4 w-4 stroke-[2]" />
        </div>
        <div>
          <h3 className="text-base font-extrabold text-[#181936]">
            Link check
          </h3>
          <p className="text-sm font-semibold text-[#74758d]">
            Paste a link here when something feels off.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste URL to analyze"
          className="w-full flex-1 rounded-xl border border-[#dfe7f5] bg-[#f6f8fc] px-3 py-2.5 text-sm font-semibold focus:border-[#4f4d69] focus:outline-hidden"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleScan(url);
          }}
        />
        <button
          onClick={() => handleScan(url)}
          className="w-full shrink-0 cursor-pointer rounded-xl bg-[#181936] px-4 py-2.5 text-center text-sm font-extrabold text-white transition-colors hover:bg-[#4f4d69] sm:w-auto"
        >
          Check link
        </button>
      </div>

      {result && (
        <div className="mt-5 animate-slide-up border-t border-[#eef3fb] pt-5">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#eef3fb] pb-3">
            <div className="min-w-0 flex-1">
              <span className="text-xs font-extrabold uppercase text-[#74758d]">
                Target URL
              </span>
              <p className="mt-1 break-all text-sm font-semibold text-[#181936]">
                {url}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <RiskBadge status={result.status} score={result.score} size="md" />
              <button
                onClick={clearScanner}
                className="ml-1 cursor-pointer text-xs font-extrabold text-[#74758d] underline hover:text-[#181936]"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <span className="mb-2 block text-xs font-extrabold uppercase text-[#74758d]">
                What ClickSafe found
              </span>
              {result.reasons.length === 0 ? (
                <div className="flex items-center gap-2 rounded-xl border border-[#bdecc8] bg-[#eefbf1] px-3 py-2 text-sm font-semibold text-[#188018]">
                  <Shield className="h-4 w-4 stroke-[2]" />
                  <span>No obvious red flags found.</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {result.reasons.map((reason) => (
                    <div
                      key={reason}
                      className={`flex items-start gap-2 rounded-xl border p-3 text-sm font-semibold ${
                        result.status === 'dangerous'
                          ? 'border-[#f5bad4] bg-[#fff0f6] text-[#7a314f]'
                          : 'border-[#f3d49c] bg-[#fff6e7] text-[#7a571b]'
                      }`}
                    >
                      {result.status === 'dangerous' ? (
                        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#d41470]" />
                      ) : (
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#a76b12]" />
                      )}
                      <span className="leading-tight">{reason}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-[#dfe7f5] bg-[#f6f8fc] p-4">
              <span className="mb-1 block text-xs font-extrabold uppercase text-[#74758d]">
                Suggestion
              </span>
              <p className="mb-3 text-sm font-extrabold text-[#181936]">
                {result.status === 'dangerous'
                  ? 'Do not open this.'
                  : result.status === 'caution'
                  ? 'Take a closer look first.'
                  : 'Looks okay.'}
              </p>
              <p className="mb-3 text-sm font-semibold leading-relaxed text-[#74758d]">
                {result.recommendedAction}
              </p>

              {result.status !== 'safe' && (
                <div className="flex items-start gap-2 rounded-xl border border-[#dfe7f5] bg-white p-2 text-xs font-semibold text-[#74758d]">
                  <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>This check runs locally in your browser.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
