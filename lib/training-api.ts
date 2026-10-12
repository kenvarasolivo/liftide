import type { TrainingData } from './machine-training';

export async function loadAccountTraining(): Promise<{ data: unknown; revision: number } | null> {
  const response = await fetch('/api/training', { cache: 'no-store', credentials: 'same-origin' });
  if (!response.ok) throw new Error('Account sync is unavailable.');
  return (await response.json()).record;
}
export async function saveAccountTraining(payload: TrainingData, revision: number): Promise<number> {
  const response = await fetch('/api/training', { method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: payload, revision }) });
  if (response.status === 409) return 0;
  if (!response.ok) throw new Error('Your workouts could not be synced.');
  const result = await response.json();
  if (!Number.isSafeInteger(result.revision) || result.revision <= 0) throw new Error('Invalid save response');
  return result.revision;
}
