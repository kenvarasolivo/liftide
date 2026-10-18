'use client';

import { useEffect, useRef, useState } from 'react';
import { browserNotificationTarget, RestNotifications, type NotificationRest } from '@/lib/rest-notifications';

const preferenceKey = 'liftide-rest-notifications';

export function useRestNotifications(rest: NotificationRest | null, name: string) {
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('unsupported');
  const [error, setError] = useState('');
  const controller = useRef<RestNotifications | null>(null);

  useEffect(() => {
    const refresh = () => {
      const permission = window.isSecureContext && 'Notification' in window ? Notification.permission : 'unsupported';
      setPermission(permission);
      try { setEnabled(permission === 'granted' && localStorage.getItem(preferenceKey) === 'on'); } catch {}
    };
    refresh();
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);

  useEffect(() => {
    if (!enabled || permission !== 'granted') return;
    const notifications = new RestNotifications(browserNotificationTarget(), () => setError('Notifications could not be shown. Check your browser and system notification settings.'));
    controller.current = notifications;
    return () => { notifications.dispose(); controller.current = null; };
  }, [enabled, permission]);

  useEffect(() => {
    controller.current?.update(rest, name);
  }, [enabled, permission, rest?.exerciseId, rest?.endAt, rest?.paused, rest?.complete, name]);

  async function toggle() {
    setError('');
    if (enabled) {
      setEnabled(false);
      try { localStorage.setItem(preferenceKey, 'off'); } catch {}
      return;
    }
    try {
      // Permission prompts must originate from this explicit button press.
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        setEnabled(true);
        try { localStorage.setItem(preferenceKey, 'on'); } catch {}
      }
    } catch { setError('Notifications are unavailable in this browser.'); }
  }

  return <div className="settings-row"><div><strong>Rest timer notifications</strong><p>{permission === 'unsupported'
    ? 'Notifications are unavailable here. On iPhone or iPad, add Liftide to your Home Screen and open it there.'
    : permission === 'denied' ? 'Notifications are blocked. Allow them in your browser’s site settings.'
    : 'Get one alert when your rest finishes. Keep this tab or app open; alerts may be delayed if your device puts it to sleep.'}</p>{error && <p role="status">{error}</p>}</div><button className="secondary-button" disabled={permission === 'unsupported' || permission === 'denied'} onClick={() => void toggle()} aria-pressed={enabled}>{enabled ? 'Turn off' : 'Enable notifications'}</button></div>;
}
