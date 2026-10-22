import React, { useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import type { Theme } from '../utils/theme';

export interface ThemeToggleProps {
  theme: Theme;
  onToggle: () => void;
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  theme,
  onToggle,
  className = '',
}) => {
  const [isRotating, setIsRotating] = useState(false);
  const isDark = theme === 'dark';

  const handleClick = () => {
    setIsRotating(true);
    onToggle();
    setTimeout(() => {
      setIsRotating(false);
    }, 450);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`btn-heron group relative inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 bg-heron-surface hover:bg-heron-subtle text-heron-primary border border-heron-border hover:border-heron-secondary/40 transition-all duration-200 active:scale-[0.94] cursor-pointer shadow-xs overflow-hidden select-none ${className}`}
    >
      <span className="sr-only">
        {isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      </span>

      {/* Rotating motion container */}
      <div
        className={`relative w-4 h-4 flex items-center justify-center transition-transform duration-500 ease-out ${
          isRotating ? 'rotate-[360deg] scale-110' : 'rotate-0 scale-100'
        }`}
      >
        {/* Sun Icon (Visible in Light Mode) */}
        <Sun
          className={`w-4 h-4 text-amber-500 absolute transition-all duration-300 transform ${
            isDark
              ? 'opacity-0 -rotate-90 scale-0 pointer-events-none'
              : 'opacity-100 rotate-0 scale-100'
          }`}
        />

        {/* Moon Icon (Visible in Dark Mode) */}
        <Moon
          className={`w-4 h-4 text-indigo-400 absolute transition-all duration-300 transform ${
            isDark
              ? 'opacity-100 rotate-0 scale-100'
              : 'opacity-0 rotate-90 scale-0 pointer-events-none'
          }`}
        />
      </div>
    </button>
  );
};

export default ThemeToggle;
