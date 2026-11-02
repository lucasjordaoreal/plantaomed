/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        soft: '0 12px 36px rgba(16, 17, 20, 0.08)',
      },
      colors: {
        brand: {
          50: '#eaf3ff',
          500: '#007aff',
          700: '#0066dd',
          900: '#101114',
        },
      },
    },
  },
  plugins: [],
}
