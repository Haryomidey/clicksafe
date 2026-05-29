/**
 * ClickSafe Premium Chrome Extension API bridge.
 * Detects extension runtime and provides high-fidelity mock implementations in development.
 */

declare const chrome: any;

const isChromeExtension = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;

// Storage mocks using localStorage as backing
interface StorageMock {
  [key: string]: any;
}

const getLocalStorageVal = (key: string, defaultVal: any) => {
  try {
    const raw = localStorage.getItem(`clicksafe_${key}`);
    return raw ? JSON.parse(raw) : defaultVal;
  } catch (e) {
    return defaultVal;
  }
};

const setLocalStorageVal = (key: string, val: any) => {
  try {
    localStorage.setItem(`clicksafe_${key}`, JSON.stringify(val));
  } catch (e) {
    console.error('Local Storage error', e);
  }
};

class SimulatedStorageArea {
  get(keys: string | string[] | object | null): Promise<any> {
    return new Promise((resolve) => {
      const result: Record<string, any> = {};
      if (!keys) {
        // Return everything
        const allKeys = ['history', 'settings', 'downloads', 'checklist', 'siteStatus'];
        allKeys.forEach((k) => {
          result[k] = getLocalStorageVal(k, null);
        });
      } else if (typeof keys === 'string') {
        result[keys] = getLocalStorageVal(keys, null);
      } else if (Array.isArray(keys)) {
        keys.forEach((key) => {
          result[key] = getLocalStorageVal(key, null);
        });
      } else if (typeof keys === 'object' && keys !== null) {
        Object.entries(keys).forEach(([key, dVal]) => {
          result[key] = getLocalStorageVal(key, dVal);
        });
      }
      setTimeout(() => resolve(result), 20);
    });
  }

  set(items: object): Promise<void> {
    return new Promise((resolve) => {
      Object.entries(items).forEach(([key, value]) => {
        setLocalStorageVal(key, value);
      });
      // Fire storage change events to simulated listeners
      chromeMock.storage.onChanged.listeners.forEach((listener) => {
        const changes: Record<string, { oldValue: any; newValue: any }> = {};
        Object.entries(items).forEach(([key, value]) => {
          changes[key] = {
            oldValue: getLocalStorageVal(key, null),
            newValue: value,
          };
        });
        listener(changes, 'local');
      });
      setTimeout(() => resolve(), 20);
    });
  }

  clear(): Promise<void> {
    return new Promise((resolve) => {
      const allKeys = ['history', 'settings', 'downloads', 'checklist', 'siteStatus'];
      allKeys.forEach((k) => localStorage.removeItem(`clicksafe_${k}`));
      setTimeout(() => resolve(), 20);
    });
  }
}

// Global active simulation listeners
const messageListeners: Array<(message: any, sender: any, sendResponse: (response: any) => void) => void> = [];
const downloadCreatedListeners: Array<(downloadItem: any) => void> = [];
const storageChangedListeners: Array<(changes: any, areaName: string) => void> = [];

const chromeMock = {
  runtime: {
    id: 'clicksafe-mock-id',
    getURL: (path: string) => {
      return `/${path}`;
    },
    sendMessage: (message: any): Promise<any> => {
      console.log('Simulated Chrome Extension Message sent:', message);
      return new Promise((resolve) => {
        // Dispatch to background script simulation in-memory
        messageListeners.forEach((listener) => {
          listener(message, { id: 'clicksafe' }, (response) => {
            resolve(response);
          });
        });
      });
    },
    onMessage: {
      addListener: (listener: (message: any, sender: any, sendResponse: (response: any) => void) => void) => {
        messageListeners.push(listener);
      },
      removeListener: (listener: any) => {
        const idx = messageListeners.indexOf(listener);
        if (idx !== -1) messageListeners.splice(idx, 1);
      },
    },
  },
  storage: {
    local: new SimulatedStorageArea(),
    onChanged: {
      listeners: storageChangedListeners,
      addListener: (listener: (changes: any, areaName: string) => void) => {
        storageChangedListeners.push(listener);
      },
      removeListener: (listener: any) => {
        const idx = storageChangedListeners.indexOf(listener);
        if (idx !== -1) storageChangedListeners.splice(idx, 1);
      },
    },
  },
  tabs: {
    query: (queryInfo: any): Promise<any[]> => {
      return new Promise((resolve) => {
        // Mock current actively selected site
        const currentSites = [
          {
            id: 101,
            url: getLocalStorageVal('sim_current_url', window.location.href),
            title: getLocalStorageVal('sim_current_title', document.title || 'Current page'),
            active: true,
          },
        ];
        resolve(currentSites);
      });
    },
  },
  downloads: {
    search: (query: any): Promise<any[]> => {
      return new Promise((resolve) => {
        const dls = getLocalStorageVal('downloads', []);
        resolve(dls);
      });
    },
    onCreated: {
      addListener: (listener: (downloadItem: any) => void) => {
        downloadCreatedListeners.push(listener);
      },
    },
  },
};

export const getChromeApi = () => {
  if (isChromeExtension) {
    return chrome;
  }
  return chromeMock as unknown as typeof chrome;
};

export const isRealExtension = () => isChromeExtension;

// Trigger download simulation helper for the web mock
export const simulateDownload = (filename: string, url: string, size?: string) => {
  if (isChromeExtension) {
    console.warn("simulateDownload is meant for simulated context inside the studio iframe preview API.");
  }
  const listeners = downloadCreatedListeners;
  listeners.forEach((listener) => {
    listener({
      id: Math.floor(Math.random() * 100000).toString(),
      filename,
      url,
      mimeType: filename.endsWith('.zip') ? 'application/zip' : 'application/octet-stream',
      fileSize: size || '2.4 MB',
      startTime: new Date().toISOString(),
      state: 'complete',
    });
  });
};
