/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        soft: '0 16px 40px rgba(15, 23, 42, 0.12)',
      },
      colors: {
        brand: {
          50: '#f0fdfa',
          500: '#2dd4bf',
          700: '#0f766e',
          900: '#0f172a',
        },
      },
    },
  },
  plugins: [],
}
