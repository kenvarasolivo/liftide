'use client';

import Link from 'next/link';
import Brand from '@/components/brand';
import { ThemeToggle } from '@/components/theme-provider';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { useAuth } from './auth-provider';
import './auth.css';

type Mode = 'login' | 'signup' | 'forgot' | 'reset';
const copy = {
  login: { eyebrow: 'WELCOME BACK', title: 'Log in', text: 'Your sets, your progress, your next chapter.', action: 'Log in' },
  signup: { eyebrow: 'YOUR NEXT CHAPTER', title: 'Create account', text: 'Create an account to keep your training with you.', action: 'Create account' },
  forgot: { eyebrow: 'LET’S GET YOU BACK IN', title: 'Reset your password.', text: 'We’ll send a link to the email you use for Liftide.', action: 'Send reset link' },
  reset: { eyebrow: 'A FRESH START', title: 'Choose a new password.', text: 'Use at least 8 characters to keep your account secure.', action: 'Save password' },
};

export default function AuthForm({ mode }: { mode: Mode }) {
  const auth = useAuth(), router = useRouter(), content = copy[mode];
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [confirm, setConfirm] = useState(''), [name, setName] = useState('');
  const [visible, setVisible] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [success, setSuccess] = useState('');

  const [resetToken,setResetToken] = useState(''), [currentPassword,setCurrentPassword] = useState('');
  useEffect(() => {
    // Neon permits localhost for local auth, but rejects the loopback IP.
    // Navigate the browser so cookies and callback URLs use the accepted origin.
    if (process.env.NODE_ENV === 'development' && window.location.hostname === '127.0.0.1') {
      const url = new URL(window.location.href);
      url.hostname = 'localhost';
      window.location.replace(url.href);
    }
  }, []);
  useEffect(() => { if(mode === 'reset') setResetToken(new URLSearchParams(window.location.search).get('token') ?? ''); },[mode]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const client = authClient;
    if (!auth.configured || busy) return;
    setError('');
    if ((mode === 'signup' || mode === 'reset') && password !== confirm) { setError('Your passwords don’t match.'); return; }
    setBusy(true);
    try {
      if (mode === 'login') {
        const { error } = await client.signIn.email({ email: email.trim(), password });
        if (error) throw new Error(error.message);
        await auth.refresh();
        router.replace('/train');
      } else if (mode === 'signup') {
        const { data, error } = await client.signUp.email({ email: email.trim(), password, name: name.trim(), callbackURL: `${window.location.origin}/auth/callback` });
        if (error) throw new Error(error.message);
        await auth.refresh();
        if (data?.token) router.replace('/train');
        else setSuccess('Check your email for a confirmation link. After confirming, you can log in and start training.');
      } else if (mode === 'forgot') {
        const { error } = await client.requestPasswordReset({ email: email.trim(), redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw new Error(error.message);
        setSuccess('If there’s an account for that email, a password reset link is on its way.');
      } else {
        if (!resetToken && !auth.user) throw new Error('Open the reset link from your email to choose a new password.');
        const { error } = resetToken ? await client.resetPassword({ newPassword: password, token: resetToken }) : await client.changePassword({ newPassword: password, currentPassword, revokeOtherSessions: true });
        if (error) throw new Error(error.message);
        if(resetToken) window.history.replaceState(null,'','/reset-password');
        setPassword(''); setConfirm(''); setSuccess('Your password has been updated. You’re ready to train.');
      }
    } catch (error) { setError(error instanceof Error ? error.message : 'Something went wrong. Please try again.'); }
    finally { setBusy(false); }
  }

  return <div className="auth-page"><div className="auth-visual"><Brand className="auth-brand"/></div><main className="auth-main"><div className="auth-topbar"><Link className="auth-back" href="/"><ArrowLeft size={16}/>Back to Liftide</Link><ThemeToggle/></div><div className="auth-card"><h1>{content.title}</h1>{mode !== 'login' && <p className="auth-description">{content.text}</p>}
    {!auth.configured && <div className="auth-notice" role="status">Account sign-in is currently unavailable. You can browse exercises; saving requires an account.</div>}
    {auth.error && <p className="auth-error" role="alert">{auth.error}</p>}
    {success ? <div className="auth-success" role="status"><CheckCircle2 size={30}/><h2>{mode === 'reset' ? 'You’re all set.' : 'Check your inbox.'}</h2><p>{success}</p><Link className="primary-button" href={mode === 'reset' && auth.user ? '/train' : '/login'}>{mode === 'reset' && auth.user ? 'Back to training' : 'Back to login'}<ArrowRight size={18}/></Link></div> : auth.user && (mode === 'login' || mode === 'signup') ? <div className="auth-success"><p>You’re signed in as {auth.user.email}.</p><Link className="primary-button" href="/train">Continue training<ArrowRight size={18}/></Link><Link className="auth-inline-link" href="/account">Manage account</Link></div> : <form onSubmit={submit}>
      {mode === 'signup' && <label className="auth-field" htmlFor="auth-name">Your name<input id="auth-name" name="name" autoComplete="name" value={name} onChange={e => setName(e.target.value)} maxLength={30} placeholder="What should we call you?" required disabled={busy}/></label>}
      {mode !== 'reset' && <label className="auth-field" htmlFor="auth-email">Email address<input id="auth-email" name="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required maxLength={254} disabled={busy}/></label>}
      {mode === 'reset' && auth.user && !resetToken && <label className="auth-field" htmlFor="auth-current-password">Current password<input id="auth-current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} required disabled={busy}/></label>}
      {(mode === 'login' || mode === 'signup' || mode === 'reset') && <><label className="auth-field" htmlFor="auth-password">{mode === 'reset' ? 'New password' : 'Password'}<span className="password-input"><input id="auth-password" aria-label={mode === 'reset' ? 'New password' : 'Password'} name="password" type={visible ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={e => setPassword(e.target.value)} required minLength={mode === 'login' ? 1 : 8} maxLength={128} placeholder={mode === 'login' ? 'Enter your password' : 'At least 8 characters'} disabled={busy}/><button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible}>{visible ? <EyeOff size={19}/> : <Eye size={19}/>}</button></span></label>{(mode === 'signup' || mode === 'reset') && <label className="auth-field" htmlFor="auth-confirm">Confirm password<input id="auth-confirm" name="confirm" type={visible ? 'text' : 'password'} autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={8} maxLength={128} disabled={busy}/></label>}</>}
      {mode === 'login' && <Link className="auth-forgot" href="/forgot-password">Forgot your password?</Link>}
      {mode === 'reset' && !auth.loading && !auth.user && !resetToken && <p className="auth-error">Open the reset link in your email first. <Link href="/forgot-password">Request a new link.</Link></p>}
      {error && <p className="auth-error" role="alert">{error}</p>}
      <button className="primary-button auth-submit" type="submit" disabled={busy || auth.loading || !auth.configured || (mode === 'reset' && !auth.user && !resetToken)}>{busy ? 'Please wait…' : content.action}<ArrowRight size={18}/></button>
    </form>}
    <p className="auth-switch">{mode === 'login' ? <>New here? <Link href="/signup">Create an account</Link></> : mode === 'signup' ? <>Already have an account? <Link href="/login">Log in</Link></> : <Link href="/login">Back to login</Link>}</p><div className="auth-divider"><span>or explore first</span></div><Link className="secondary-button auth-guest" href="/train">Browse exercises<ArrowRight size={17}/></Link><p className="auth-privacy"><ShieldCheck size={15}/>Your workouts stay yours.</p>
  </div></main></div>;
}
