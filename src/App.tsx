import React, { useState, useEffect } from 'react';
import { AppShell } from './components/AppShell';
import { Dashboard } from './dashboard/Dashboard';
import { Popup } from './popup/Popup';
import { Shield, Settings, Laptop, ArrowRight, RefreshCw, Layers } from 'lucide-react';
import './styles/globals.css';

export default function App() {
  const [tab, setTab] = useState('overview');
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(true);

  // Auto-import fonts in App loading phase to ensure supreme design
  useEffect(() => {
    // Add custom imports or verify stylesheet references
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  return (
    <AppShell
      currentTab={tab}
      onTabChange={setTab}
      isSimulatorOpen={isSimulatorOpen}
      onToggleSimulator={() => setIsSimulatorOpen(!isSimulatorOpen)}
    >
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Main interactive Option Pages Workspace */}
        <div className="flex-1 min-w-0 w-full">
          <Dashboard currentTab={tab} />
        </div>

        {/* Floating extension popup simulator (visible on medium & large displays) */}
        {isSimulatorOpen && (
          <div className="w-full lg:w-[375px] shrink-0 bg-neutral-50 border border-neutral-200 rounded-xl shadow-lg overflow-hidden animate-slide-up sticky top-24 self-start">
            {/* Simulated Desktop Browser Frame Header */}
            <div className="bg-neutral-150 border-b border-neutral-200 p-2.5 px-4 flex items-center justify-between gap-3 text-[11px] font-mono select-none">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-neutral-300"></span>
                <span className="h-2.5 w-2.5 rounded-full bg-neutral-300"></span>
                <span className="h-2.5 w-2.5 rounded-full bg-neutral-300"></span>
              </div>
              <div className="flex-1 max-w-[180px] text-center bg-white px-2 py-0.5 rounded border border-neutral-200 text-neutral-400 text-[10px] truncate leading-tight flex items-center justify-center gap-1">
                <Shield className="h-2.5 w-2.5 text-neutral-400 shrink-0" />
                <span>Sandbox Browser</span>
              </div>
              <div className="flex items-center gap-2">
                <Laptop className="h-3.5 w-3.5 text-neutral-400" />
                <span className="text-neutral-500 font-bold">SIM</span>
              </div>
            </div>

            {/* Simulated Extension dropdown trigger bubble */}
            <div className="bg-neutral-100 p-1 flex items-center justify-center border-b border-neutral-200/50">
              <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-widest font-bold">
                ClickSafe Extension Popup
              </span>
            </div>

            {/* The actual high-fidelity standalone Popup view */}
            <div className="h-[480px] overflow-hidden">
              <Popup
                onOpenDashboard={(targetTab) => {
                  if (targetTab) setTab(targetTab); 
                }}
                standalone={false}
              />
            </div>

            {/* Developer interactive tooltip helper */}
            <div className="bg-neutral-900 text-neutral-300 p-3 text-[10px] font-mono border-t border-neutral-800 leading-normal flex items-start gap-2">
              <div className="p-1 rounded bg-neutral-800 text-white font-extrabold shrink-0 mt-0.5">💡</div>
              <div>
                <span className="text-white block font-bold mb-0.5">Developer Testing Helper:</span>
                Use the installed extension on any web page to scan the active tab and intercept risky links before navigation.
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
