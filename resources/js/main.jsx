import React from 'react';
import { createRoot } from 'react-dom/client';
import '../css/app.css';
import App from './app.jsx';

const mountEl = document.getElementById('app');
if (mountEl) {
    const root = createRoot(mountEl);
    root.render(<App />);
}


