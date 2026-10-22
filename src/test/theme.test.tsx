import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import {
  applyTheme,
  getInitialTheme,
  getStoredTheme,
  getSystemTheme,
  setStoredTheme,
  useTheme,
  THEME_STORAGE_KEY,
} from '../utils/theme';
import { ThemeToggle } from '../components/ThemeToggle';
import { Header } from '../components/Header';

describe('Theme System & Toggle', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = 'light';
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = '';
    vi.restoreAllMocks();
  });

  describe('Theme Storage & Detection Utilities', () => {
    it('detects system theme accurately from matchMedia', () => {
      // Mock matchMedia returning dark
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('dark'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      expect(getSystemTheme()).toBe('dark');

      // Mock matchMedia returning light
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      expect(getSystemTheme()).toBe('light');
    });

    it('reads stored theme from localStorage', () => {
      expect(getStoredTheme()).toBeNull();

      localStorage.setItem(THEME_STORAGE_KEY, 'dark');
      expect(getStoredTheme()).toBe('dark');

      localStorage.setItem(THEME_STORAGE_KEY, 'light');
      expect(getStoredTheme()).toBe('light');

      localStorage.setItem(THEME_STORAGE_KEY, 'invalid');
      expect(getStoredTheme()).toBeNull();
    });

    it('determines initial theme with precedence given to localStorage over OS preference', () => {
      // System is dark, but user explicitly stored light
      window.matchMedia = vi.fn().mockImplementation(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));
      localStorage.setItem(THEME_STORAGE_KEY, 'light');

      expect(getInitialTheme()).toBe('light');

      // Clear storage -> should now fall back to system dark
      localStorage.removeItem(THEME_STORAGE_KEY);
      expect(getInitialTheme()).toBe('dark');
    });

    it('applies dark class and colorScheme to documentElement', () => {
      applyTheme('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(document.documentElement.style.colorScheme).toBe('dark');

      applyTheme('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
      expect(document.documentElement.style.colorScheme).toBe('light');
    });

    it('stores theme in localStorage and applies it to document', () => {
      setStoredTheme('dark');
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);

      setStoredTheme('light');
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  describe('useTheme Hook', () => {
    it('initializes with initial theme and toggles theme', () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'light');

      const { result } = renderHook(() => useTheme());

      expect(result.current.theme).toBe('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.theme).toBe('dark');
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.theme).toBe('light');
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('allows setting explicit theme through setTheme', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setTheme('dark');
      });

      expect(result.current.theme).toBe('dark');
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);

      act(() => {
        result.current.setTheme('light');
      });

      expect(result.current.theme).toBe('light');
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('responds to storage events across browser tabs', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        const storageEvent = new StorageEvent('storage', {
          key: THEME_STORAGE_KEY,
          newValue: 'dark',
        });
        window.dispatchEvent(storageEvent);
      });

      expect(result.current.theme).toBe('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  describe('ThemeToggle Component', () => {
    it('renders with appropriate aria-label and titles depending on active theme', () => {
      const onToggle = vi.fn();
      const { rerender } = render(<ThemeToggle theme="light" onToggle={onToggle} />);

      const toggleBtn = screen.getByRole('button', { name: /Switch to dark mode/i });
      expect(toggleBtn).toBeInTheDocument();
      expect(toggleBtn).toHaveAttribute('title', 'Switch to dark mode');

      rerender(<ThemeToggle theme="dark" onToggle={onToggle} />);

      const darkToggleBtn = screen.getByRole('button', { name: /Switch to light mode/i });
      expect(darkToggleBtn).toBeInTheDocument();
      expect(darkToggleBtn).toHaveAttribute('title', 'Switch to light mode');
    });

    it('invokes onToggle and animates rotation on click', () => {
      const onToggle = vi.fn();
      render(<ThemeToggle theme="light" onToggle={onToggle} />);

      const button = screen.getByRole('button', { name: /Switch to dark mode/i });
      fireEvent.click(button);

      expect(onToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe('Header Integration with ThemeToggle', () => {
    it('places ThemeToggle right next to ADD PAYMENT button and handles toggle', () => {
      const onNewPayment = vi.fn();
      const onToggleTheme = vi.fn();

      render(
        <Header
          onNewPayment={onNewPayment}
          theme="light"
          onToggleTheme={onToggleTheme}
        />
      );

      const addPaymentBtn = screen.getByRole('button', { name: /ADD PAYMENT/i });
      const toggleThemeBtn = screen.getByRole('button', { name: /Switch to dark mode/i });

      expect(addPaymentBtn).toBeInTheDocument();
      expect(toggleThemeBtn).toBeInTheDocument();

      // Verify they are siblings in the actions container
      expect(toggleThemeBtn.nextElementSibling).toBe(addPaymentBtn);

      // Click toggle
      fireEvent.click(toggleThemeBtn);
      expect(onToggleTheme).toHaveBeenCalledTimes(1);

      // Click add payment
      fireEvent.click(addPaymentBtn);
      expect(onNewPayment).toHaveBeenCalledTimes(1);
    });
  });
});
