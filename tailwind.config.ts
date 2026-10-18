import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'green-deep': '#0B5D3B',
        'amber-warm': '#F59E0B',
        ink:   '#1A1A1A',
        panel: '#F7F8FA',
        ok:    '#16A34A',
        alert: '#DC2626',
      },
    },
  },
  plugins: [],
};

export default config;