'use client';

import { useEffect, useState } from 'react';

export function DarkModeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');

  useEffect(() => {
    const stored = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (stored) {
      setTheme(stored);
      document.documentElement.classList.toggle('dark', stored === 'dark');
    } else {
      setTheme('system');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', prefersDark);
    }
  }, []);

  const cycleTheme = () => {
    let next: 'light' | 'dark' | 'system';
    if (theme === 'system') next = 'light';
    else if (theme === 'light') next = 'dark';
    else next = 'system';

    setTheme(next);

    if (next === 'system') {
      localStorage.removeItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', prefersDark);
    } else {
      localStorage.setItem('theme', next);
      document.documentElement.classList.toggle('dark', next === 'dark');
    }
  };

  return (
    <button
      onClick={cycleTheme}
      className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      title={`Theme: ${theme}`}
    >
      {theme === 'dark' ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M13.5 8.5a5.5 5.5 0 0 1-7-7 6 6 0 1 0 7 7z" />
        </svg>
      ) : theme === 'light' ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="8" cy="8" r="3" />
          <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="8" cy="8" r="3" />
          <path d="M8 1v1M8 14v1M1 8h1M14 8h1" />
          <path d="M3 3l.7.7M12.3 12.3l.7.7M3 13l.7-.7M12.3 3.7l.7-.7" />
          <path d="M8 5a3 3 0 0 0 0 6" fill="currentColor" opacity="0.3" />
        </svg>
      )}
    </button>
  );
}
