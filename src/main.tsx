import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

// Remove the old access key left over from the pre-Supabase login.
try {
  localStorage.removeItem('abt.accessKey');
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
