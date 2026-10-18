'use client';

import { useId, useLayoutEffect, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { categories, category, defaultPhoto, formatDate, type Category } from '@/lib/machine-training';
import type { Exercise, Session } from '@/lib/training';
import './progress-equipment-picker.css';

type Props = {
  initialOpen?: boolean;
  equipment: Exercise[];
  photos: Record<string, string>;
  labels: Record<string, string>;
  sessions: Session[];
  selectedId: string;
  onSelect: (exercise: Exercise) => void;
};

export default function ProgressEquipmentPicker({ initialOpen = false, equipment, photos, labels, sessions, selectedId, onSelect }: Props) {
  const [open, setOpen] = useState(initialOpen);
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState<Category>('All machines');
  const [withHistory, setWithHistory] = useState(false);
  const [limit, setLimit] = useState(8);
  const panelId = useId();
  const toggle = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [panelHeight, setPanelHeight] = useState<number | null>(null);
  useLayoutEffect(() => {
    const element = panel.current;
    if (!element) return;
    const measure = () => setPanelHeight(element.getBoundingClientRect().height);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  function returnToHeading() {
    toggle.current?.focus({ preventScroll: true });
    toggle.current?.scrollIntoView({ block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }
  const selected = equipment.find(e => e.id === selectedId) ?? equipment[0];
  const lastLogged = new Map<string, number>();
  for (const session of sessions) {
    if (session.demo) continue;
    for (const [id, sets] of Object.entries(session.sets)) {
      if (sets.some(set => set.done)) lastLogged.set(id, Math.max(lastLogged.get(id) ?? 0, session.started));
    }
  }
  const matches = equipment.filter(e =>
    (group === 'All machines' || category(e) === group) &&
    (!withHistory || lastLogged.has(e.id)) &&
    `${e.name} ${labels[e.id] ?? ''} ${e.muscles.join(' ')} ${e.equipmentType ?? 'Machines'}`.toLowerCase().includes(search.trim().toLowerCase())
  ).sort((a, b) => (lastLogged.get(b.id) ?? 0) - (lastLogged.get(a.id) ?? 0));
  const photo = (e: Exercise) => photos[e.id] || defaultPhoto(e);

  return <div className="progress-picker">
    <button ref={toggle} className="progress-picker-toggle" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(!open)}>
      <img src={photo(selected)} alt=""/>
      <span><strong>{selected.name}</strong><small>{labels[selected.id] || selected.muscles.join(' · ')}</small></span>
      <span className="progress-picker-change">{open ? 'Hide exercises' : 'Change exercise'}<ChevronDown size={18}/></span>
    </button>
    <div id={panelId} className="progress-picker-reveal" data-open={open} aria-hidden={!open} inert={!open} style={{ height: open ? panelHeight ?? 'auto' : 0 }}>
    <div ref={panel} className="progress-picker-panel">
      <div className="progress-picker-tools">
        <label className="search-field"><Search size={18}/><input aria-label="Search progress exercises" placeholder="Search exercises or muscles" value={search} onChange={e => { setSearch(e.target.value); setLimit(8); }}/>{search && <button aria-label="Clear exercise search" onClick={() => { setSearch(''); setLimit(8); }}><X size={17}/></button>}</label>
        <label className="progress-group-filter"><span className="visually-hidden">Muscle group</span><select aria-label="Progress muscle group" value={group} onChange={e => { setGroup(e.target.value as Category); setLimit(8); }}>{categories.map(c => <option key={c} value={c}>{c === 'All machines' ? 'All muscles' : c}</option>)}</select></label>
        <button className="progress-history-filter" aria-pressed={withHistory} onClick={() => { setWithHistory(!withHistory); setLimit(8); }}>{withHistory && <Check size={15}/>}With history</button>
      </div>
      <div className="progress-exercise-grid" aria-label="Progress exercises">
        {matches.slice(0, limit).map(e => <button key={e.id} className="progress-exercise-tile" aria-label={`View progress for ${e.name}`} aria-pressed={e.id === selectedId} onClick={() => { onSelect(e); setOpen(false); returnToHeading(); }}>
          <img src={photo(e)} alt="" loading="lazy"/>
          <span><strong>{e.name}</strong><small>{labels[e.id] || e.muscles.join(' · ')}</small>{lastLogged.has(e.id) && <small className="progress-last-logged">{formatDate(lastLogged.get(e.id)!)}</small>}</span>
          {e.id === selectedId && <Check size={17} className="progress-picker-check"/>}
        </button>)}
      </div>
      {!matches.length && <div className="progress-picker-empty"><p>{withHistory ? 'No logged exercises match these filters.' : 'No exercises found.'}</p><button className="quiet-button" onClick={() => { setSearch(''); setGroup('All machines'); setWithHistory(false); setLimit(8); }}>Clear filters</button></div>}
      <div className="progress-picker-actions">
        {matches.length > limit && <button className="quiet-button" onClick={() => setLimit(limit + 16)}>Show more ({matches.length - limit})<ChevronDown size={16}/></button>}
        {limit > 8 && matches.length > 8 && <button className="quiet-button" onClick={() => { setLimit(8); returnToHeading(); }}>Show less<ChevronUp size={16}/></button>}
        <button className="quiet-button progress-picker-view-chart" onClick={() => { setOpen(false); returnToHeading(); }}>View chart<ChevronUp size={16}/></button>
      </div>
    </div></div>
  </div>;
}
