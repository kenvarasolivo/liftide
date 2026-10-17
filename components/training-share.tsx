'use client';

import { useEffect, useRef, useState } from 'react';
import { Copy, Download, Share2 } from 'lucide-react';
import BodyMap from './body-map';
import { equipmentFor, type TrainingData } from '@/lib/machine-training';
import { sharePeriodRange, trainingShareSummary, transparentPng, type SharePeriod } from '@/lib/training-share';
import './training-share.css';

export default function TrainingShare({ data }: { data: TrainingData }) {
  const [period, setPeriod] = useState<SharePeriod>('today');
  const [style, setStyle] = useState<'map' | 'volume'>('map');
  const [prepared, setPrepared] = useState<{ key: string; file: File } | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const svg = useRef<SVGSVGElement>(null);
  const now = Date.now();
  const summary = trainingShareSummary([...data.history, ...(data.current ? [data.current] : [])], equipmentFor(data), period, now);
  const date = new Date(now).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  const { start, end } = sharePeriodRange(period, now);
  const lastDay = new Date(end);
  lastDay.setDate(lastDay.getDate() - 1);
  const dateRange = period === 'today' ? date : `${start.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} – ${lastDay.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`;
  const kg = summary.kg.toLocaleString(undefined, { maximumFractionDigits: 1 });
  const key = JSON.stringify([period, style, date, summary]);
  const file = prepared?.key === key ? prepared.file : null;

  useEffect(() => {
    let cancelled = false;
    setMessage('');
    if (svg.current) transparentPng(svg.current).then(blob => {
      if (!cancelled) setPrepared({ key, file: new File([blob], `liftide-${period}-${style}.png`, { type: 'image/png' }) });
    }).catch(() => { if (!cancelled) setMessage('Could not prepare the image. Reopen sharing to try again.'); });
    return () => { cancelled = true; };
  }, [key, period, style]);

  async function copy() {
    if (!file) return;
    if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
      setMessage('Image copying is unavailable here. Download the PNG, then add it as a photo sticker in Instagram.');
      return;
    }
    setBusy(true);
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': file })]);
      setMessage('Image copied. Open Instagram Stories and paste it over your photo or video.');
    } catch {
      setMessage('Copy was blocked by your browser. Download the PNG to add it as a photo sticker.');
    } finally { setBusy(false); }
  }

  function download() {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    setMessage('PNG downloaded. In Instagram Stories, add it with the photo sticker.');
  }

  async function share() {
    if (!file) return;
    if (!navigator.canShare?.({ files: [file] })) {
      setMessage('File sharing is unavailable here. Use Copy image or Download PNG.');
      return;
    }
    setBusy(true);
    try {
      await navigator.share({ files: [file] });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) setMessage('Sharing failed. Try Copy image or Download PNG.');
    } finally { setBusy(false); }
  }

  return <section className="training-share">
    <h2>Share training</h2>
    <div className="share-options">
      <div className="segmented" aria-label="Sticker period">{(['today', 'week'] as const).map(value => <button key={value} aria-pressed={period === value} className={period === value ? 'selected' : ''} onClick={() => setPeriod(value)}>{value === 'today' ? 'Today' : 'This week'}</button>)}</div>
      <div className="segmented" aria-label="Sticker style">{(['map', 'volume'] as const).map(value => <button key={value} aria-pressed={style === value} className={style === value ? 'selected' : ''} onClick={() => setStyle(value)}>{value === 'map' ? 'Body map' : 'Total kg lifted'}</button>)}</div>
    </div>
    <div className="share-preview">
      <svg ref={svg} xmlns="http://www.w3.org/2000/svg" width="1080" height="1200" viewBox="0 0 1080 1200" role="img" aria-label={`${period === 'today' ? 'Today' : 'This week'}: ${kg} kg lifted, ${summary.sets} sets, ${summary.muscles.length} primary muscles trained`}>
        <g fontFamily="Arial, Helvetica, sans-serif" textAnchor="middle" fill="#ffffff" stroke="#17131e" strokeWidth="2" paintOrder="stroke">
          <text x="540" y="105" fontSize="32" fontWeight="700" letterSpacing="7">{period === 'today' ? 'TODAY’S WORK' : 'THIS WEEK’S WORK'}</text>
          {style === 'map' ? <>
            <svg x="150" y="155" width="390" height="650" viewBox="0 0 240 400"><BodyMap readOnly diagnostic back={false} active={summary.muscles} worked={summary.secondary} onSelect={() => {}}/></svg>
            <svg x="540" y="155" width="390" height="650" viewBox="0 0 240 400"><BodyMap readOnly diagnostic back active={summary.muscles} worked={summary.secondary} onSelect={() => {}}/></svg>
            <text x="540" y="900" fontSize="96" fontWeight="800">{summary.sets.toLocaleString()} {summary.sets === 1 ? 'SET' : 'SETS'}</text>
            <text x="540" y="965" fontSize="32">{summary.muscles.length} primary muscles trained</text>
          </> : <>
            <text x="540" y="590" fontSize={Math.min(240, 1450 / kg.length)} fontWeight="800" letterSpacing="-6">{kg}</text>
            <text x="540" y="710" fontSize="72" fontWeight="700" letterSpacing="12">KG LIFTED</text>
            <text x="540" y="815" fontSize="36">{summary.sets.toLocaleString()} {summary.sets === 1 ? 'set' : 'sets'} · Weight × reps</text>
          </>}
          <text x="540" y="1050" fontSize="28">{dateRange}</text>
          <text x="540" y="1140" fontSize="54" fontWeight="800" letterSpacing="-2">liftide.</text>
        </g>
      </svg>
    </div>
    <p className="share-hint">Transparent PNG · 1080 × 1200</p>
    {!summary.sets && <p className="share-hint">No sets logged {period === 'today' ? 'today' : 'this week'}. Log a set to make it count.</p>}
    <div className="share-actions">
      <button className="primary-button" disabled={!file || busy} onClick={copy}><Copy size={18}/>Copy image</button>
      <button className="secondary-button" disabled={!file || busy} onClick={download}><Download size={18}/>Download PNG</button>
      <button className="secondary-button" disabled={!file || busy} onClick={share}><Share2 size={18}/>Share</button>
    </div>
    <details className="share-hint"><summary>How to use your sticker</summary>
    <p>Paste into a Story, or add the downloaded PNG as a photo sticker over your photo or video. Paste support depends on your device. The preview checkerboard is not included.</p>
    <p className="share-hint">{period === 'today' ? 'Today uses your local date.' : 'This week runs Monday–Sunday in your local time.'} Workouts use their start date. Includes your open workout; sample sessions are excluded.</p>
    {style === 'volume' && <p className="share-hint">Total kg adds up logged weight × reps for completed sets, using the same volume calculation as your training history.</p>}
    </details>
    <p className="share-status" role="status">{message || (!file ? 'Preparing your sticker…' : '')}</p>
  </section>;
}
