import { useState, useEffect, useCallback } from 'react';

export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'honora_theme';

export function getSystemTheme(): Theme {
  if (typeof window !== 'undefined' && window.matchMedia) {
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  }
  return 'light';
}

export function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null;
  try {
    const val = localStorage.getItem(THEME_STORAGE_KEY);
    if (val === 'light' || val === 'dark') {
      return val;
    }
  } catch {
    // localStorage may be unavailable in some sandboxes
  }
  return null;
}

export function getInitialTheme(): Theme {
  return getStoredTheme() ?? getSystemTheme();
}

export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
  }
}

export function setStoredTheme(theme: Theme): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage write errors
    }
  }
  applyTheme(theme);
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => getInitialTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      // If user hasn't explicitly set a preference, auto-sync with system OS changes
      const stored = getStoredTheme();
      if (!stored) {
        const newTheme: Theme = e.matches ? 'dark' : 'light';
        setThemeState(newTheme);
        applyTheme(newTheme);
      }
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleMediaChange);
    } else if (typeof (mediaQuery as unknown as { addListener?: (cb: (e: MediaQueryListEvent) => void) => void }).addListener === 'function') {
      (mediaQuery as unknown as { addListener: (cb: (e: MediaQueryListEvent) => void) => void }).addListener(handleMediaChange);
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY && (e.newValue === 'light' || e.newValue === 'dark')) {
        setThemeState(e.newValue);
        applyTheme(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', handleMediaChange);
      } else if (typeof (mediaQuery as unknown as { removeListener?: (cb: (e: MediaQueryListEvent) => void) => void }).removeListener === 'function') {
        (mediaQuery as unknown as { removeListener: (cb: (e: MediaQueryListEvent) => void) => void }).removeListener(handleMediaChange);
      }
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      setStoredTheme(next);
      return next;
    });
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setStoredTheme(newTheme);
    setThemeState(newTheme);
  }, []);

  return { theme, toggleTheme, setTheme };
}
