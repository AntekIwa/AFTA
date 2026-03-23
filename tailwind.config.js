/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'marmot-bg': '#1A1D21',
        'marmot-surface': '#252A2F',
        'marmot-orange': '#FF8C00',
        'marmot-text': '#E2E8F0',
      },
    },
  },
  plugins: [],
};
