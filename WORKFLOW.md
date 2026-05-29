# ClickSafe – Security Audit & Verification Workflow

This workflow guide documents the procedures for testing ClickSafe's protection metrics within our developer sandbox workspace.

---

## 1. Automated Link Scanning Test Matrix

Verify that our scanning engine rules produce identical classifications inside the interactive Link diagnostics pane:

1. Navigate to **Link Scanner** tab via options sidebar.
2. Under "test a preset simulation vector", click the pre-configured buttons:
   * **Safe Site (GitHub)**:
     * *Expected Status*: Safe (Score: 0/100)
     * *Recommended Action*: Approved link indication.
   * **Phishing Spoof (PayPal Mimic)**:
     * *Expected Status*: Dangerous (Score: 85/100)
     * *Flagged reasons*: Phishing keywords inside host structure, HTTP unencrypted warning.
   * **Fake Recruiter assessment (Job Scam)**:
     * *Expected Status*: Dangerous (Score: 95/100)
     * *Flagged reasons*: Direct executable .exe download, Google Drive brand spoofing, Fake Job scam assessment keywords.

---

## 2. File Download Safety Intercept Test

Test the physical warning modals which trigger whenever an unverified dangerous file is downloaded:

1. Go to **File Protection** page via options sidebar.
2. Click **Simulate Job Assessment .exe** button:
   * **Expected Action**: High contrast warning modal opens.
   * **Warning Copy Check**: Re-audit whether warning message displays: *"This feels like a job-related file... Attackers often use fake job offers to spread malware."*
3. Click "Isolate File":
   * **Expected Action**: The warning closes, and the file is deleted from our tracked list.
4. Click **Simulate Secret Keys .env** button:
   * **Expected Action**: Warning modal opens with developer secret target indicators.

---

## 3. Options Settings & Toggles Matrix

Confirm that turning off a protective layer correctly toggles real-time scanners:

1. Go to **Shield Settings** tab via sidebar.
2. Deactivate **Anti Job Scam Shield** toggle.
3. Head over to **Link Scanner** tab and re-test **Fake Recruiter assessment (Job Scam)** preset:
   * **Expected Action**: The risk score drops because job-scam penalties are bypassed, changing safety label from "Dangerous" to "Caution".
4. Return to **Shield Settings** and click **Reset databases & clear history log**:
   * **Expected Action**: Resets custom whitelists, restore core databases, and seeds default alerts history.
