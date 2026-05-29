/**
 * ClickSafe MV3 Background Service Worker
 * Intercepts downloads and analyzes URLs in real time.
 */

import { scanDownloadedFile } from '../lib/scanner';
import { getChromeApi } from '../lib/chrome';
import { ProtectionSettings, LoggedDownload } from '../types';
import { INITIAL_SETTINGS } from '../lib/constants';

const chromeApi = getChromeApi();

// Listen to extension installs to initialize default settings
chromeApi.runtime.onInstalled?.addListener(async () => {
  console.log('ClickSafe Protection Engine Booted successfully.');
  
  const saved = await chromeApi.storage.local.get(['settings']);
  if (!saved.settings) {
    await chromeApi.storage.local.set({
      settings: INITIAL_SETTINGS,
      history: [],
      downloads: []
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
      warningViewed: false,
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
