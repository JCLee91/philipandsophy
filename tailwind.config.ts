import type { Config } from 'tailwindcss';

const config = {
  darkMode: ['class'],
  // ✅ Mobile Optimization: Disable hover styles on touch devices (prevent sticky hover)
  future: {
    hoverOnlyWhenSupported: true,
  },
  content: ['./src/**/*.{ts,tsx}'],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          light: '#eff6ff',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        'library-blue-light': '#cee7ff',
        'library-blue': '#45a1fd',
        'library-yellow-light': '#fff2d2',
        'library-yellow': '#ffd362',
        'text-primary': '#31363e',
        'text-secondary': '#575e68',
        // Admin panel color system
        admin: {
          text: {
            primary: '#31363e',
            secondary: '#8f98a3',
            tertiary: '#575e68',
          },
          bg: {
            page: '#eff6ff',
            card: '#ffffff',
            gray: '#f5f5f5',
            stripe: '#fafbfc',
            hover: '#f9fafb',
            info: '#cee7ff',
            warning: '#fff2d2',
          },
          border: {
            DEFAULT: '#dddddd',
            warning: '#ffd362',
          },
          brand: {
            DEFAULT: '#45a1fd',
            success: '#52c41a',
            warning: '#ffa940',
          },
        },
      },
      fontSize: {
        'heading-xl': ['24px', { lineHeight: '1.4', letterSpacing: '-0.24px' }],
        'heading-lg': ['18px', { lineHeight: '1.4', letterSpacing: '-0.18px' }],
        'body-base': ['16px', { lineHeight: '1.6', letterSpacing: '-0.16px' }],
        'body-sm': ['14px', { lineHeight: '1.5' }],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      transitionDuration: {
        'fast': 'var(--duration-fast)',
        'normal': 'var(--duration-normal)',
        'slow': 'var(--duration-slow)',
      },
      transitionTimingFunction: {
        'smooth': 'var(--ease-smooth)',
        'out': 'var(--ease-out)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        // Modern shimmer effect - optimized range and timing (2025 standard)
        shimmer: {
          '0%': { backgroundPosition: '-100% 0' },
          '100%': { backgroundPosition: '100% 0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        // Shimmer: 1.5s with ease-in-out for natural feel (Instagram/Linear/Notion pattern)
        shimmer: 'shimmer 1.5s infinite ease-in-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate'), require('@tailwindcss/typography')],
} satisfies Config;

export default config;
