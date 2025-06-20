import { useLayoutEffect, useState } from 'react';

type Theme = 'light' | 'dark' | null;
const LS_KEY = 'color-theme';

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(null);

  // On first render, sync visual theme before paint
  useLayoutEffect(() => {
    const stored = localStorage.getItem(LS_KEY) as Theme | null;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const prefer = mq.matches ? 'dark' : 'light';
    const initial = stored ?? prefer;
    document.documentElement.setAttribute('data-theme', initial);
    setThemeState(initial);
  }, []);

  const setTheme = (next: Theme) => {
    if (next) {
      localStorage.setItem(LS_KEY, next);
      document.documentElement.setAttribute('data-theme', next);
      setThemeState(next);
    }
  };

  // Also respond if user OS preference changes
  useLayoutEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem(LS_KEY)) {
        const sys = e.matches ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', sys);
        setThemeState(sys);
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return { theme, setTheme };
}
