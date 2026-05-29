import React from 'react';
import { Shield, LayoutDashboard, Search, Download, ClipboardList, Settings, Menu, X, ExternalLink } from 'lucide-react';
import { isRealExtension } from '../lib/chrome';

interface AppShellProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  children: React.ReactNode;
  isSimulatorOpen: boolean;
  onToggleSimulator: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentTab,
  onTabChange,
  children,
  isSimulatorOpen,
  onToggleSimulator,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const runningInChrome = isRealExtension();

  const navItems = [
    { id: 'overview', label: 'Dashboard Overview', icon: LayoutDashboard },
    { id: 'scanner', label: 'Link Scanner', icon: Search },
    { id: 'downloads', label: 'File Protection', icon: Download },
    { id: 'checklist', label: 'Safe Checklist', icon: ClipboardList },
    { id: 'settings', label: 'Shield Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col font-sans">
      {/* Top Banner Alert / Decorative */}
      <div className="bg-neutral-900 border-b border-neutral-800 text-white font-mono text-[10px] tracking-widest uppercase py-1.5 px-4 text-center flex items-center justify-center gap-1.5 shrink-0 select-none">
        <span className="h-1 py-1 px-1 rounded bg-emerald-500 inline-block animate-ping"></span>
        <span>Local Threat Protection Active • Zero Cloud Data Leaks</span>
      </div>

      <header className="bg-white border-b border-neutral-200/80 px-4 py-3 sticky top-0 md:relative z-20 shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-md bg-neutral-900 text-white flex items-center justify-center border border-neutral-800 shadow-sm">
              <Shield className="h-4 w-4 fill-white stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-neutral-900 tracking-tight font-sans text-base">
                  ClickSafe
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono border border-neutral-200 bg-neutral-50 text-neutral-500 select-none">
                  V3 Core
                </span>
              </div>
              <p className="text-[10px] text-neutral-400 font-mono">
                Heuristic Endpoint Shield
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!runningInChrome && (
            <button
              onClick={onToggleSimulator}
              className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium border text-neutral-800 transition-all cursor-pointer ${
                isSimulatorOpen
                  ? 'bg-neutral-900 text-white border-neutral-900 border-none'
                  : 'bg-white border-neutral-200 hover:border-neutral-900'
              }`}
            >
              <Shield className="h-3 w-3" />
              <span>{isSimulatorOpen ? 'Hide Extension Bubble' : 'Open Extension Bubble'}</span>
            </button>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-md border border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 md:hidden cursor-pointer"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 w-full max-w-7xl mx-auto flex flex-col md:flex-row min-h-0 relative">
        {/* Left Desktop Sidebar Navigation */}
        <aside className="hidden md:flex flex-col w-64 p-5 py-6 bg-white border-r border-neutral-200 shrink-0 gap-6">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest pl-2">
              Management Options
            </span>
            <nav className="space-y-1 pt-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md transition-all cursor-pointer text-left ${
                      isActive
                        ? 'bg-neutral-900 text-white font-semibold shadow-xs'
                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0 stroke-[1.75]" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Quick status report footer */}
          <div className="mt-auto border-t border-neutral-100 pt-4 space-y-3 font-sans">
            <div>
              <span className="text-[10px] font-mono text-neutral-400 block uppercase">
                Chrome API Link
              </span>
              <p className="text-xs text-neutral-700 font-medium mt-1 inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>{runningInChrome ? 'Connected' : 'Active Preview Mode'}</span>
              </p>
            </div>
            
            <div className="p-3 bg-neutral-50 rounded border border-neutral-150">
              <span className="text-[9px] font-mono uppercase text-neutral-400 block tracking-wider leading-none">
                Local Database Info
              </span>
              <p className="text-[10px] text-neutral-500 mt-1 leading-normal font-sans">
                Toggles and alerts persist via <code className="font-mono text-neutral-800">chrome.storage.local</code> in real time.
              </p>
            </div>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute inset-x-0 top-0 bg-white border-b border-neutral-200 shadow-md p-4 z-10 animate-slide-down">
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onTabChange(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium rounded-md text-left cursor-pointer ${
                      isActive
                        ? 'bg-neutral-900 text-white font-semibold'
                        : 'text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
              {!runningInChrome && (
              <button
                onClick={() => {
                  onToggleSimulator();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-mono font-medium text-left border-t border-neutral-100 mt-2 text-neutral-800 cursor-pointer"
              >
                <Shield className="h-4 w-4 shrink-0 text-neutral-600" />
                <span>{isSimulatorOpen ? 'Hide Extension Bubble' : 'Show Extension Bubble'}</span>
              </button>
              )}
            </nav>
          </div>
        )}

        {/* Main Workspace Frame */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 min-w-0 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
