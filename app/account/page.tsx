'use client';
import Link from 'next/link';
import Brand from '@/components/brand';
import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Camera, Check, ChevronDown, Download, Dumbbell, KeyRound, LogOut, Mail, Settings2, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { authClient } from '@/lib/auth-client';
import { loadAccountTraining, saveAccountTraining } from '@/lib/training-api';
import { readTraining, parseTraining } from '@/lib/machine-training';
import { trainingKey } from '@/lib/training-sync';
import '@/components/auth.css';
import './account.css';

function ProfileEditor() {
  const auth = useAuth();
  const user = auth.user!;
  const [name, setName] = useState(user.name ?? '');
  const [image, setImage] = useState(user.image ?? '');
  const [saved, setSaved] = useState({ name: user.name ?? '', image: user.image ?? '' });
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [message, setMessage] = useState('');
  const [failedImage, setFailedImage] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const dirty = name.trim() !== saved.name || image !== saved.image;
  const displayName = saved.name.trim() || 'Your profile';
  const initials = (name.trim() || user.email).split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();

  async function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setMessage('');
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      setMessage('Choose a JPG, PNG, WebP or AVIF photo under 10 MB.');
      return;
    }
    setReading(true);
    const url = URL.createObjectURL(file);
    try {
      const photo = new Image();
      photo.src = url;
      await photo.decode();
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Image editing unavailable');
      const size = Math.min(photo.naturalWidth, photo.naturalHeight);
      context.fillStyle = '#222227';
      context.fillRect(0, 0, 256, 256);
      context.drawImage(photo, (photo.naturalWidth - size) / 2, (photo.naturalHeight - size) / 2, size, size, 0, 0, 256, 256);
      setImage(canvas.toDataURL('image/jpeg', 0.85));
    } catch { setMessage('This photo could not be opened. Please try another.'); }
    finally { URL.revokeObjectURL(url); setReading(false); }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy || reading || !dirty || !name.trim()) return;
    setBusy(true); setMessage('');
    try {
      const { error } = await authClient.updateUser({ name: name.trim(), image: image || null });
      if (error) throw new Error(error.message || 'Could not save your profile. Please try again.');
      setSaved({ name: name.trim(), image });
      setName(name.trim());
      setMessage('Profile updated.');
      await auth.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save your profile. Please try again.'); }
    finally { setBusy(false); }
  }

  return <form className="account-profile account-surface" onSubmit={save} aria-labelledby="profile-heading" data-update-blocked={dirty || reading || busy}>
    <div className="account-profile-banner"><span className="eyebrow">YOUR TRAINING SPACE</span><Dumbbell size={36} strokeWidth={1.2} aria-hidden="true"/></div>
    <div className="account-profile-body">
      <div className="account-avatar-row">
        <button className="account-avatar" type="button" onClick={() => fileInput.current?.click()} disabled={busy || reading} aria-label="Change profile photo">
          {image && image !== failedImage ? <img src={image} alt="Your profile" width={96} height={96} onError={() => setFailedImage(image)}/> : <span>{initials}</span>}
          <span className="account-avatar-camera"><Camera size={16}/></span>
        </button>
        <div className="account-photo-actions"><button type="button" className="quiet-button" onClick={() => fileInput.current?.click()} disabled={busy || reading}>{reading ? 'Preparing photo…' : 'Change photo'}</button>{image && <button type="button" onClick={() => setImage('')} disabled={busy || reading}>Remove</button>}</div>
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={choosePhoto} hidden/>
      </div>
      <h2 id="profile-heading">{displayName}</h2>
      <p className="account-profile-email">{user.email}</p>
      <div className="account-profile-fields">
        <label htmlFor="profile-name">Display name<input id="profile-name" name="name" autoComplete="name" placeholder="Your name" value={name} onChange={event => { setName(event.target.value); setMessage(''); }} maxLength={80} required disabled={busy}/></label>
        <label htmlFor="profile-email">Email address<div className="account-email-field"><Mail size={17}/><input id="profile-email" type="email" value={user.email} readOnly/></div></label>
        <p>Your name and photo make this space yours.</p>
      </div>
      <div className="account-save-row"><button className="primary-button" type="submit" disabled={busy || reading || !dirty || !name.trim()}>{busy ? 'Saving…' : 'Save changes'}<Check size={17}/></button>{dirty && <span>Unsaved changes</span>}</div>
      {message && <p className="account-feedback" role="status">{message}</p>}
    </div>
  </form>;
}

