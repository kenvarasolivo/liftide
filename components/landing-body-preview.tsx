'use client';

import { useState } from 'react';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import BodyMap from './body-map';
import { allMuscles, type Muscle } from '@/lib/training';

const activity: Partial<Record<Muscle, number>> = {
  Chest: .88, 'Upper chest': .72, Shoulders: .64, Triceps: .58, Biceps: .35,
  Abs: .22, Quads: .16, Calves: .12, 'Upper back': .7, Lats: .65,
  'Lower back': .25, Glutes: .18, Hamstrings: .12,
};
const weeklyMuscles: Muscle[] = ['Chest', 'Upper chest', 'Shoulders', 'Triceps', 'Upper back', 'Lats', 'Biceps', 'Abs'];

export default function LandingBodyPreview() {
  const [view, setView] = useState<'condition' | 'progress'>('condition');
  const [back, setBack] = useState(false);
  const condition = view === 'condition';

  return <div className="landing-body-preview">
    <div className="preview-topline"><span><i/> YOUR TRAINING, CONNECTED</span><span className="preview-example">Interactive example</span></div>
    <div className="preview-title"><div><span className="landing-kicker">THE BIGGER PICTURE</span><h2>{condition ? 'Body condition' : 'Body progress'}</h2></div><Sparkles size={22}/></div>
    <div className="preview-switch" role="group" aria-label="Example body screen"><button type="button" aria-pressed={condition} onClick={() => setView('condition')}>Condition</button><button type="button" aria-pressed={!condition} onClick={() => setView('progress')}>Weekly progress</button></div>
    <div className="preview-body-content">
      <div className="preview-body-stage"><div className="preview-body-grid" aria-hidden="true"/><BodyMap back={back} active={weeklyMuscles} worked={[]} levels={condition ? activity : undefined} readOnly onSelect={() => {}} description={condition ? 'Example recent activity. Chest and upper back glow brightly; legs have less recent activity.' : 'Example week with eight muscles trained, highlighted on the body.'}/><div className="preview-orientation" role="group" aria-label="Example body orientation"><button type="button" aria-pressed={!back} onClick={() => setBack(false)}>Front</button><button type="button" aria-pressed={back} onClick={() => setBack(true)}>Back</button></div></div>
      <div className="preview-body-insights" aria-live="polite"><span className="landing-kicker">{condition ? 'RECENT ACTIVITY' : 'THIS WEEK'}</span><div className="preview-highlight"><strong>{condition ? 'Every set' : '24 sets'}<br/><em>{condition ? 'leaves a glow.' : 'of showing up.'}</em></strong><p>{condition ? 'See what you’ve trained. Spot what needs attention.' : '8 muscles trained. 3 sessions logged. One clear overview.'}</p></div>{condition ? <div className="preview-muscle-list">{[{name:'Chest',detail:'Trained today',level:88},{name:'Upper back',detail:'Trained yesterday',level:70},{name:'Quads',detail:'Trained 5 days ago',level:16}].map(m=><div key={m.name}><span><strong>{m.name}</strong><small>{m.detail}</small></span><span className="preview-mini-track"><i style={{width:`${m.level}%`}}/></span></div>)}</div> : <div className="preview-week-stats"><div><strong>8 <small>/ {allMuscles.length}</small></strong><span>muscles trained</span></div><div><strong>8,640 <small>kg</small></strong><span>training volume</span></div></div>}<div className="preview-next"><ArrowUpRight size={17}/><span>{condition ? 'A little more attention to legs next?' : 'Your effort, made visible.'}</span></div></div>
    </div>
    <div className="preview-bottom"><span className="preview-glow-key"><i/>{condition ? 'Less recent' : 'No sets'}<b/>{condition ? 'More recent' : 'Trained'}</span><span>Sample training data</span></div><p className="preview-model-note">{condition ? 'Glow reflects logged activity and fades over 7 days. It isn’t a recovery measurement.' : 'Progress counts completed primary sets. This week runs Monday to Sunday.'}</p>
  </div>;
}
