'use client';
import { useEffect, useRef, useState, type SetStateAction } from 'react';
import { emptyData, readTraining, type TrainingData } from './machine-training';
import { loadAccountTraining, saveAccountTraining } from './training-api';
import { TrainingSync, trainingKey, type TrainingSnapshot, type TrainingRemote } from './training-sync';

export function useTrainingStore(userId: string | null) {
  const [state, setState] = useState<TrainingSnapshot>({ data: emptyData, loaded: false, canSave: true, status: 'loading', message: '' });
  const controller = useRef<TrainingSync | null>(null);
  useEffect(() => {
    const remote: TrainingRemote | null = userId ? { load: loadAccountTraining, save: saveAccountTraining } : null;
    const storage = { getItem: (key: string) => window.localStorage.getItem(key), setItem: (key: string, value: string) => window.localStorage.setItem(key, value) };
    const store = new TrainingSync(trainingKey(userId), storage, readTraining, remote, setState);
    controller.current = store;
    void store.start();
    const retry = () => { if (document.visibilityState === 'visible') void store.sync(); };
    window.addEventListener('online', retry); document.addEventListener('visibilitychange', retry);
    const interval = setInterval(retry, 30000);
    return () => { store.dispose(); controller.current = null; clearInterval(interval); window.removeEventListener('online', retry); document.removeEventListener('visibilitychange', retry); };
  }, [userId]);
  return { ...state, setData: (value: SetStateAction<TrainingData>) => controller.current?.update(value), retrySync: () => void controller.current?.sync(), loadAccountCopy: () => void controller.current?.loadAccountCopy() };
}
