'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Check } from 'lucide-react';
import { themeStorageKey, type AccentTheme } from '@/lib/theme';

const ThemeContext = createContext({ accent: 'orange' as AccentTheme, choose: (_accent: AccentTheme) => {} });

function applyAccent(accent: AccentTheme) {
  document.documentElement.dataset.theme = 'dark';
  document.documentElement.dataset.accent = accent;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#09090b');
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [accent, setAccent] = useState<AccentTheme>('orange');
  const transition = useRef<ViewTransition | null>(null);

  useEffect(() => {
    const initial = document.documentElement.dataset.accent === 'purple' ? 'purple' : 'orange';
    setAccent(initial);
    applyAccent(initial);
    function onStorage(event: StorageEvent) {
      if (event.key !== themeStorageKey && event.key !== null) return;
      const next = event.newValue === 'purple' ? 'purple' : 'orange';
      setAccent(next);
      applyAccent(next);
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  function choose(next: AccentTheme) {
    if (next === accent && !transition.current) return;
    transition.current?.skipTransition();
    const update = () => {
      flushSync(() => setAccent(next));
      applyAccent(next);
    };
    // Crossfade the rendered gradients as well as text, icons and the logo.
    // A plain background-color transition cannot interpolate gradient images.
    if (document.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const current = document.startViewTransition(update);
      transition.current = current;
      void current.finished.catch(() => {}).finally(() => {
        if (transition.current === current) transition.current = null;
      });
    } else {
      update();
    }
    try { localStorage.setItem(themeStorageKey, next); } catch { /* The selector still works when storage is unavailable. */ }
  }

  return <ThemeContext.Provider value={{ accent, choose }}>{children}</ThemeContext.Provider>;
}

export function ThemeToggle() {
  const { accent, choose } = useContext(ThemeContext);
  return <div className="theme-toggle" role="group" aria-label="Glow color">
    {(['orange', 'purple'] as const).map(color => <button key={color} type="button" aria-label={`${color === 'orange' ? 'Orange' : 'Purple'} glow`} aria-pressed={accent === color} title={`${color === 'orange' ? 'Orange' : 'Purple'} glow`} onClick={() => choose(color)}>
      <span className={`theme-swatch theme-swatch-${color}`} aria-hidden="true">{accent === color && <Check size={13} strokeWidth={3}/>}</span>
    </button>)}
  </div>;
}
