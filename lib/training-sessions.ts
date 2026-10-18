import type { TrainingData, Rest } from './machine-training';
import type { LoggedSet, Session } from './training';

export function trainingSessions(data: TrainingData): Session[] {
  const sessions = new Map(data.history.map(session => [session.id, session]));
  if (data.current) sessions.set(data.current.id, data.current);
  return [...sessions.values()].sort((a,b) => b.started - a.started);
}

export function recordTrainingSet(data: TrainingData, session: Session, exerciseId: string, set: LoggedSet, rest: Rest | null): TrainingData {
  const existing = trainingSessions(data).find(item => item.id === session.id) ?? session;
  const updated = { ...existing, sets: { ...existing.sets, [exerciseId]: [...(existing.sets[exerciseId] ?? []), set] } };
  // A concurrent finish wins, but the set still belongs to the intended session.
  if (existing.finished) return { ...data, history: [updated, ...data.history.filter(item => item.id !== session.id)] };
  const history = trainingSessions(data).filter(item => item.id !== session.id);
  return { ...data, current: updated, history, rest };
}

export function finishTrainingSession(data: TrainingData, id: string, finished: number): TrainingData {
  const session = trainingSessions(data).find(item => item.id === id);
  if (!session || session.finished) return data;
  const wasCurrent = data.current?.id === id;
  return { ...data, history: [{ ...session, routine: session.routine.trim() || 'Free training', finished }, ...data.history.filter(item => item.id !== id)],
    current: wasCurrent ? null : data.current, rest: wasCurrent ? null : data.rest };
}

export function resumeTrainingSession(data: TrainingData, id: string): TrainingData {
  const sessions = trainingSessions(data);
  const session = sessions.find(item => item.id === id);
  if (!session || session.finished) return data;
  return { ...data, current: session, history: sessions.filter(item => item.id !== id), rest: data.current?.id === id ? data.rest : null };
}

export function updateTrainingSession(data: TrainingData, id: string, update: (session: Session) => Session): TrainingData {
  return { ...data, current: data.current?.id === id ? update(data.current) : data.current,
    history: data.history.map(session => session.id === id ? update(session) : session) };
}

export function deleteTrainingSession(data: TrainingData, id: string): TrainingData {
  return { ...data, history: data.history.filter(session => session.id !== id),
    current: data.current?.id === id ? null : data.current,
    rest: data.current?.id === id ? null : data.rest };
}

// Compare the original exercise log when rebasing so a concurrent correction or
// deletion cannot make an array index point at somebody else's set.
export function correctTrainingSet(data: TrainingData, sessionId: string, exerciseId: string, index: number, original: LoggedSet[], replacement: Pick<LoggedSet, 'weight' | 'reps'> | null): TrainingData {
  const session = trainingSessions(data).find(item => item.id === sessionId);
  const sets = session?.sets[exerciseId];
  if (!sets || !sets[index]?.done || JSON.stringify(sets) !== JSON.stringify(original)) return data;
  if (replacement && (!Number.isFinite(replacement.weight) || replacement.weight < 0 || replacement.weight > 1500 || !Number.isInteger(replacement.reps) || replacement.reps < 1 || replacement.reps > 500)) return data;
  const corrected = replacement ? sets.map((set, i) => i === index ? { ...set, ...replacement } : set) : sets.filter((_, i) => i !== index);
  const updated = updateTrainingSession(data, sessionId, item => ({ ...item, sets: { ...item.sets, [exerciseId]: corrected } }));
  return { ...updated, rest: !replacement && data.current?.id === sessionId && data.rest?.exerciseId === exerciseId && index === sets.findLastIndex(set => set.done) ? null : data.rest };
}

// One-time recovery of old account-scoped offline workouts. Database settings and
// finished status win. Merge sets as a multiset so repeated equal sets survive.
export function recoverLegacySessions(data: TrainingData, legacy: TrainingData, recoveryId: string): TrainingData {
  if (data.legacyImports?.includes(recoveryId)) return data;
  const fingerprint = (set: LoggedSet) => JSON.stringify([set.weight,set.reps,set.done,set.loggedAt ?? null]);
  const sessions = new Map(trainingSessions(data).map(session => [session.id, session]));
  for (const old of trainingSessions(legacy)) {
    const existing = sessions.get(old.id);
    if (!existing) { sessions.set(old.id, old); continue; }
    const sets = { ...existing.sets };
    for (const [exerciseId, oldSets] of Object.entries(old.sets)) {
      const merged = [...(sets[exerciseId] ?? [])];
      const counts = new Map<string, number>();
      for (const set of merged) { const key = fingerprint(set); counts.set(key, (counts.get(key) ?? 0) + 1); }
      for (const set of oldSets) {
        const key = fingerprint(set), count = counts.get(key) ?? 0;
        if (count) counts.set(key, count - 1); else merged.push(set);
      }
      sets[exerciseId] = merged;
    }
    sessions.set(old.id, { ...existing, sets });
  }
  const current = data.current ?? (legacy.current && !sessions.get(legacy.current.id)?.finished ? sessions.get(legacy.current.id)! : null);
  return { ...data, legacyImports: [...(data.legacyImports ?? []), recoveryId], current: current ? sessions.get(current.id)! : null,
    history: [...sessions.values()].filter(session => session.id !== current?.id).sort((a,b) => b.started - a.started),
    customMachines: [...data.customMachines, ...legacy.customMachines.filter(machine => !data.customMachines.some(existing => existing.id === machine.id))] };
}
