'use client';

import { useEffect } from 'react';

/** Progressive enhancement: all content remains visible without JavaScript. */
export default function LandingMotion() {
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (media.matches) return;
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        entry.target.classList.add('landing-revealed');
      }
    }, { threshold: 0.12 });
    const elements = document.querySelectorAll('.landing-section h2, .landing-section-intro > p, .landing-body-features article, .landing-product-card, .landing-session-visual, .landing-equipment-grid a, .landing-extras article, .landing-training-photo, .landing-use-case-list article, .landing-faq details, .landing-cta h2');
    elements.forEach(element => observer.observe(element));
    const stopMotion = () => { if (media.matches) observer.disconnect(); };
    media.addEventListener('change', stopMotion);
    return () => {
      observer.disconnect();
      elements.forEach(element => element.classList.remove('landing-revealed'));
      media.removeEventListener('change', stopMotion);
    };
  }, []);
  return null;
}
