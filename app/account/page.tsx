'use client';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { ArrowRight, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { authClient } from '@/lib/auth-client';
import { loadAccountTraining, saveAccountTraining } from '@/lib/training-api';
import { readTraining } from '@/lib/machine-training';
import { trainingKey } from '@/lib/training-sync';
import '@/components/auth.css';

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
      window.location.assign('/login');
    } catch { setMessage('Could not sign out. Please try again.'); }
    finally { setBusy(false); }
  }
  async function copyDeviceWorkouts() {
    if (!auth.configured || !auth.user || busy) return;
    setBusy(true); setMessage('');
    try {
      const key = trainingKey(auth.user.id);
      const cache = localStorage.getItem(key);
      if (cache && JSON.parse(cache).dirty) throw new Error('This account has unsynced workouts on this device. Open training and sync them before copying device workouts.');
      const existing = await loadAccountTraining();
      if (existing) throw new Error('Your account already has a training record. Device workouts haven’t been copied, so your account history stays intact. You can export the device copy below.');
      const payload = readTraining();
      const revision = await saveAccountTraining(payload,0);
      if (!revision) throw new Error('Your account changed while copying. Your device workouts are still kept.');
      localStorage.setItem(key, JSON.stringify({ data: payload, revision, dirty: false }));
      window.location.assign('/train');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not copy your workouts. The device copy is still kept.'); }
    finally { setBusy(false); }
  }
  function exportGuest() {
    try {
      const url = URL.createObjectURL(new Blob([JSON.stringify(readTraining(), null, 2)], { type: 'application/json' }));
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
  return <main className="account-page"><Link className="auth-brand" href="/">liftide<span>.</span></Link><section className="account-card"><span className="eyebrow">YOUR PERSONAL SPACE</span><h1>Your account.</h1>
    {auth.loading ? <p role="status">Loading your account…</p> : auth.user ? <><p className="account-email">Signed in as <strong>{auth.user.email}</strong></p><div className="account-panel"><ShieldCheck size={22}/><strong> Your training, wherever you lift.</strong><p>Workouts, favorites, custom equipment and setup notes sync to your account. Uploaded photos are kept in this account’s space on this device.</p><Link className="primary-button" href="/train">Open training<ArrowRight size={18}/></Link></div><div className="account-panel"><strong>Already trained on this device?</strong><p>Copy your device-only workouts into an empty account. The original device copy is kept. Photos aren’t copied. Existing account history won’t be overwritten.</p><div className="account-actions"><button className="secondary-button" onClick={copyDeviceWorkouts} disabled={busy}>Copy device workouts</button><button className="quiet-button" onClick={exportGuest}>Export device copy</button></div></div><div className="account-actions"><Link className="secondary-button" href="/reset-password">Change password</Link><button className="secondary-button" onClick={signOut} disabled={busy}><LogOut size={17}/>Sign out of this device</button></div><p className="auth-description">Local account saves are kept for when you sign in again. Signing out opens the separate device-only training space.</p></> : <><p>Create an account to sync your training, or log in to your existing account.</p>{!auth.configured && <div className="auth-notice">Accounts will be available soon. Device-only training is ready to use.</div>}<div className="account-actions"><Link className="primary-button" href="/login">Log in<ArrowRight size={18}/></Link><Link className="secondary-button" href="/signup">Create account</Link></div><details className="account-panel"><summary>Need a new confirmation email?</summary><form onSubmit={resend}><label className="auth-field" htmlFor="resend-email">Email address<input id="resend-email" type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label><button className="secondary-button" disabled={busy || !auth.configured} type="submit">Resend confirmation</button></form></details></>}
    {message && <p className="auth-notice" role="status">{message}</p>}<Link className="auth-inline-link" href="/train">Back to training</Link>
  </section></main>;
}
