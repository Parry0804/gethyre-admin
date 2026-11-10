/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'], mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'] },
      colors: {
        canvas: '#f9fafb',
        line: '#eef0f3',
        edge: '#e5e7eb',
        ink: { DEFAULT: '#111827', 2: '#374151', 3: '#6b7280', 4: '#9ca3af' },
        brand: { DEFAULT: '#2563eb', soft: '#eff6ff', deep: '#1e40af' },
        good: { DEFAULT: '#059669', soft: '#ecfdf5' },
        warn: { DEFAULT: '#d97706', soft: '#fffbeb', deep: '#92400e' },
        bad: { DEFAULT: '#dc2626', soft: '#fef2f2', deep: '#991b1b' },
      },
      boxShadow: { card: '0 2px 8px rgba(17,24,39,0.06)' },
    },
  },
  plugins: [],
};
