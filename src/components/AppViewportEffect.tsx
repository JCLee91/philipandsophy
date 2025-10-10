'use client';

import { useEffect } from 'react';

function updateViewportVariables() {
  const viewport = typeof window !== 'undefined' ? window.visualViewport : null;
  const height = viewport?.height ?? window.innerHeight;
  const bottomInset = viewport
    ? Math.max(window.innerHeight - (viewport.height + viewport.offsetTop), 0)
    : 0;

  const root = document.documentElement;
  root.style.setProperty('--app-viewport-height', `${height}px`);
  root.style.setProperty('--app-safe-area-bottom', `${bottomInset}px`);
}

export default function AppViewportEffect() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => updateViewportVariables();

    updateViewportVariables();

    const viewport = window.visualViewport;
    viewport?.addEventListener('resize', handleResize);
    viewport?.addEventListener('scroll', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      viewport?.removeEventListener('resize', handleResize);
      viewport?.removeEventListener('scroll', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return null;
}
