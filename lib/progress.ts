import type { Session } from './training';

export type ProgressMetric = 'volume' | 'weight' | 'reps';
export type ProgressPoint = {
  id: string; date: number; volume: number; weight: number; reps: number;
  sets: number; totalReps: number; averageWeight: number; ongoing: boolean;
};

export function progressPoints(sessions: Session[], machineId: string, days: number, now: number): ProgressPoint[] {
  return sessions
    .filter(session => session.started >= now - days * 86400000 && session.sets[machineId]?.some(set => set.done))
    .sort((a, b) => a.started - b.started)
    .map(session => {
      const sets = session.sets[machineId].filter(set => set.done);
      const volume = sets.reduce((sum, set) => sum + set.weight * set.reps, 0);
      const totalReps = sets.reduce((sum, set) => sum + set.reps, 0);
      return {
        id: session.id, date: session.started, volume,
        weight: Math.max(...sets.map(set => set.weight)),
        reps: Math.max(...sets.map(set => set.reps)),
        sets: sets.length, totalReps,
        averageWeight: totalReps > 0 ? volume / totalReps : 0,
        ongoing: !session.finished,
      };
    });
}

export function relativeChange(current: number, previous: number): number | null {
  return previous > 0 ? (current - previous) / previous * 100 : null;
}
