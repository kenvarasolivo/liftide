'use client';
import { useState } from 'react';
import { ArrowLeft, ArrowRight, TrendingUp } from 'lucide-react';
import { formatDate, formatNumber } from '@/lib/machine-training';
import { progressPoints, relativeChange, type ProgressMetric } from '@/lib/progress';
import type { Session } from '@/lib/training';

export default function ProgressChart({sessions,id,days}:{sessions:Session[];id:string;days:number}) {
  const [metric,setMetric] = useState<ProgressMetric>('volume');
  const [inspectedId,setInspectedId] = useState<string | null>(null);
  const points = progressPoints(sessions,id,days,Date.now());
  const index = Math.max(0,inspectedId && points.some(p => p.id === inspectedId) ? points.findIndex(p => p.id === inspectedId) : points.length-1);
  const point = points[index];
  const previous = points[index-1];
  const change = previous && point ? relativeChange(point[metric],previous[metric]) : null;
  const unit = metric === 'reps' ? 'reps' : metric === 'volume' ? 'kg lifted' : 'kg';
  const metricName = metric === 'volume' ? 'Training volume' : metric === 'weight' ? 'Heaviest set' : 'Highest rep count';
  const description = metric === 'volume' ? 'Weight × reps, added across every saved set.' : metric === 'weight' ? 'The highest weight you logged in each session.' : 'The highest rep count you logged in one set per session.';
  const desiredStep = Math.max(1,...points.map(p => p[metric])) * 1.05 / 3;
  const magnitude = 10 ** Math.floor(Math.log10(desiredStep));
  const step = ([1,2,2.5,5,10].find(n => n >= desiredStep / magnitude) ?? 10) * magnitude;
  const high = step * 3;
  const x = (i:number) => points.length === 1 ? 340 : 76 + i / (points.length - 1) * 550;
  const y = (value:number) => 220 - value / high * 175;
  const path = points.map((p,i) => `${i ? 'L' : 'M'}${x(i)},${y(p[metric])}`).join(' ');
  const compact = (value:number) => new Intl.NumberFormat('en-GB',{notation:'compact',maximumFractionDigits:1}).format(value);

  return <>
    <div className="progress-metric-tabs segmented" aria-label="Progress metric">
      {(['volume','weight','reps'] as const).map(m => <button key={m} className={metric===m?'selected':''} aria-pressed={metric===m} onClick={()=>setMetric(m)}>{m==='volume'?'Overview':m==='weight'?'Weight':'Reps'}</button>)}
    </div>
    <div className="volume-heading"><span>{metricName}</span><strong>{point ? formatNumber(point[metric]) : '—'}<small>{unit}</small></strong><p>{description}</p>
      {point && <div className="volume-context"><span>{point.ongoing?'Current session':index===points.length-1?'Latest session':'Selected session'} · {formatDate(point.date)}</span>{change!==null ? <span className="volume-change">{change>0?'+':''}{formatNumber(change)}% vs previous session</span> : previous ? <span>No percentage baseline yet</span> : <span>First session in this period</span>}</div>}
    </div>
    {!points.length ? <div className="empty-chart"><span className="empty-icon"><TrendingUp size={30}/></span><h3>Your progress starts with one set.</h3><p>Log this machine to see your training over time.</p></div> : <>
      <div className="progress-chart"><svg viewBox="0 0 680 280" role="group" aria-label={`${metricName} per session. Select a point to see its details.`}>
        <defs><linearGradient id="strengthFill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#dfa06b" stopOpacity=".22"/><stop offset="1" stopColor="#dfa06b" stopOpacity="0"/></linearGradient></defs>
        {[0,1,2,3].map(i => { const value=high*i/3;return <g key={i}><path d={`M76 ${y(value)}H630`} stroke="#34363a" strokeDasharray="3 5"/><text x="8" y={y(value)+5} fill="#a8a9ac" fontSize="14">{compact(value)}</text></g>; })}
        <path d={`${path} L${x(points.length-1)},220 L${x(0)},220Z`} fill="url(#strengthFill)"/><path d={path} fill="none" stroke="#e6ae7d" strokeWidth="3"/>
        {points.map((p,i) => <g className="chart-point" key={p.id} role="button" tabIndex={0} aria-label={`Session ${i+1}, ${formatDate(p.date)}: ${formatNumber(p[metric])} ${unit}, ${p.sets} ${p.sets===1?'set':'sets'} and ${p.totalReps} total reps${p.ongoing?', in progress':''}`} aria-pressed={index===i} onClick={()=>setInspectedId(p.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setInspectedId(p.id);}}}>
          <circle className="chart-point-hit" cx={x(i)} cy={y(p[metric])} r="20" fill="transparent"/>{index===i&&<circle cx={x(i)} cy={y(p[metric])} r="12" fill="#e6ae7d" fillOpacity=".15"/>}<circle className="chart-point-dot" cx={x(i)} cy={y(p[metric])} r={index===i?6:5} fill="#edb889" stroke="#3b2c23" strokeWidth="3"/>
          <title>{`${formatDate(p.date)}: ${formatNumber(p[metric])} ${unit}`}</title>{(points.length<7||i===0||i===points.length-1||i%Math.ceil(points.length/5)===0)&&<text x={x(i)} y="264" fontSize="13" textAnchor="middle" fill="#a8a9ac">{formatDate(p.date)}</text>}
        </g>)}
      </svg></div>
      <div className="chart-session-controls"><button className="icon-button" aria-label="Previous chart session" disabled={index===0} onClick={()=>setInspectedId(points[index-1].id)}><ArrowLeft size={18}/></button><p>Session {index+1} of {points.length}{point.ongoing?' · in progress':''}</p><button className="icon-button" aria-label="Next chart session" disabled={index===points.length-1} onClick={()=>setInspectedId(points[index+1].id)}><ArrowRight size={18}/></button></div>
      <div className="volume-breakdown" aria-label="Selected session breakdown"><div><span>Sets</span><strong>{point.sets}</strong></div><div><span>Total reps</span><strong>{point.totalReps}</strong></div><div><span>Average weight</span><strong>{formatNumber(point.averageWeight)}<small> kg</small></strong></div></div>
    </>}
    {points.length>0&&<p className="chart-note">Each point is one session on this machine. Tap a point or use the arrows to explore.</p>}
    {metric==='volume'&&<details className="volume-explainer"><summary>How the overview works</summary><p>50 kg × 10 reps × 3 sets = 1,500 kg lifted. When your sets differ, we add each set’s weight × reps.</p><p>More volume means more work logged, not necessarily more strength. Compare the same machine with similar technique.{point?.volume===0?' For zero-weight sets, use the Reps view.':''}</p></details>}
  </>;
}
