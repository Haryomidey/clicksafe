/**
 * Chrome Extension API bridge.
 * Uses the real Chrome API in the installed extension and a local browser
 * fallback for Vite development.
 */

declare const chrome: any;

const isChromeExtension = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;

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
    console.error('Local storage error', e);
  }
};

const storageChangedListeners: Array<(changes: any, areaName: string) => void> = [];

class BrowserStorageArea {
  get(keys: string | string[] | object | null): Promise<any> {
    return new Promise((resolve) => {
      const result: Record<string, any> = {};
      if (!keys) {
        ['history', 'settings', 'downloads', 'checklist', 'siteStatus'].forEach((key) => {
          result[key] = getLocalStorageVal(key, null);
        });
      } else if (typeof keys === 'string') {
        result[keys] = getLocalStorageVal(keys, null);
      } else if (Array.isArray(keys)) {
        keys.forEach((key) => {
          result[key] = getLocalStorageVal(key, null);
        });
      } else {
        Object.entries(keys).forEach(([key, defaultVal]) => {
          result[key] = getLocalStorageVal(key, defaultVal);
        });
      }
      resolve(result);
    });
  }

  set(items: object): Promise<void> {
    return new Promise((resolve) => {
      const changes: Record<string, { oldValue: any; newValue: any }> = {};
      Object.entries(items).forEach(([key, value]) => {
        changes[key] = {
          oldValue: getLocalStorageVal(key, null),
          newValue: value,
        };
        setLocalStorageVal(key, value);
      });
      storageChangedListeners.forEach((listener) => listener(changes, 'local'));
      resolve();
    });
  }

  clear(): Promise<void> {
    return new Promise((resolve) => {
      ['history', 'settings', 'downloads', 'checklist', 'siteStatus'].forEach((key) => {
        localStorage.removeItem(`clicksafe_${key}`);
      });
      resolve();
    });
  }
}

const browserFallbackApi = {
  runtime: {
    id: '',
    getURL: (path: string) => `/${path}`,
    openOptionsPage: () => {
      window.location.assign('/dashboard.html');
    },
    onInstalled: {
      addListener: () => {},
    },
    onMessage: {
      addListener: () => {},
      removeListener: () => {},
    },
  },
  storage: {
    local: new BrowserStorageArea(),
    onChanged: {
      addListener: (listener: (changes: any, areaName: string) => void) => {
        storageChangedListeners.push(listener);
      },
      removeListener: (listener: (changes: any, areaName: string) => void) => {
        const idx = storageChangedListeners.indexOf(listener);
        if (idx !== -1) storageChangedListeners.splice(idx, 1);
      },
    },
  },
  tabs: {
    query: (): Promise<any[]> => {
      return Promise.resolve([
        {
          id: 101,
          url: window.location.href,
          title: document.title || 'Current page',
          active: true,
        },
      ]);
    },
  },
  downloads: {
    search: (): Promise<any[]> => Promise.resolve(getLocalStorageVal('downloads', [])),
    onCreated: {
      addListener: () => {},
    },
  },
  action: {
    setBadgeText: () => {},
    setBadgeBackgroundColor: () => {},
  },
};

export const getChromeApi = () => {
  if (isChromeExtension) {
    return chrome;
  }
  return browserFallbackApi as unknown as typeof chrome;
};

export const isRealExtension = () => isChromeExtension;
