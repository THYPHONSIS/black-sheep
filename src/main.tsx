import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Das HTML-Element #root für den App-Start fehlt.');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
