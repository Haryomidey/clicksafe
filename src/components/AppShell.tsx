import React from 'react';
import { Shield, LayoutDashboard, Search, Download, ClipboardList, Settings, Menu, X } from 'lucide-react';
import { isRealExtension } from '../lib/chrome';

interface AppShellProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentTab,
  onTabChange,
  children,
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
    <div className="min-h-screen bg-[#f6f8fc] font-sans text-[#181936]">
      <header className="sticky top-0 z-20 border-b border-[#dfe7f5] bg-white/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="cursor-pointer rounded-xl p-2 text-[#74758d] hover:bg-[#f1f4fa] md:hidden"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#181936] text-white shadow-sm">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xl font-extrabold tracking-tight">
                ClickSafe
              </div>
              <p className="text-[11px] font-bold text-[#74758d]">
                {runningInChrome ? 'Chrome protection is running' : 'Local browser preview'}
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-[#dfe7f5] bg-[#f6f8fc] px-4 py-2 text-sm font-extrabold text-[#4f4d69] md:flex">
            <span className="h-2.5 w-2.5 rounded-full bg-[#21b321]" />
            Background scanning on
          </div>
        </div>
      </header>

      <div className="relative mx-auto flex w-full max-w-7xl flex-col md:flex-row">
        <aside className="hidden min-h-[calc(100vh-65px)] w-64 shrink-0 border-r border-[#dfe7f5] bg-white p-5 md:block">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-extrabold transition ${
                    isActive
                      ? 'bg-[#181936] text-white shadow-sm'
                      : 'text-[#74758d] hover:bg-[#f6f8fc] hover:text-[#181936]'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0 stroke-[1.9]" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="mt-8 rounded-2xl border border-[#dfe7f5] bg-[#f6f8fc] p-4">
            <p className="text-xs font-extrabold uppercase text-[#74758d]">Local protection</p>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-[#74758d]">
              Scans stay on this browser. No cloud account or server is needed.
            </p>
          </div>
        </aside>

        {mobileMenuOpen && (
          <div className="absolute inset-x-4 top-3 z-30 rounded-2xl border border-[#dfe7f5] bg-white p-3 shadow-2xl md:hidden">
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
                    className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-extrabold ${
                      isActive ? 'bg-[#181936] text-white' : 'text-[#74758d] hover:bg-[#f6f8fc]'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        )}

        <main className="min-w-0 flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};
