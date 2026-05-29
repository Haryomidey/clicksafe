import { SafetyStatus } from '../types';

export interface RiskEvaluation {
  score: number;
  status: SafetyStatus;
  reasons: string[];
  recommendedAction: string;
}

/**
 * Calculates a standard risk score (0 - 100) based on checked rules.
 * Generates specific user-friendly descriptions and safety labels.
 */
export const evaluateRisk = (reasons: string[], isFileDownload = false): RiskEvaluation => {
  let score = 0;
  
  if (reasons.length === 0) {
    return {
      score: 0,
      status: 'safe',
      reasons: [],
      recommendedAction: isFileDownload 
        ? 'This file appears safe to open. Standard caution still applies.' 
        : 'This link is clean. No suspicious indicators detected.'
    };
  }

  // Assign weighted penalty points
  reasons.forEach((reason) => {
    const r = reason.toLowerCase();
    if (r.includes('punycode') || r.includes('spoofing')) {
      score += 45;
    } else if (r.includes('insecure http') || r.includes('no encryption')) {
      score += 15;
    } else if (r.includes('shortened') || r.includes('redirect')) {
      score += 25;
    } else if (r.includes('too many subdomains') || r.includes('nested')) {
      score += 20;
    } else if (r.includes('dangerous extension') || r.includes('executable')) {
      score += 55;
    } else if (r.includes('fake cloud storage') || r.includes('drive mimic')) {
      score += 40;
    } else if (r.includes('credential request') || r.includes('developer secret')) {
      score += 50;
    } else if (r.includes('fake job scam') || r.includes('assessment trap')) {
      score += 35;
    } else if (r.includes('suspicious keyword')) {
      score += 10;
    } else {
      score += 15; // default penalty
    }
  });

  // Clamp score
  score = Math.min(100, Math.max(0, score));

  let status: SafetyStatus = 'safe';
  let recommendedAction = '';

  if (score >= 60) {
    status = 'dangerous';
    recommendedAction = isFileDownload
      ? 'Do NOT open or execute this file. Delete it immediately.'
      : 'Do NOT proceed. Close this browser tab or navigate away now.';
  } else if (score >= 20) {
    status = 'caution';
    recommendedAction = isFileDownload
      ? 'Verify the identity of the sender before opening this file.'
      : 'Review the layout carefully. Do not enter credentials on this page.';
  } else {
    status = 'safe';
    recommendedAction = isFileDownload
      ? 'Safe to open. Ensure your device is up-to-date.'
      : 'Safe. This site uses encrypted communication and standard domains.';
  }

  return {
    score,
    status,
    reasons,
    recommendedAction
  };
};
