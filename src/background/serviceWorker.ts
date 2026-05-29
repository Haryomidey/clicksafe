/**
 * ClickSafe MV3 Background Service Worker
 * Intercepts downloads and analyzes URLs in real time.
 */

import { scanDownloadedFile } from '../lib/scanner';
import { getChromeApi } from '../lib/chrome';
import { ProtectionSettings, LoggedDownload } from '../types';
import { INITIAL_SETTINGS, STORAGE_VERSION } from '../lib/constants';

const chromeApi = getChromeApi();

// Listen to extension installs to initialize default settings
chromeApi.runtime.onInstalled?.addListener(async () => {
  console.log('ClickSafe Protection Engine Booted successfully.');
  
  const saved = await chromeApi.storage.local.get(['storageVersion', 'settings']);
  if (saved.storageVersion !== STORAGE_VERSION) {
    await chromeApi.storage.local.set({
      storageVersion: STORAGE_VERSION,
      settings: saved.settings || INITIAL_SETTINGS,
      history: [],
      downloads: [],
      checklist: []
    });
  }
});

// Intercept downloads if enabled
chromeApi.downloads?.onCreated?.addListener(async (downloadItem) => {
  const storage = await chromeApi.storage.local.get(['settings', 'downloads']);
  const settings: ProtectionSettings = storage.settings;
  
  if (!settings || !settings.downloadMonitoring) {
    return;
  }

  const filename = downloadItem.filename || 'unknown_file';
  const sourceUrl = downloadItem.url || '';
  
  // Analyze download parameters
  const fileScore = scanDownloadedFile(filename, sourceUrl, settings);

  if (fileScore.status !== 'safe') {
    // Flagged as threat
    console.warn(`[ClickSafe Shield] BLOCK WARNING: Flagged download file [${filename}] - Risk Score: ${fileScore.score}`);
    if (fileScore.status === 'dangerous') {
      await chromeApi.downloads?.cancel?.(downloadItem.id);
    }
    
    let type: 'standard' | 'dangerous' | 'job' | 'developer' = 'dangerous';
    if (fileScore.reasons.some(r => r.includes('Job Scam'))) type = 'job';
    else if (fileScore.reasons.some(r => r.includes('Developer secret'))) type = 'developer';

    const recordedDownload: LoggedDownload = {
      id: downloadItem.id.toString(),
      filename,
      url: sourceUrl,
      fileSize: downloadItem.fileSize ? `${(downloadItem.fileSize / (1024 * 1024)).toFixed(2)} MB` : 'Unknown',
      timestamp: Date.now(),
      riskScore: fileScore.score,
      status: fileScore.status,
      flaggedReasons: fileScore.reasons,
      warningViewed: fileScore.status === 'dangerous',
      type
    };

    const previousDownloads = storage.downloads || [];
    await chromeApi.storage.local.set({
      downloads: [recordedDownload, ...previousDownloads]
    });

    // Notify user via Chrome standard tabs or badge counter
    chromeApi.action?.setBadgeText?.({ text: '!' });
    chromeApi.action?.setBadgeBackgroundColor?.({ color: '#E11D48' }); // rose-600
  }
});
