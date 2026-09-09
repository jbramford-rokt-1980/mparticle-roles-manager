import type { Config } from 'tailwindcss';

/** Adobe demo theme. Existing token names remain to keep the branch diff small. */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        beetroot: {
          DEFAULT: '#EB1000',
          dark: '#B70C00',
          tint: '#FFF0ED',
        },
        wine: {
          DEFAULT: '#101010',
          deep: '#000000',
          tint: '#F4F1ED',
        },
      },
      fontFamily: {
        sans: ['"Source Sans 3"', 'system-ui', 'sans-serif'],
        mono: ['"Source Code Pro"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
