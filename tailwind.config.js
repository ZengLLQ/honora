/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Heron AI Exact Color System
        heron: {
          bg: '#F5F5ED',
          surface: '#FFFFFF',
          subtle: '#ECECE4',
          primary: '#282828',
          secondary: '#414140',
          tertiary: '#72726F',
          granite: '#626260',
          border: '#B3B3AF',
          borderSubtle: '#D5D5CF',
          borderDark: '#3A3A38',
          brand: '#FA3600',
          brandHover: '#E03000',
          brandDim: 'rgba(250, 54, 0, 0.10)',
          selection: '#E15C46',
          darkCard: '#1F1F1E',
        },
        // Backward-compatible token mappings updated to Heron AI palette
        ivory: {
          DEFAULT: '#F5F5ED',
          light: '#FFFFFF',
          dark: '#ECECE4',
        },
        nearblack: {
          DEFAULT: '#282828',
          surface: '#1F1F1E',
          elevated: '#333331',
          card: '#282828',
        },
        lavender: {
          DEFAULT: '#FA3600',
          hover: '#E03000',
          dim: 'rgba(250, 54, 0, 0.10)',
          border: 'rgba(250, 54, 0, 0.35)',
        },
        editorial: {
          muted: '#72726F',
          border: '#B3B3AF',
          borderDark: '#3A3A38',
          borderDarkLight: '#4A4A48',
          subtle: '#B3B3AF',
        },
        status: {
          success: '#15803D',
          error: '#FA3600',
          warning: '#B45309',
        },
      },
      fontFamily: {
        sans: ['"BT Grotesk"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        display: ['"BT Grotesk"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        mono: ['GeistMono', '"BT Grotesk"', 'monospace'],
        cjk: ['"BT Grotesk"', '"Noto Sans SC"', '"Microsoft YaHei"', '"PingFang SC"', 'sans-serif'],
      },
      letterSpacing: {
        tighter: '-0.04em',
        tight: '-0.02em',
        normal: '0em',
        wide: '0.04em',
        wider: '0.08em',
        widest: '0.15em',
        ultra: '0.25em',
      },
      maxWidth: {
        page: '1440px',
      },
      transitionTimingFunction: {
        heron: 'cubic-bezier(0.23, 1, 0.32, 1)',
      },
    },
  },
  plugins: [],
};
