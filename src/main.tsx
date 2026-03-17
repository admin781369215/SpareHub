import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

const updateSW = registerSW({
  onNeedRefresh() {
    // In a real app, you'd show a custom toast/modal here.
    // For now, we'll just log it or auto-update.
    console.log('تحديث جديد متاح.');
    // Automatically update for now to avoid confirm() in iframe
    updateSW(true);
  },
  onOfflineReady() {
    console.log('التطبيق جاهز للعمل بدون إنترنت');
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
