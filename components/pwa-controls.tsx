'use client';

import { useEffect, useState } from 'react';
import './pwa-controls.css';

interface InstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaControls() {
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone;
    setIos(!standalone && (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)));
    const onInstall = (event: Event) => {
      event.preventDefault();
      if (!standalone) setInstall(event as InstallEvent);
    };
    const onInstalled = () => { setInstall(null); setIos(false); };
    window.addEventListener('beforeinstallprompt', onInstall);
    window.addEventListener('appinstalled', onInstalled);

    let disposed = false;
    let registration: ServiceWorkerRegistration | undefined;
    const onUpdate = () => {
      const worker = registration?.installing;
      worker?.addEventListener('statechange', () => {
        if (!disposed && worker.state === 'installed' && navigator.serviceWorker.controller) {
          setWaiting(registration?.waiting ?? null);
        }
      });
    };
    const checkUpdate = () => { if (document.visibilityState === 'visible') void registration?.update().catch(() => {}); };
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator && window.isSecureContext) {
      void navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).then(result => {
        if (disposed) return;
        registration = result;
        setWaiting(result.waiting);
        result.addEventListener('updatefound', onUpdate);
        onUpdate();
        document.addEventListener('visibilitychange', checkUpdate);
      }).catch(error => console.error('Liftide offline setup failed:', error));
    }
    return () => {
      disposed = true;
      window.removeEventListener('beforeinstallprompt', onInstall);
      window.removeEventListener('appinstalled', onInstalled);
      registration?.removeEventListener('updatefound', onUpdate);
      document.removeEventListener('visibilitychange', checkUpdate);
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

  function updateApp() {
    if (!waiting || updating) return;
    setUpdating(true);
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
    waiting.postMessage({ type: 'SKIP_WAITING' });
  }

  if (!waiting && (dismissed || (!install && !ios))) return null;
  return <aside className="pwa-bar" aria-label={waiting ? 'App update' : 'Install Liftide'}>
    <p>{waiting ? 'A new version of Liftide is ready. Update when you finish your set.' :
      ios ? 'Keep Liftide on your Home Screen: tap Share, then Add to Home Screen.' :
      'Keep Liftide close. Install it for your next workout.'}</p>
    {waiting ? <button onClick={updateApp} disabled={updating}>{updating ? 'Updating…' : 'Update app'}</button> :
      <>{install && <button onClick={() => void installApp()}>Install app</button>}
        <button className="pwa-dismiss" onClick={() => setDismissed(true)} aria-label="Dismiss installation suggestion">×</button></>}
  </aside>;
}
