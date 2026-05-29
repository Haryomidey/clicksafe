import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell } from '../components/AppShell';
import { Dashboard } from './Dashboard';
import '../styles/globals.css';

const OptionsApp = () => {
  const [tab, setTab] = useState('overview');

  return (
    <AppShell currentTab={tab} onTabChange={setTab}>
      <Dashboard currentTab={tab} />
    </AppShell>
  );
};

const container = document.getElementById('options-root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <OptionsApp />
    </React.StrictMode>
  );
}
