import { getChromeApi } from './chrome';
import { ProtectionSettings, ScanHistoryItem, LoggedDownload, ChecklistItem } from '../types';
import { INITIAL_SETTINGS, INITIAL_CHECKLIST } from './constants';

const chromeApi = getChromeApi();

export const getStorageData = async (): Promise<{
  settings: ProtectionSettings;
  history: ScanHistoryItem[];
  downloads: LoggedDownload[];
  checklist: ChecklistItem[];
}> => {
  const data = await chromeApi.storage.local.get(['settings', 'history', 'downloads', 'checklist']);
  
  // Seed defaults if empty
  let settings = data.settings;
  if (!settings) {
    settings = INITIAL_SETTINGS;
    await chromeApi.storage.local.set({ settings });
  }

  let history = data.history;
  if (!Array.isArray(history)) {
    history = [];
    await chromeApi.storage.local.set({ history });
  }

  let downloads = data.downloads;
  if (!Array.isArray(downloads)) {
    downloads = [];
    await chromeApi.storage.local.set({ downloads });
  }

  let checklist = data.checklist;
  if (!checklist || checklist.length === 0) {
    checklist = INITIAL_CHECKLIST;
    await chromeApi.storage.local.set({ checklist });
  }

  return { settings, history, downloads, checklist };
};

export const saveSettings = async (settings: ProtectionSettings): Promise<void> => {
  await chromeApi.storage.local.set({ settings });
};

export const saveHistory = async (history: ScanHistoryItem[]): Promise<void> => {
  await chromeApi.storage.local.set({ history });
};

export const saveDownloads = async (downloads: LoggedDownload[]): Promise<void> => {
  await chromeApi.storage.local.set({ downloads });
};

export const saveChecklist = async (checklist: ChecklistItem[]): Promise<void> => {
  await chromeApi.storage.local.set({ checklist });
};

export const addHistoryItem = async (item: Omit<ScanHistoryItem, 'id' | 'timestamp'>): Promise<ScanHistoryItem> => {
  const { history } = await getStorageData();
  const newItem: ScanHistoryItem = {
    ...item,
    id: 'h_' + Math.floor(Math.random() * 100000).toString(),
    timestamp: Date.now()
  };
  const updated = [newItem, ...history];
  await saveHistory(updated);
  return newItem;
};

export const addDownloadItem = async (item: Omit<LoggedDownload, 'id' | 'timestamp'>): Promise<LoggedDownload> => {
  const { downloads } = await getStorageData();
  const newItem: LoggedDownload = {
    ...item,
    id: 'd_' + Math.floor(Math.random() * 100000).toString(),
    timestamp: Date.now()
  };
  const updated = [newItem, ...downloads];
  await saveDownloads(updated);
  return newItem;
};

export const clearAllData = async (): Promise<void> => {
  await chromeApi.storage.local.set({
    settings: INITIAL_SETTINGS,
    history: [],
    downloads: [],
    checklist: INITIAL_CHECKLIST
  });
};
