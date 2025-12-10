import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/app/**/*.{ts,tsx}', './src/components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          '50': '#f0f7ff',
          '100': '#d9eaff',
          '200': '#b3d5ff',
          '300': '#7cb7ff',
          '400': '#4a98ff',
          '500': '#1f7cff',
          '600': '#0c62e6',
          '700': '#084db4',
          '800': '#073f8f',
          '900': '#0a346f',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      fontFamily: {
        heading: ['DM Sans"', 'ui-sans-serif', 'system-ui'],
        body: ['Inter"', 'ui-sans-serif', 'system-ui'],
      },
    },
  },
  plugins: [],
};

export default config;
