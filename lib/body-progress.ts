import { allMuscles, type Exercise, type Muscle, type Session } from './training';

export type BodyPeriod = 'today' | 'week';
const DAY = 86400000;
export const GLOW_FADE_DAYS = 7;

// Compare local calendar days, including across daylight-saving changes.
function calendarDay(timestamp: number) {
  const date = new Date(timestamp);
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY;
}

function completedSets(sessions: Session[], now: number) {
  // Prefer the live copy if a session also exists in history during a sync.
  return [...new Map(sessions.map(session => [session.id, session])).values()]
    .filter(session => !session.demo)
    .flatMap(session => Object.entries(session.sets).flatMap(([id, sets]) =>
      sets.filter(set => set.done).map(set => ({ id, ...set, timestamp: set.loggedAt ?? session.started }))))
    .filter(set => Number.isFinite(set.timestamp) && set.timestamp <= now);
}

export function bodyProgress(sessions: Session[], equipment: Exercise[], period: BodyPeriod, now: number) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (period === 'week') start.setDate(start.getDate() - (start.getDay() + 6) % 7);
  const counts = Object.fromEntries(allMuscles.map(muscle => [muscle, 0])) as Record<Muscle, number>;
  const targets = new Map(equipment.map(exercise => [exercise.id, exercise.muscles]));
  const sets = completedSets(sessions, now).filter(set => set.timestamp >= +start);
  for (const set of sets) for (const muscle of new Set(targets.get(set.id))) counts[muscle]++;
  return {
    counts,
    sets: sets.length,
    volume: sets.reduce((sum, set) => sum + set.weight * set.reps, 0),
    muscles: allMuscles.filter(muscle => counts[muscle] > 0),
  };
}

export function bodyCondition(sessions: Session[], equipment: Exercise[], now: number) {
  const targets = new Map(equipment.map(exercise => [exercise.id, exercise.muscles]));
  const sets = completedSets(sessions, now);
  return allMuscles.map(muscle => {
    let score = 0;
    let lastTrained: number | null = null;
    for (const set of sets) {
      if (!targets.get(set.id)?.includes(muscle)) continue;
      lastTrained = Math.max(lastTrained ?? 0, set.timestamp);
      const age = calendarDay(now) - calendarDay(set.timestamp);
      score += Math.max(0, 1 - age / GLOW_FADE_DAYS);
    }
    // One set is a light glow; additional sets brighten it without a hard cap.
    const level = 1 - Math.exp(-score / 4);
    return { muscle, score, level, lastTrained, daysSince: lastTrained === null ? null : calendarDay(now) - calendarDay(lastTrained) };
  }).sort((a, b) => a.score - b.score || (a.lastTrained ?? 0) - (b.lastTrained ?? 0));
}
