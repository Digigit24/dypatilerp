export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        nav: ['DM Sans', 'Inter', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
      },
      colors: {
        rose: { 50: '#FFF1F5', 500: '#E54873', 600: '#D93B67' },
        paper: '#F7F7F5',
        surface: '#F4F4F2',
        navy: '#0F172A',
        ink: '#1F1F1F',
        muted: '#6B6B6B',
      },
      boxShadow: {
        soft: 'none',
        hover: '0 1px 2px rgba(0,0,0,.04)',
      },
    },
  },
  plugins: [],
}