export default function AccountPage() {
  const auth = useAuth();
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [email, setEmail] = useState('');
  async function signOut() {
    const client = authClient; if (!auth.configured || busy) return;
    setBusy(true); setMessage('');
    try {
      const { error } = await client.signOut();
      if (error) throw new Error(error.message);
      try { localStorage.removeItem('liftide:neon-user'); } catch {}
      await auth.refresh();
      window.location.assign('/');
    } catch { setMessage('Could not sign out. Please try again.'); }
    finally { setBusy(false); }
  }
  async function copyDeviceWorkouts() {
    if (!auth.configured || !auth.user || busy) return;
    setBusy(true); setMessage('');
    try {
      const key = trainingKey(auth.user.id);
      const cache = localStorage.getItem(key);
      const existing = await loadAccountTraining();
      if (existing) throw new Error('Your account already has a training record. Device workouts haven’t been copied, so your account history stays intact. You can export the device copy below.');
      const payload = cache && JSON.parse(cache).dirty ? parseTraining(JSON.parse(cache).data) : readTraining();
      const revision = await saveAccountTraining(payload,0);
      if (!revision) throw new Error('Your account changed while copying. Your device workouts are still kept.');
      window.location.assign('/train');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not copy your workouts. The device copy is still kept.'); }
    finally { setBusy(false); }
  }
  function exportGuest() {
    if (!auth.user) return;
    try {
      const url = URL.createObjectURL(new Blob([JSON.stringify({ earlierWorkouts: readTraining(), earlierAccountCache: JSON.parse(localStorage.getItem(trainingKey(auth.user.id)) ?? 'null') }, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = 'liftide-device-training.json'; link.click(); URL.revokeObjectURL(url);
    } catch { setMessage('The device workouts could not be read. Your stored data has been kept.'); }
  }
  async function resend(event: FormEvent) {
    event.preventDefault(); const client = authClient; if (!auth.configured || busy) return;
    setBusy(true); setMessage('');
    try {
      const { error } = await client.sendVerificationEmail({ email: email.trim(), callbackURL: `${window.location.origin}/auth/callback` });
      if (error) throw new Error(error.message);
      setMessage('If that email has an unconfirmed account, a new confirmation link is on its way.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not send a confirmation link. Please try again.'); }
    finally { setBusy(false); }
  }
  return <main className="account-page account-screen">
    <div className="account-topbar"><Brand className="auth-brand"/><Link className="account-back" href="/train"><ArrowLeft size={16}/>Back to training</Link></div>
    <header className="account-heading"><span className="eyebrow">YOUR PROFILE</span><h1>Your account<span>.</span></h1><p>Your personal details and account security.</p></header>
    {auth.error && <p className="auth-notice" role="alert">{auth.error}</p>}
    {auth.loading ? <div className="account-surface account-loading" role="status">Loading your account…</div> : auth.user ? <>
      <div className="account-grid">
        <ProfileEditor key={auth.user.id}/>
        <div className="account-side">
          <section className="account-surface account-preferences" aria-labelledby="preferences-heading">
            <h2 id="preferences-heading">Account security</h2>
            <Link className="account-setting account-setting-link" href="/reset-password"><span className="account-setting-icon"><KeyRound size={19}/></span><div><h3>Password</h3><p>Reset your account password.</p></div><ArrowRight size={18}/></Link>
            <button className="account-setting account-logout" onClick={signOut} disabled={busy}><span className="account-setting-icon"><LogOut size={19}/></span><div><h3>{busy ? 'Please wait…' : 'Log out'}</h3><p>Sign out on this device.</p></div><ArrowRight size={18}/></button>
          </section>
          <Link className="account-surface account-settings-shortcut" href="/train?settings=app"><span className="account-setting-icon"><Settings2 size={19}/></span><div><h2>App settings</h2><p>Appearance, notifications and training data.</p></div><ArrowRight size={18}/></Link>
          <section className="account-surface account-sync" aria-labelledby="sync-heading"><span className="account-sync-icon"><ShieldCheck size={23}/></span><h2 id="sync-heading">Your training goes with you.</h2><p>Workouts, favorites and setup notes are saved to your account. Pick up where you left off on any device.</p><Link className="secondary-button" href="/train">Open training<ArrowRight size={17}/></Link><small>Equipment photos stay on this device.</small></section>
        </div>
      </div>
      <details className="account-surface account-recovery"><summary><span><Download size={18}/>Earlier device workouts</span><ChevronDown size={18}/></summary><div><p>Bring workouts from an earlier version into an empty account. Your original device copy is kept, photos are excluded, and existing account history is never overwritten.</p><div className="account-actions"><button className="secondary-button" onClick={copyDeviceWorkouts} disabled={busy}>Copy device workouts</button><button className="quiet-button" onClick={exportGuest} disabled={busy}>Export device copy<Download size={16}/></button></div></div></details>
    </> : <section className="account-surface account-guest"><span className="account-guest-icon"><UserRound size={30}/></span><h2>Your next chapter starts here.</h2><p>Log in to make Liftide yours and keep your training in one place.</p>{!auth.configured && <div className="auth-notice">Accounts will be available soon. You can browse exercises, but saving requires login.</div>}<div className="account-actions"><Link className="primary-button" href="/login">Log in<ArrowRight size={18}/></Link><Link className="secondary-button" href="/signup">Create account</Link></div><details className="account-confirmation"><summary>Need a new confirmation email?</summary><form onSubmit={resend}><label className="auth-field" htmlFor="resend-email">Email address<input id="resend-email" type="email" autoComplete="email" value={email} onChange={event=>setEmail(event.target.value)} required/></label><button className="secondary-button" disabled={busy || !auth.configured} type="submit">Resend confirmation</button></form></details></section>}
    {message && <p className="auth-notice" role="status">{message}</p>}
    <footer className="account-footer"><ShieldCheck size={14}/><span>Your account. Your training. Your pace.</span></footer>
  </main>;
}
