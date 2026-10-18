'use client';

import Link from 'next/link';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';

export function LandingAccountLinks({ footer = false }: { footer?: boolean }) {
  const { user, loading } = useAuth();
  // Keep navigation useful while restoring the session, without flashing login.
  if (loading) return <Link className={footer ? undefined : 'landing-open'} href="/train">Open training<ArrowUpRight size={16}/></Link>;
  if (footer) return <Link href={user ? '/train' : '/login'}>{user ? 'Open training' : 'Log in'}<ArrowUpRight size={15}/></Link>;
  return <>
    <Link className="landing-login" href={user ? '/account' : '/login'}>{user ? 'Profile' : 'Log in'}</Link>
    <Link className="landing-open" href={user ? '/train' : '/signup'}>{user ? 'Open training' : 'Get started'}<ArrowUpRight size={16}/></Link>
  </>;
}

export function LandingTrainingLink() {
  const { user, loading } = useAuth();
  return <Link href={user || loading ? '/train' : '/signup'} className="primary-button">{user || loading ? 'Continue training' : 'Start your training'}<ArrowRight size={19}/></Link>;
}

export function LandingAccountNote() {
  const { user, loading } = useAuth();
  return <>{loading ? 'Your next session is waiting.' : user ? 'You’re signed in. Your training is ready when you are.' : 'Browse freely. Create an account to save your training.'}</>;
}
