/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Folioops brand colors
        'primary': '#084A5F',        // Deep Teal Blue
        'accent': '#7CCBDD',         // Sky Blue
        'background': '#FFFFFF',     // White
        'text-primary': '#20282B',   // Charcoal Gray
        'hover': '#3FBAC2',          // Muted Cyan
        
        // Additional shades for better UI
        'primary-dark': '#063A4A',
        'primary-light': '#0A5A72',
        'accent-light': '#A3D7E6',
        'accent-dark': '#5BB8CE',
        'text-secondary': '#4A5568',
        'text-muted': '#718096',
        'border': '#E2E8F0',
        'gray': {
          50: '#F7FAFC',
          100: '#EDF2F7',
          200: '#E2E8F0',
          300: '#CBD5E0',
          400: '#A0AEC0',
          500: '#718096',
          600: '#4A5568',
          700: '#2D3748',
          800: '#1A202C',
          900: '#171923',
        },
      },
      fontFamily: {
        'sans': ['"Segoe UI"', '"Helvetica Neue"', 'Arial', 'sans-serif'],
      },
      fontSize: {
        'h1': ['36px', { lineHeight: '1.2', fontWeight: '700' }],
        'h2': ['28px', { lineHeight: '1.3', fontWeight: '700' }],
        'h3': ['22px', { lineHeight: '1.4', fontWeight: '700' }],
        'body': ['16px', { lineHeight: '1.6', fontWeight: '400' }],
        'button': ['16px', { lineHeight: '1.5', fontWeight: '600' }],
      },
      spacing: {
        'section': '60px',
        'element': '20px',
        'button': '30px',
      },
      maxWidth: {
        'container': '1200px',
      },
      borderRadius: {
        'folioops': '12px',
        'folioops-lg': '16px',
      },
      boxShadow: {
        'folioops': '0 2px 16px rgba(8, 74, 95, 0.12)',
        'folioops-hover': '0 6px 20px rgba(8, 74, 95, 0.15)',
        'folioops-card': '0 1px 3px rgba(8, 74, 95, 0.12), 0 1px 2px rgba(8, 74, 95, 0.24)',
      },
    },
  },
  plugins: [],
};