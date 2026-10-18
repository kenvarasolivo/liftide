import { allMuscles, exercises, type Exercise, type Muscle, type Session, totalSets } from './training';
import { equipmentPhotos } from './equipment-photos';

export type CustomMachine = Exercise & { photoId: string };
export type Rest = { exerciseId: string; endAt: number | null; paused: number | null; duration: number; complete: boolean };
export type Draft = { weight: string; reps: string };
export type MuscleTargets = { muscles: Muscle[]; secondary: Muscle[] };
export type TrainingData = {
  version: 2;
  appliedChanges?: string[];
  legacyImports?: string[];
  history: Session[];
  current: Session | null;
  selectedId: string | null;
  rest: Rest | null;
  drafts: Record<string, Draft>;
  setups: Record<string, string>;
  labels: Record<string, string>;
  restPreferences: Record<string, number>;
  muscleTargets: Record<string, MuscleTargets>;
  favorites: string[];
  customMachines: CustomMachine[];
  name: string;
};
export const STORAGE_KEY = 'liftide-v2';
export const emptyData: TrainingData = { version: 2, history: [], current: null, selectedId: null, rest: null, drafts: {}, setups: {}, labels: {}, restPreferences: {}, muscleTargets: {}, favorites: [], customMachines: [], name: '' };
export const categories = ['All machines', 'Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core'] as const;
export type Category = typeof categories[number];
export function category(e: Exercise): Category {
  const first = e.muscles[0];
  if (['Upper chest', 'Chest'].includes(first)) return 'Chest';
  if (['Lats', 'Upper back', 'Lower back'].includes(first)) return 'Back';
  if (['Biceps', 'Triceps'].includes(first)) return 'Arms';
  if (['Quads', 'Glutes', 'Hamstrings', 'Calves', 'Inner thighs'].includes(first)) return 'Legs';
  return first === 'Abs' ? 'Core' : 'Shoulders';
}
export function defaultPhoto(e: Exercise): string {
  const id = 'photoId' in e ? String(e.photoId) : e.id;
  if (equipmentPhotos[id]) return equipmentPhotos[id];
  if (e.illustration) return `/equipment/illustrations/${e.illustration}.svg`;
  return `/equipment/${['triceps','abs'].includes(id) ? 'cable' : id}.webp`;
}
export function lastSet(data: TrainingData, id: string) {
  const live = data.current?.sets[id]?.filter(s => s.done).at(-1);
  if (live) return live;
  return data.history.find(s => s.sets[id]?.some(x => x.done))?.sets[id].filter(s => s.done).at(-1);
}
export function getDraft(data: TrainingData, e: Exercise): Draft {
  return data.drafts[e.id] ?? { weight: String(lastSet(data,e.id)?.weight ?? e.weight), reps: String(lastSet(data,e.id)?.reps ?? e.reps) };
}
function validSession(value: unknown): value is Session {
  if (!value || typeof value !== 'object') return false;
  const s = value as Session;
  return typeof s.id === 'string' && typeof s.routine === 'string' && Number.isFinite(s.started) && record(s.sets) && Object.values(s.sets).every(sets => Array.isArray(sets) && sets.every(x => x && Number.isFinite(x.weight) && x.weight >= 0 && Number.isFinite(x.reps) && x.reps >= 0 && typeof x.done === 'boolean' && (x.loggedAt === undefined || (Number.isFinite(x.loggedAt) && x.loggedAt >= 0))));
}
function record(value: unknown): value is Record<string, unknown> { return Boolean(value && typeof value === 'object' && !Array.isArray(value)); }
function muscles(value: unknown): value is Muscle[] { return Array.isArray(value) && value.every(m => allMuscles.includes(m)); }
export function parseTraining(value: unknown): TrainingData {
  const saved = value as TrainingData;
  const invalid = () => { throw new Error('Invalid workout data'); };
  if (!record(saved) || saved.version !== 2 || !Array.isArray(saved.history) || !saved.history.every(validSession) || (saved.current && !validSession(saved.current))) invalid();
  for (const key of ['drafts','setups','labels','restPreferences','muscleTargets'] as const) if(saved[key] !== undefined && !record(saved[key])) invalid();
  if (saved.legacyImports !== undefined && (!Array.isArray(saved.legacyImports) || !saved.legacyImports.every(id => typeof id === 'string' && id.length <= 100))) invalid();
  if (saved.appliedChanges !== undefined && (!Array.isArray(saved.appliedChanges) || saved.appliedChanges.length > 256 || !saved.appliedChanges.every(id => typeof id === 'string' && id.length <= 100))) invalid();
  if (saved.name !== undefined && typeof saved.name !== 'string') invalid();
  if (saved.selectedId !== undefined && saved.selectedId !== null && typeof saved.selectedId !== 'string') invalid();
  if (saved.favorites !== undefined && (!Array.isArray(saved.favorites) || !saved.favorites.every(id => typeof id === 'string'))) invalid();
  if (saved.customMachines !== undefined && (!Array.isArray(saved.customMachines) || !saved.customMachines.every(e => e && typeof e.id === 'string' && typeof e.name === 'string' && typeof e.setup === 'string' && typeof e.photoId === 'string' && muscles(e.muscles) && e.muscles.length > 0 && muscles(e.secondary) && Number.isFinite(e.weight) && Number.isFinite(e.reps) && Number.isFinite(e.rest) && e.rest > 0))) invalid();
  if (saved.drafts && !Object.values(saved.drafts).every(d => d && typeof d.weight === 'string' && typeof d.reps === 'string')) invalid();
  for (const key of ['setups','labels'] as const) if (saved[key] && !Object.values(saved[key]).every(v => typeof v === 'string')) invalid();
  if (saved.restPreferences && !Object.values(saved.restPreferences).every(v => Number.isFinite(v) && v > 0)) invalid();
  if (saved.muscleTargets && !Object.values(saved.muscleTargets).every(v => v && muscles(v.muscles) && v.muscles.length > 0 && muscles(v.secondary))) invalid();
  if (saved.rest && !(typeof saved.rest.exerciseId === 'string' && Number.isFinite(saved.rest.duration) && saved.rest.duration > 0 && (saved.rest.endAt === null || Number.isFinite(saved.rest.endAt)) && (saved.rest.paused === null || Number.isFinite(saved.rest.paused)) && typeof saved.rest.complete === 'boolean')) invalid();
  return { ...emptyData, ...saved };
}
export function readTraining(): TrainingData {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    return parseTraining(JSON.parse(raw));
  }
  const legacy = localStorage.getItem('liftide-v1');
  if (!legacy) return { ...emptyData };
  const saved = JSON.parse(legacy);
  const legacyCurrent: unknown = saved.current;
  const current: Session | null = validSession(legacyCurrent) && totalSets(legacyCurrent) > 0 ? { ...legacyCurrent, sets: Object.fromEntries(Object.entries(legacyCurrent.sets).map(([id, sets]) => [id, sets.filter(x => x.done)])) } : null;
  return { ...emptyData, history: Array.isArray(saved.history) ? saved.history.filter(validSession) : [], current, setups: saved.setups ?? {}, name: typeof saved.name === 'string' ? saved.name : '' };
}
export function equipmentFor(data: TrainingData): Exercise[] {
  return [...exercises, ...data.customMachines].map(e => data.muscleTargets[e.id] ? { ...e, ...data.muscleTargets[e.id] } : e);
}
export function muscleCount(data: TrainingData, muscle: Muscle, now: number): number {
  const equipment = equipmentFor(data);
  return [...data.history.filter(s => s.started >= now - 7 * 86400000), ...(data.current ? [data.current] : [])].reduce((total, session) => total + Object.entries(session.sets).reduce((sum,[id,sets]) => sum + (equipment.find(e => e.id === id)?.muscles.includes(muscle) ? sets.filter(s => s.done).length : 0), 0), 0);
}
export const isRear = (muscle: Muscle) => ['Lats','Upper back','Lower back','Glutes','Hamstrings'].includes(muscle);
export const formatNumber = (n: number) => new Intl.NumberFormat('en-GB',{maximumFractionDigits:1}).format(n);
export const formatTime = (n: number) => `${Math.floor(n / 60).toString().padStart(2,'0')}:${Math.floor(n % 60).toString().padStart(2,'0')}`;
export const formatDate = (n: number) => new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',timeZone:'Europe/Berlin'}).format(n);
