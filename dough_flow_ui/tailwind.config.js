/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        navy: {
          950: '#0B0F1A',
          900: '#111827',
          850: '#1A2332',
          800: '#1E2D3D',
          750: '#253447',
          700: '#2E3F52',
        },
      },
    },
  },
  plugins: [],
}
