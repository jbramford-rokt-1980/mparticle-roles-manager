import type { Config } from 'tailwindcss';

/**
 * Rokt brand tokens, verified against rokt.com/brand-guidelines and
 * go.rokt.com/beetroot. Composition guidance: white foundation, black type,
 * Beetroot reserved for primary CTAs and bold accents (~15%), Wine for
 * shell depth and secondary surfaces (~15%).
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        beetroot: {
          DEFAULT: '#AD0068',
          dark: '#8F0056',
          tint: '#FBEBF4',
        },
        wine: {
          DEFAULT: '#480029',
          deep: '#320019',
          tint: '#F6EFF3',
        },
      },
      fontFamily: {
        sans: ['Archivo', 'system-ui', 'sans-serif'],
        mono: ['"Roboto Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
