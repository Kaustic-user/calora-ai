/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef2ff',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca'
        },
        cyber: {
          bg: '#070A12',
          card: '#0E1424',
          cardHover: '#131C31',
          border: '#1E293B',
          neonCyan: '#06B6D4',
          neonViolet: '#8B5CF6',
          neonIndigo: '#6366F1'
        }
      }
    },
  },
  plugins: [],
}
