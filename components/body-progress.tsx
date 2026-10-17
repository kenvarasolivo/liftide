'use client';

import { useMemo, useState } from 'react';
import { ArrowRight, Plus, Share2, Sparkles } from 'lucide-react';
import BodyMap from './body-map';
import { bodyCondition, bodyProgress, GLOW_FADE_DAYS, type BodyPeriod } from '@/lib/body-progress';
import { allMuscles, type Exercise, type Muscle } from '@/lib/training';
import { equipmentFor, formatNumber, isRear, type TrainingData } from '@/lib/machine-training';
import './body-progress.css';

export type BodyView = 'progress' | 'condition';
type Props = {
  data: TrainingData;
  now: number;
  view: BodyView;
  onViewChange: (view: BodyView) => void;
  onExercise: (exercise: Exercise) => void;
  onAdd: () => void;
  onShare: () => void;
  photo: (exercise: Exercise) => string;
};

function lastTrained(days: number | null) {
  return days === null ? 'No training logged' : days === 0 ? 'Trained today' : days === 1 ? 'Trained yesterday' : `Trained ${days} days ago`;
}

export default function BodyProgress({ data, now, view, onViewChange, onExercise, onAdd, onShare, photo }: Props) {
  const [period, setPeriod] = useState<BodyPeriod>('today');
  const [back, setBack] = useState(false);
  const [muscle, setMuscle] = useState<Muscle>('Chest');
  // Recalculate at midnight and when the training record changes, rather than every timer tick.
  const day = new Date(now).toDateString();
  const metrics = useMemo(() => {
    const equipment = equipmentFor(data);
    const sessions = [...data.history, ...(data.current ? [data.current] : [])];
    return { today: bodyProgress(sessions, equipment, 'today', now), week: bodyProgress(sessions, equipment, 'week', now), condition: bodyCondition(sessions, equipment, now), equipment };
  }, [data, day]);
  const summary = metrics[period];
  const condition = view === 'condition';
  const selected = metrics.condition.find(item => item.muscle === muscle)!;
  const levels = Object.fromEntries(metrics.condition.map(item => [item.muscle, item.level]));
  const ranked = condition ? metrics.condition.map(item => item.muscle) : allMuscles;
  const suggestions = metrics.equipment.filter(exercise => exercise.muscles.includes(muscle));
  const hasTraining = metrics.condition.some(item => item.lastTrained !== null);
  function selectMuscle(next: Muscle) { setMuscle(next); setBack(isRear(next)); }

  return <section className="body-command body-progress-screen">
    <div className="page-heading body-command-heading">
      <div><h1>{condition ? 'Body condition' : 'Body progress'}</h1><p>{condition ? 'See where your training needs attention.' : 'Your training, today and across the week.'}</p></div>
      <button className="secondary-button" onClick={onShare}><Share2 size={18}/>Share</button>
    </div>
    <div className="segmented body-screen-switch" aria-label="Body screen">
      <button className={!condition ? 'selected' : ''} aria-pressed={!condition} onClick={() => onViewChange('progress')}>Progress</button>
      <button className={condition ? 'selected' : ''} aria-pressed={condition} onClick={() => onViewChange('condition')}><Sparkles size={16}/>Condition</button>
    </div>

    {!condition ? <div className="body-period-cards" aria-label="Training progress">
      {(['today', 'week'] as const).map(value => {
        const item = metrics[value];
        return <button key={value} className={`card body-period-card ${period === value ? 'selected' : ''}`} aria-pressed={period === value} onClick={() => setPeriod(value)}>
          <span className="eyebrow">{value === 'today' ? 'Today' : 'This week · Mon–Sun'}</span>
          <strong>{item.sets}<small> {item.sets === 1 ? 'set' : 'sets'} logged</small></strong>
          <span>{item.muscles.length} of {allMuscles.length} muscles trained <span aria-hidden="true">·</span> {formatNumber(item.volume)} kg volume</span>
          <span className="body-period-line" aria-hidden="true"><i style={{ width: `${item.muscles.length / allMuscles.length * 100}%` }}/></span>
        </button>;
      })}
    </div> : <section className="card body-condition-intro">
      <div><span className="eyebrow">{hasTraining ? 'Start with the dimmest' : 'Your starting point'}</span><h2>{hasTraining ? 'Bring your training into balance.' : 'Every set lights up your map.'}</h2><p>More primary sets add more glow. It fades a little each day, reaching off after {GLOW_FADE_DAYS} days without a new set.</p></div>
      <div className="body-next-muscles" aria-label="Lowest activity muscles">{metrics.condition.slice(0, 3).map(item => <button key={item.muscle} onClick={() => selectMuscle(item.muscle)}><span><strong>{item.muscle}</strong><small>{item.level === 0 ? 'Off' : 'Dim'} · {lastTrained(item.daysSince)}</small></span><ArrowRight size={18}/></button>)}</div>
    </section>}

    <div className="body-page">
      <section className="card full-body-card">
        <div className="card-heading"><div><span className="eyebrow">{condition ? 'Recent training activity' : period === 'today' ? 'Today' : 'This week'}</span><h2>{condition ? 'Your activity glow' : 'Muscle map'}</h2></div><div className="segmented" aria-label="Body view"><button className={!back ? 'selected' : ''} aria-pressed={!back} onClick={() => setBack(false)}>Front</button><button className={back ? 'selected' : ''} aria-pressed={back} onClick={() => setBack(true)}>Back</button></div></div>
        <div className={`large-body diagnostic-chamber ${condition ? 'condition-chamber' : ''}`}><div className="chamber-platform" aria-hidden="true"/><BodyMap diagnostic back={back} active={summary.muscles} worked={[]} levels={condition ? levels : undefined} selected={muscle} onSelect={setMuscle} description={condition ? undefined : `Highlighted muscles have primary sets logged ${period === 'today' ? 'today' : 'this week'}.`}/><span className="chamber-hint">Select a muscle to explore</span></div>
        {condition ? <div className="body-glow-legend"><i aria-hidden="true"/><span>Off</span><span>Light</span><span>Bright</span></div> : <div className="body-legend"><span><i/>Logged {period === 'today' ? 'today' : 'this week'}</span><span><i/>No sets logged</span></div>}
        <div className="body-selected-detail" aria-live="polite"><div><span>Selected muscle</span><strong>{muscle}</strong>{condition && <small className="body-last-trained">{lastTrained(selected.daysSince)}</small>}</div><p><strong>{condition ? `${Math.round(selected.level * 100)}%` : summary.counts[muscle]}</strong><span>{condition ? 'activity glow' : `primary sets / ${period === 'today' ? 'today' : 'this week'}`}</span></p></div>
        <p className="body-model-note">{condition ? 'Glow reflects your logged activity, not measured recovery or readiness. Use it to spot muscles you have trained less recently.' : 'Completed primary sets, including your current workout. This week starts on Monday.'}</p>
      </section>
      <div className="body-data-panels">
        <section className="card coverage-card">
          <div className="card-heading"><h2>{condition ? 'What to train next' : 'Muscle coverage'}</h2><span className="coverage-unit">{condition ? 'GLOW' : 'SETS'}</span></div>
          {condition && <p className="body-ranking-help">Lowest activity first. Select a muscle to find exercises.</p>}
          {ranked.map(name => {
            const item = metrics.condition.find(entry => entry.muscle === name)!;
            const value = condition ? Math.round(item.level * 100) : summary.counts[name];
            return <button key={name} className={`coverage-row ${muscle === name ? 'selected' : ''}`} aria-pressed={muscle === name} aria-label={`${name}, ${condition ? `${value}% activity glow, ${lastTrained(item.daysSince)}` : `${value} primary sets`}`} onClick={() => selectMuscle(name)}><span>{name}</span><span className="coverage-track"><i style={{ width: `${condition ? item.level * 100 : Math.min(100, value / 12 * 100)}%` }}/></span><strong>{condition ? (value === 0 ? 'Off' : `${value}%`) : value}</strong></button>;
          })}
          <p className="gentle-note">{condition ? 'Each primary set contributes equally. Older sets contribute less each day. Supporting muscles are not counted.' : summary.sets ? 'Primary sets in the selected period. A set can train more than one muscle.' : `No sets logged ${period === 'today' ? 'today' : 'this week'} yet. Choose a muscle below to get started.`}</p>
        </section>
        <section className="card muscle-suggestions"><span className="eyebrow">Exercises for {muscle}</span>{suggestions.length ? suggestions.map(exercise => <button key={exercise.id} onClick={() => onExercise(exercise)}><img src={photo(exercise)} alt=""/><span><strong>{exercise.name}</strong><small>Log a set</small></span><ArrowRight size={19}/></button>) : <><p>No matching exercise yet.</p><button className="secondary-button" onClick={onAdd}><Plus size={18}/>Add machine</button></>}</section>
      </div>
    </div>
    <p className="body-model-note">Sample workouts are excluded. Older logs without set times use the workout start date.</p>
  </section>;
}
