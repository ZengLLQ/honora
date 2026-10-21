/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ivory: {
          DEFAULT: '#F1EDE2',
          light: '#F8F6F0',
          dark: '#E7E2D5',
        },
        nearblack: {
          DEFAULT: '#101116',
          surface: '#171821',
          elevated: '#1F202B',
          card: '#1B1C25',
        },
        lavender: {
          DEFAULT: '#8982E8',
          hover: '#9F99EE',
          dim: 'rgba(137, 130, 232, 0.15)',
          border: 'rgba(137, 130, 232, 0.35)',
        },
        editorial: {
          muted: '#85848A',
          border: '#D4D0C7',
          borderDark: '#252733',
          borderDarkLight: '#323444',
          subtle: '#B3B0A8',
        },
        status: {
          success: '#4ADE80',
          error: '#F87171',
          warning: '#FBBF24',
        }
      },
      fontFamily: {
        display: ['Syne', 'Space Grotesk', 'sans-serif'],
        editorial: ['Newsreader', 'serif'],
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      letterSpacing: {
        tighter: '-0.04em',
        tight: '-0.02em',
        widest: '0.15em',
        ultra: '0.25em',
      },
      maxWidth: {
        'page': '1560px',
      }
    },
  },
  plugins: [],
};
