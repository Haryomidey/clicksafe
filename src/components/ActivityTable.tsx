import React, { useState } from 'react';
import { ScanHistoryItem } from '../types';
import { RiskBadge } from './RiskBadge';
import { ShieldCheck, ShieldAlert, Link, Download, Briefcase, Key, Trash, Search, ExternalLink } from 'lucide-react';

interface ActivityTableProps {
  history: ScanHistoryItem[];
  onRemoveItem: (id: string) => void;
  onClearAll: () => void;
}

export const ActivityTable: React.FC<ActivityTableProps> = ({
  history,
  onRemoveItem,
  onClearAll,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'link' | 'download' | 'job' | 'developer'>('all');
  const [filterRisk, setFilterRisk] = useState<'all' | 'safe' | 'caution' | 'dangerous'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<ScanHistoryItem | null>(null);

  const getIcon = (type: ScanHistoryItem['type'], status: ScanHistoryItem['status']) => {
    switch (type) {
      case 'job':
        return <Briefcase className={`h-4 w-4 ${status === 'dangerous' ? 'text-rose-600' : 'text-amber-500'}`} />;
      case 'developer':
        return <Key className={`h-4 w-4 ${status === 'dangerous' ? 'text-rose-600' : 'text-amber-500'}`} />;
      case 'download':
        return <Download className={`h-4 w-4 ${status === 'dangerous' ? 'text-rose-600' : 'text-neutral-500'}`} />;
      default:
        return <Link className={`h-4 w-4 ${status === 'dangerous' ? 'text-rose-600' : status === 'caution' ? 'text-amber-500' : 'text-emerald-600'}`} />;
    }
  };

  const getFriendlyType = (type: ScanHistoryItem['type']) => {
    switch (type) {
      case 'job': return 'Job scam protection';
      case 'developer': return 'Developer protection';
      case 'download': return 'Download scanner';
      default: return 'Link safety';
    }
  };

  // Filter history list
  const filtered = history.filter((item) => {
    const matchesKeyword = item.url.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || item.type === filterType;
    const matchesRisk = filterRisk === 'all' || item.status === filterRisk;
    return matchesKeyword && matchesType && matchesRisk;
  });

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-white rounded-lg border border-neutral-200 shadow-xs overflow-hidden">
      {/* Header filter options */}
      <div className="p-4 border-b border-neutral-100 bg-neutral-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-neutral-800 font-sans">
            Threat Protection Log
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-neutral-200 text-neutral-700 font-semibold">
            {filtered.length} entries
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onClearAll}
            disabled={history.length === 0}
            className="text-[11px] font-mono font-medium rounded-md px-2.5 py-1.5 border border-neutral-200 hover:border-neutral-900 bg-white hover:text-rose-700 disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer"
          >
            Clear Log
          </button>
        </div>
      </div>

      <div className="p-4 border-b border-neutral-100 flex flex-col md:flex-row items-center gap-2 text-xs">
        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter URLs/Files..."
            className="w-full pl-8 pr-3 py-1.5 text-xs font-mono rounded border border-neutral-200 focus:outline-hidden focus:border-neutral-900 bg-neutral-50/10"
          />
        </div>

        {/* Type Filter */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          <span className="text-neutral-400 font-mono text-[10px] uppercase ml-0 md:ml-2">
            Filter Type:
          </span>
          {(['all', 'link', 'download', 'job', 'developer'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-2 py-1 rounded text-[10px] font-mono capitalize cursor-pointer transition-colors ${
                filterType === t
                  ? 'bg-neutral-900 text-white font-semibold'
                  : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100 border border-neutral-200/50'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Risk Filter */}
        <div className="flex items-center gap-1.5 md:ml-auto w-full md:w-auto mt-2 md:mt-0">
          <span className="text-neutral-400 font-mono text-[10px] uppercase">
            Risk:
          </span>
          {(['all', 'safe', 'caution', 'dangerous'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setFilterRisk(r)}
              className={`px-2 py-1 rounded text-[10px] font-mono capitalize cursor-pointer transition-colors ${
                filterRisk === r
                  ? 'bg-neutral-900 text-white font-semibold'
                  : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100 border border-neutral-200/50'
              }`}
            >
              {r === 'all' ? 'All' : r}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-12 text-center text-neutral-400 text-sm">
          No records found matching the security filter filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3">
          {/* Table list */}
          <div className="lg:col-span-2 border-b lg:border-r lg:border-b-0 border-neutral-100 max-h-[450px] overflow-y-auto overflow-x-auto w-full">
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-100 uppercase text-[9px] font-mono text-neutral-400 tracking-wider">
                  <th className="py-2.5 px-3 font-semibold">Scope/Resource</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Threat Rating</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filtered.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={`hover:bg-neutral-50/60 cursor-pointer transition-colors ${
                      selectedItem?.id === item.id ? 'bg-neutral-50' : ''
                    }`}
                  >
                    <td className="py-3 px-3 min-w-0 max-w-[200px] md:max-w-xs">
                      <div className="flex items-start gap-2.5">
                        <div className="p-1.5 rounded bg-neutral-50 border border-neutral-100 shrink-0">
                          {getIcon(item.type, item.status)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-mono font-medium truncate text-neutral-900 select-all" title={item.url}>
                            {item.url}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-mono text-neutral-400">
                              {formatDate(item.timestamp)}
                            </span>
                            <span className="text-[10px] text-neutral-300">•</span>
                            <span className="text-[10px] font-mono text-neutral-500 capitalize">
                              {getFriendlyType(item.type)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center shrink-0">
                      <RiskBadge status={item.status} score={item.riskScore} size="sm" />
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onRemoveItem(item.id)}
                          className="p-1.5 text-neutral-400 hover:text-rose-600 rounded-md hover:bg-neutral-100 cursor-pointer"
                          title="Remove item"
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Quick Details inspection panel */}
          <div className="p-4 bg-neutral-50/50 flex flex-col justify-between max-h-[450px] overflow-y-auto">
            {selectedItem ? (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                    Inspected Resource
                  </span>
                  <div className="flex items-center gap-1">
                    <h4 className="text-xs font-semibold text-neutral-900 mt-1 break-all select-all font-mono leading-tight">
                      {selectedItem.url}
                    </h4>
                    <a
                      href={selectedItem.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-neutral-400 hover:text-neutral-900"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 py-3 border-y border-neutral-200/60 text-xs">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-neutral-400 block">
                      Safety Status
                    </span>
                    <span className="mt-1 block font-semibold">
                      <RiskBadge status={selectedItem.status} score={selectedItem.riskScore} size="sm" />
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-neutral-400 block">
                      Protection Vector
                    </span>
                    <span className="text-neutral-800 capitalize mt-1.5 block font-mono font-medium">
                      {selectedItem.type}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block mb-1">
                    Warning Diagnosis
                  </span>
                  {selectedItem.reasons.length === 0 ? (
                    <p className="text-xs text-emerald-800 font-sans p-2 bg-emerald-50 rounded border border-emerald-100">
                      Standard diagnostic results verified. No malicious indicators found. HTTPS connection standard.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {selectedItem.reasons.map((r, i) => (
                        <div
                          key={i}
                          className="text-xs font-sans text-neutral-700 bg-white border border-neutral-150 p-2 rounded-md flex items-start gap-1.5"
                        >
                          <span className="text-rose-600 text-xs mt-0.5">•</span>
                          <span className="leading-tight">{r}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block mb-1">
                    System Recommendation
                  </span>
                  <p className="text-xs text-neutral-600 bg-neutral-100 p-2.5 rounded border border-neutral-200/50 leading-relaxed italic">
                    {selectedItem.status === 'dangerous' 
                      ? '⚠️ Danger: Only proceed if you are an authorized security analyst. Attacks using fake job offers or credentials spoofing are rising.' 
                      : selectedItem.status === 'caution'
                      ? '🔍 Review carefully. Examine whether you expected this download brief or security login prompt.'
                      : '✅ Safely resolved. Standard protection shield active.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center h-full text-neutral-400 p-4">
                <ShieldCheck className="h-8 w-8 text-neutral-300 stroke-[1.25] mb-2" />
                <h4 className="text-xs font-semibold text-neutral-700 font-sans">
                  Click an alert log entry
                </h4>
                <p className="text-[10px] text-neutral-400 leading-normal max-w-[200px] mt-0.5">
                  View full detailed threat reasons and recommended actions.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
