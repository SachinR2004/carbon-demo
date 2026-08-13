/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1D4ED8',
        'primary-dark': '#1E3A8A',
        'primary-light': '#3B82F6',
        sky: '#38BDF8',
        eco: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',
        neutral: {
          bg: '#F8FAFC',
          card: '#FFFFFF',
          border: '#E2E8F0',
          textMain: '#0F172A',
          textMuted: '#64748B'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
