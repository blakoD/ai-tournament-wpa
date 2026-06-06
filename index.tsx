import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { loadInitialData } from './services/initialData';
import './i18n';

// Initialize sample data if storage is empty
loadInitialData();

// Apply saved theme before first render to prevent flash of wrong theme
const savedTheme = localStorage.getItem('app_theme') ?? 'dark';
if (savedTheme === 'dark') {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);