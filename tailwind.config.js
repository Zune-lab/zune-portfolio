/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        panel: 'var(--panel)',
        inset: 'var(--inset)',
        line: 'var(--line)',
        ink: 'var(--text)',
        dim: 'var(--text-dim)',
        amber: 'var(--amber)',
        'amber-dim': 'var(--amber-dim)',
        green: 'var(--green)',
        js: 'var(--js)',
        csslang: 'var(--css-lang)',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        sans: ['Inter', '"Segoe UI"', 'sans-serif'],
        pixel: ['Silkscreen', '"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};