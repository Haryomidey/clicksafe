import React, { useState } from 'react';
import { AppShell } from './components/AppShell';
import { Dashboard } from './dashboard/Dashboard';
import './styles/globals.css';

export default function App() {
  const [tab, setTab] = useState('overview');

  return (
    <AppShell currentTab={tab} onTabChange={setTab}>
      <Dashboard currentTab={tab} />
    </AppShell>
  );
}
