'use client';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import '@/components/auth.css';
export default function AuthCallbackPage() {
  const { user, loading, error } = useAuth();
  return <main className="account-page"><Link className="auth-brand" href="/">liftide<span>.</span></Link><section className="account-card"><span className="eyebrow">YOUR ACCOUNT</span><h1>{loading ? 'Confirming your account…' : user ? 'You’re ready to train.' : 'Let’s get you signed in.'}</h1><p>{error || (user ? 'Your email is confirmed and your account is ready.' : 'Log in to continue. If your confirmation link expired, request another from the account page.')}</p><Link className="primary-button" href={user ? '/train' : '/login'}>{user ? 'Start training' : 'Log in'}</Link><Link className="auth-inline-link" href="/account">Resend confirmation</Link></section></main>;
}
