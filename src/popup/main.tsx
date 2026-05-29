import React from 'react';
import { createRoot } from 'react-dom/client';
import { Popup } from './Popup';
import '../styles/globals.css';

const container = document.getElementById('popup-root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <div className="w-[375px] h-[550px] overflow-hidden select-none">
        <Popup standalone={false} />
      </div>
    </React.StrictMode>
  );
}
