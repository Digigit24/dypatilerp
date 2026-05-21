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
        paper: '#F8F6F5',
        surface: '#F4F1EF',
        navy: '#0F172A',
        ink: '#171717',
        muted: '#6E6A67',
      },
      boxShadow: {
        soft: '0 2px 10px rgba(0,0,0,0.03), 0 8px 30px rgba(0,0,0,0.04)',
        hover: '0 10px 40px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [],
}
