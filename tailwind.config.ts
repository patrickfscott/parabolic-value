import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['IBM Plex Mono', 'Courier New', 'monospace'],
        sans: ['IBM Plex Sans Condensed', 'Arial Narrow', 'sans-serif'],
      },
      fontSize: {
        'xxs': '0.625rem',
      },
      colors: {
        brand: '#1a1a2e',
      },
      screens: {
        'print': { 'raw': 'print' },
      },
    },
  },
  plugins: [],
}
export default config
