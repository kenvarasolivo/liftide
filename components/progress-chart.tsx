'use client';
import { TrendingUp } from 'lucide-react';
import { formatDate, formatNumber } from '@/lib/machine-training';
import type { Session } from '@/lib/training';

export default function ProgressChart({sessions,id,metric,days}:{sessions:Session[];id:string;metric:'weight'|'reps';days:number}) {
  const points = sessions.filter(s => s.started >= Date.now() - days * 86400000 && s.sets[id]?.some(x => x.done)).sort((a,b) => a.started - b.started).map(s => ({ date:s.started, value:Math.max(...s.sets[id].filter(x => x.done).map(x => x[metric])) }));
  if (!points.length) return <div className="empty-chart"><span className="empty-icon"><TrendingUp size={30}/></span><h3>Your progress starts with one set.</h3><p>Log this machine to see your strength over time.</p></div>;
  const low = Math.max(0,Math.min(...points.map(p => p.value)) - (metric === 'weight' ? 10 : 3));
  const high = Math.max(...points.map(p => p.value)) + (metric === 'weight' ? 5 : 3);
  const x = (i:number) => points.length === 1 ? 330 : 65 + i / (points.length - 1) * 560;
  const y = (v:number) => 225 - (v - low) / (high - low) * 180;
  const path = points.map((p,i) => `${i ? 'L' : 'M'}${x(i)},${y(p.value)}`).join(' ');
  return <div className="progress-chart"><svg viewBox="0 0 680 285" role="img" aria-label={`Highest ${metric === 'weight' ? 'weight in kilograms' : 'repetitions'} per session`}><defs><linearGradient id="strengthFill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#dfa06b" stopOpacity=".2"/><stop offset="1" stopColor="#dfa06b" stopOpacity="0"/></linearGradient></defs>{[0,1,2,3].map(i => { const value = low + (high - low)*i/3; return <g key={i}><path d={`M65 ${y(value)}H630`} stroke="#34363a" strokeDasharray="3 5"/><text x="8" y={y(value)+5} fill="#a8a9ac" fontSize="14">{formatNumber(value)}</text></g> })}<path d={`${path} L${x(points.length-1)},230 L${x(0)},230Z`} fill="url(#strengthFill)"/><path d={path} fill="none" stroke="#e6ae7d" strokeWidth="3"/>{points.map((point,i) => <g key={`${point.date}-${i}`}><circle cx={x(i)} cy={y(point.value)} r="5" fill="#edb889" stroke="#3b2c23" strokeWidth="3"/><title>{`${formatDate(point.date)}: ${point.value} ${metric === 'weight' ? 'kg' : 'reps'}`}</title>{(points.length<7 || i===0 || i===points.length-1 || i%Math.ceil(points.length/5)===0) && <text x={x(i)} y="269" fontSize="13" textAnchor="middle" fill="#a8a9ac">{formatDate(point.date)}</text>}</g>)}</svg></div>;
}
