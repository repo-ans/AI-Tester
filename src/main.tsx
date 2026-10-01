import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

// Remove leftovers: the pre-Supabase access key and the per-browser test
// defaults (now shared team settings in the database).
try {
  localStorage.removeItem('abt.accessKey');
  localStorage.removeItem('abt.defaults');
} catch {
  /* storage unavailable */
}

const root = document.getElementById('root');
if (!root) throw new Error('#root element missing');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
