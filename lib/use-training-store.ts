'use client';
import { useEffect, useRef, useState, type SetStateAction } from 'react';
import { emptyData, parseTraining, type TrainingData } from './machine-training';
import { loadAccountTraining, saveAccountTraining } from './training-api';
import { recoverLegacySessions } from './training-sessions';
import { TrainingSync, trainingKey, type TrainingSnapshot, type TrainingRemote } from './training-sync';

export function useTrainingStore(userId: string | null) {
  const [state, setState] = useState<TrainingSnapshot>({ data: emptyData, loaded: false, canSave: false, pending: false, status: 'loading', message: '' });
  const controller = useRef<TrainingSync | null>(null);
  useEffect(() => {
    const remote: TrainingRemote | null = userId ? { load: loadAccountTraining, save: saveAccountTraining } : null;
    const store = new TrainingSync(remote, setState);
    controller.current = store;
    void store.start().then(async () => {
      if (!userId || !store.snapshot.canSave) return;
      // Read only the signed-in account's old cache to recover unsynced workouts.
      // No new training data or acknowledgement is written to browser storage.
      try {
        const raw = window.localStorage.getItem(trainingKey(userId));
        if (!raw) return;
        const legacy = JSON.parse(raw);
        if (legacy.dirty) {
          const data = parseTraining(legacy.data);
          const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
          const recoveryId = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
          await store.update(latest => recoverLegacySessions(latest, data, recoveryId));
        }
      } catch { /* Old storage stays untouched; it never blocks database access. */ }
    });
    const retry = () => { if (document.visibilityState === 'visible') void store.sync(); };
    window.addEventListener('online', retry); document.addEventListener('visibilitychange', retry);
    const interval = setInterval(retry, 15000);
    const protectPending = (event: BeforeUnloadEvent) => { if (store.snapshot.pending) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', protectPending);
    const protectNavigation = async (event: MouseEvent) => {
      if (!store.snapshot.pending || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!(link instanceof HTMLAnchorElement) || link.hasAttribute('download') || link.target === '_blank') return;
      const destination = new URL(link.href);
      if (destination.origin === window.location.origin && destination.pathname === window.location.pathname) return;
      event.preventDefault(); event.stopPropagation();
      await store.sync();
      if (!store.snapshot.pending) window.location.assign(destination.href);
    };
    document.addEventListener('click', protectNavigation, true);
    return () => { document.removeEventListener('click', protectNavigation, true); window.removeEventListener('beforeunload', protectPending); store.dispose(); controller.current = null; clearInterval(interval); window.removeEventListener('online', retry); document.removeEventListener('visibilitychange', retry); };
  }, [userId]);
  return { ...state, setData: (value: SetStateAction<TrainingData>) => controller.current?.update(value), retrySync: () => void controller.current?.sync() };
}
