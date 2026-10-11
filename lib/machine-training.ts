import { exercises, type Exercise, type Muscle, type Session, totalSets } from './training';

export type CustomMachine = Exercise & { photoId: string };
export type Rest = { exerciseId: string; endAt: number | null; paused: number | null; duration: number; complete: boolean };
export type Draft = { weight: string; reps: string };
export type TrainingData = {
  version: 2;
  history: Session[];
  current: Session | null;
  selectedId: string | null;
  rest: Rest | null;
  drafts: Record<string, Draft>;
  setups: Record<string, string>;
  labels: Record<string, string>;
  restPreferences: Record<string, number>;
  favorites: string[];
  customMachines: CustomMachine[];
  name: string;
};
export const STORAGE_KEY = 'liftide-v2';
export const emptyData: TrainingData = { version: 2, history: [], current: null, selectedId: null, rest: null, drafts: {}, setups: {}, labels: {}, restPreferences: {}, favorites: [], customMachines: [], name: '' };
export const categories = ['All machines', 'Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core'] as const;
export type Category = typeof categories[number];
export function category(e: Exercise): Category {
  const first = e.muscles[0];
  if (['Upper chest', 'Chest'].includes(first)) return 'Chest';
  if (['Lats', 'Upper back', 'Lower back'].includes(first)) return 'Back';
  if (['Biceps', 'Triceps'].includes(first)) return 'Arms';
  if (['Quads', 'Glutes', 'Hamstrings', 'Calves'].includes(first)) return 'Legs';
  return first === 'Abs' ? 'Core' : 'Shoulders';
}
export function defaultPhoto(e: Exercise): string {
  const id = 'photoId' in e ? String(e.photoId) : e.id;
  return `/equipment/${['triceps','abs'].includes(id) ? 'cable' : id}.webp`;
}
export function lastSet(data: TrainingData, id: string) {
  const live = data.current?.sets[id]?.filter(s => s.done).at(-1);
  if (live) return live;
  return data.history.find(s => s.sets[id]?.some(x => x.done))?.sets[id].filter(s => s.done).at(-1);
}
export function getDraft(data: TrainingData, e: Exercise): Draft {
  return data.drafts[e.id] ?? { weight: String(lastSet(data,e.id)?.weight ?? e.weight), reps: String(lastSet(data,e.id)?.reps ?? 10) };
}
function validSession(value: unknown): value is Session {
  if (!value || typeof value !== 'object') return false;
  const s = value as Session;
  return typeof s.id === 'string' && Number.isFinite(s.started) && !!s.sets && typeof s.sets === 'object' && Object.values(s.sets).every(sets => Array.isArray(sets) && sets.every(x => Number.isFinite(x.weight) && x.weight >= 0 && Number.isFinite(x.reps) && x.reps >= 0 && typeof x.done === 'boolean'));
}
export function readTraining(): TrainingData {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    const saved = JSON.parse(raw) as TrainingData;
    if (saved.version !== 2 || !Array.isArray(saved.history) || !saved.history.every(validSession) || (saved.current && !validSession(saved.current))) throw new Error('Invalid workout data');
    return { ...emptyData, ...saved };
  }
  const legacy = localStorage.getItem('liftide-v1');
  if (!legacy) return { ...emptyData };
  const saved = JSON.parse(legacy);
  const legacyCurrent: unknown = saved.current;
  const current: Session | null = validSession(legacyCurrent) && totalSets(legacyCurrent) > 0 ? { ...legacyCurrent, sets: Object.fromEntries(Object.entries(legacyCurrent.sets).map(([id, sets]) => [id, sets.filter(x => x.done)])) } : null;
  return { ...emptyData, history: Array.isArray(saved.history) ? saved.history.filter(validSession) : [], current, setups: saved.setups ?? {}, name: typeof saved.name === 'string' ? saved.name : '' };
}
export function equipmentFor(data: TrainingData): Exercise[] { return [...exercises, ...data.customMachines]; }
export function muscleCount(data: TrainingData, muscle: Muscle, now: number): number {
  const equipment = equipmentFor(data);
  return [...data.history.filter(s => s.started >= now - 7 * 86400000), ...(data.current ? [data.current] : [])].reduce((total, session) => total + Object.entries(session.sets).reduce((sum,[id,sets]) => sum + (equipment.find(e => e.id === id)?.muscles.includes(muscle) ? sets.filter(s => s.done).length : 0), 0), 0);
}
export const isRear = (muscle: Muscle) => ['Lats','Upper back','Lower back','Glutes','Hamstrings'].includes(muscle);
export const formatNumber = (n: number) => new Intl.NumberFormat('en-GB',{maximumFractionDigits:1}).format(n);
export const formatTime = (n: number) => `${Math.floor(n / 60).toString().padStart(2,'0')}:${Math.floor(n % 60).toString().padStart(2,'0')}`;
export const formatDate = (n: number) => new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',timeZone:'Europe/Berlin'}).format(n);
