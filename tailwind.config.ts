import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#141414',
        paper: '#FFFFFF',
        accent: '#FFE03A',
        muted: '#6B6B6B',
        soft: '#FFF6C2',
      },
    },
  },
  plugins: [],
}
export default config
