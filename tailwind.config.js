/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'rgb(var(--foreground-rgb) / <alpha-value>)',
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        primary: {
          DEFAULT: 'rgb(var(--primary-rgb) / <alpha-value>)',
          foreground: 'rgb(var(--primary-foreground-rgb) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent-rgb) / <alpha-value>)',
          foreground: 'var(--accent-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        ma: {
          DEFAULT: 'var(--ma)',
          foreground: 'var(--ma-foreground)',
        },
        success: 'var(--success)',
        warning: 'var(--warning)',
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        // Ocre « prix et cession » : remplace l'orange vif d'origine dans toute l'appli (voir docs/DESIGN.md).
        amber: {
          50: '#FBF6EE', 100: '#F4E8D4', 200: '#E8D0A8', 300: '#D8B072', 400: '#C08A3E',
          500: '#9F5F12', 600: '#874F0D', 700: '#6F4109', 800: '#563208', 900: '#3F2506', 950: '#281703',
        },
        orange: {
          50: '#FBF6EE', 100: '#F4E8D4', 200: '#E8D0A8', 300: '#D8B072', 400: '#C08A3E',
          500: '#9F5F12', 600: '#874F0D', 700: '#6F4109', 800: '#563208', 900: '#3F2506', 950: '#281703',
        },
        ochre: 'var(--ochre)',
      },
      fontFamily: {
        sans: ['Geist', 'system-ui', 'sans-serif'],
        display: ['Geist', 'system-ui', 'sans-serif'],
      },
      // Pas d'effet « grossissement » au survol : il fait jouet plus que professionnel.
      scale: {
        105: '1',
        110: '1',
      },
    },
    // Rayons et ombres sobres sur tout le site (les classes existantes restent valides).
    borderRadius: {
      none: '0',
      sm: '4px',
      DEFAULT: '8px',
      md: '8px',
      lg: '10px',
      xl: '12px',
      '2xl': '14px',
      '3xl': '16px',
      full: '9999px',
    },
    boxShadow: {
      sm: '0 1px 2px rgba(15, 27, 45, 0.05)',
      DEFAULT: '0 1px 2px rgba(15, 27, 45, 0.06)',
      md: '0 1px 3px rgba(15, 27, 45, 0.08)',
      lg: '0 4px 12px rgba(15, 27, 45, 0.08)',
      xl: '0 10px 24px rgba(15, 27, 45, 0.10)',
      '2xl': '0 16px 40px rgba(15, 27, 45, 0.14)',
      inner: 'inset 0 1px 2px rgba(15, 27, 45, 0.06)',
      none: 'none',
    },
  },
  plugins: [],
};
