'use client';

import { useEffect, useState } from 'react';
import { automaticUpdates } from '@/lib/pwa-updates';
import './pwa-controls.css';

interface InstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaControls() {
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone;
    setInstalled(!!standalone);
    if (standalone) document.documentElement.dataset.standalone = '';
    const preventZoom = (event: Event) => { if (standalone) event.preventDefault(); };
    const preventPinch = (event: TouchEvent) => { if (standalone && event.touches.length > 1) event.preventDefault(); };
    document.addEventListener('gesturestart', preventZoom, { passive: false });
    document.addEventListener('gesturechange', preventZoom, { passive: false });
    document.addEventListener('touchmove', preventPinch, { passive: false });
    setIos(!standalone && (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)));
    const onInstall = (event: Event) => {
      event.preventDefault();
      if (!standalone) setInstall(event as InstallEvent);
    };
    const onInstalled = () => { setInstall(null); setIos(false); setRequested(false); setInstalled(true); };
    const onRequest = () => setRequested(true);
    window.addEventListener('liftide:install', onRequest);
    window.addEventListener('beforeinstallprompt', onInstall);
    window.addEventListener('appinstalled', onInstalled);

    let disposed = false;
    let registration: ServiceWorkerRegistration | undefined;
    let updates: ReturnType<typeof automaticUpdates> | undefined;
    // Forms may contain unsaved account details; workouts declare their own
    // busy state so a background update never clears a set or an active timer.
    const canUpdate = () => !document.querySelector('[data-update-blocked="true"], form, dialog[open]') &&
      !(document.activeElement instanceof HTMLElement && document.activeElement.isContentEditable);
    const checkUpdate = () => {
      updates?.check();
      if (document.visibilityState === 'visible') void registration?.update().catch(() => {});
    };
    const interval = setInterval(checkUpdate, 60000);
    const idleCheck = setInterval(() => updates?.check(), 1000);
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator && window.isSecureContext) {
      void navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).then(result => {
        if (disposed) return;
        registration = result;
        updates = automaticUpdates(result, navigator.serviceWorker, canUpdate, () => window.location.reload());
        document.addEventListener('visibilitychange', checkUpdate);
        window.addEventListener('online', checkUpdate);
      }).catch(error => console.error('Liftide offline setup failed:', error));
    }
    return () => {
      disposed = true;
      window.removeEventListener('beforeinstallprompt', onInstall);
      window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener('liftide:install', onRequest);
      updates?.dispose();
      clearInterval(interval);
      clearInterval(idleCheck);
      delete document.documentElement.dataset.standalone;
      document.removeEventListener('gesturestart', preventZoom);
      document.removeEventListener('gesturechange', preventZoom);
      document.removeEventListener('touchmove', preventPinch);
      document.removeEventListener('visibilitychange', checkUpdate);
      window.removeEventListener('online', checkUpdate);
    };
  }, []);

  async function installApp() {
    if (!install) return;
    try {
      await install.prompt();
      await install.userChoice;
      setInstall(null);
    } catch (error) { console.error('Liftide installation failed:', error); }
  }

  if (!requested) return null;
  return <aside className="pwa-bar pwa-install" aria-label="Install Liftide">
    <p>{installed ? 'Liftide is already installed. Open it from your Home Screen or app launcher.' : ios ? 'Keep Liftide on your Home Screen: tap Share, then Add to Home Screen.' :
      install ? 'Keep Liftide close. Install it for your next workout.' : 'Open your browser menu to install Liftide or add it to your Home Screen.'}</p>
    {install && <button onClick={() => void installApp()}>Install app</button>}
    <button className="pwa-dismiss" onClick={() => setRequested(false)} aria-label="Dismiss installation suggestion">×</button>
  </aside>;
}
