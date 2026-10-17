import { allMuscles, totalSets, volume, type Exercise, type Session } from './training';

export type SharePeriod = 'today' | 'week';

export function sharePeriodRange(period: SharePeriod, now: number) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (period === 'week') start.setDate(start.getDate() - (start.getDay() + 6) % 7);
  const end = new Date(start);
  end.setDate(end.getDate() + (period === 'week' ? 7 : 1));
  return { start, end };
}

export function trainingShareSummary(sessions: Session[], equipment: Exercise[], period: SharePeriod, now: number) {
  const { start, end } = sharePeriodRange(period, now);
  // Sets have no individual timestamp, so a workout belongs to its start date.
  const included = sessions.filter(s => !s.demo && s.started >= +start && s.started < +end);
  const ids = new Set(included.flatMap(s => Object.entries(s.sets).filter(([, sets]) => sets.some(set => set.done)).map(([id]) => id)));
  const primary = new Set(equipment.filter(e => ids.has(e.id)).flatMap(e => e.muscles));
  const secondary = new Set(equipment.filter(e => ids.has(e.id)).flatMap(e => e.secondary));
  return {
    sets: included.reduce((sum, s) => sum + totalSets(s), 0),
    kg: included.reduce((sum, s) => sum + volume(s), 0),
    muscles: allMuscles.filter(m => primary.has(m)),
    secondary: allMuscles.filter(m => !primary.has(m) && secondary.has(m)),
  };
}

export async function transparentPng(svg: SVGSVGElement): Promise<Blob> {
  const source = new XMLSerializer().serializeToString(svg);
  const url = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Unable to render your sticker.'));
      image.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1200;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image export is unavailable.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Unable to export your sticker.')), 'image/png'));
  } finally {
    URL.revokeObjectURL(url);
  }
}
