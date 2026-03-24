/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      // ── Screen SmartPOS ──────────────────────────────────────────
      screens: {
        xs: '320px',
      },

      // ── Font SmartPOS ──────────────────────────────────────────
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
        display: ['Syne', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },

      // ── Color Palette ──────────────────────────────────────────
      colors: {
        primary: {
          50: '#eef5ff',
          100: '#daeaff',
          200: '#bdd8ff',
          300: '#90bdff',
          400: '#5c97ff',
          500: '#3670ff',
          600: '#1e4df5',
          700: '#1639e1',
          800: '#1830b6',
          900: '#1a2e8f',
          950: '#141f5e',
        },
        surface: {
          50: '#f8f9fc',
          100: '#f0f2f7',
          200: '#e2e6ef',
          300: '#cdd4e3',
          400: '#aab5cc',
          500: '#8896b3',
          600: '#6b7a99',
          700: '#57637e',
          800: '#3d4660',  // sidebar bg
          900: '#252d45',  // dark bg
          950: '#151c30',  // darkest bg
        },
        success: { 500: '#22c55e', 600: '#16a34a' },
        warning: { 500: '#f59e0b', 600: '#d97706' },
        danger: { 400: '#f87171', 500: '#ef4444', 600: '#dc2626' },
      },

      // ── Border radius ──────────────────────────────────────────
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '20px',
      },

      // ── Box shadow ─────────────────────────────────────────────
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'card-md': '0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.06)',
        'card-lg': '0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.05)',
      },

      // ── Animation ──────────────────────────────────────────────
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-in': 'slide-in 0.25s ease-out',
        'pulse-dot': 'pulse-dot 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
