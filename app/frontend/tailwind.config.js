/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  safelist: [
    {
      pattern: /from-(blue|pink|green|orange|indigo|red|teal|purple|violet|emerald|amber|cyan|rose)-(400|500|600|700)/,
    },
    {
      pattern: /to-(purple|rose|emerald|amber|blue|pink|cyan|violet|indigo)-(400|500|600|700)/,
    },
    {
      pattern: /bg-(primary|secondary|cream|dark)-(50|100|200|300|400|500|600|700|800|900)/,
    },
    {
      pattern: /text-(primary|secondary|cream|dark)-(50|100|200|300|400|500|600|700|800|900)/,
    },
    {
      pattern: /border-(primary|secondary|cream|dark)-(50|100|200|300|400|500|600|700|800|900)/,
    }
  ],
  theme: {
    extend: {
      colors: {
        color1: '#344F1F',
        color2: '#FFECC0',
        gray: {
          750: '#262f3d',
        },
        cream: {
          50: '#fdfbf7',
          100: '#faf6ee',
          200: '#f5e6d3',
          300: '#f0d6b8',
          400: '#ebc69d',
          500: '#e6b682',
          600: '#d19a5c',
          700: '#b67d3b',
          800: '#8b5e2c',
          900: '#5f3f1d',
        },
        dark: {
          50: '#1e2a4a',
          100: '#1a2440',
          200: '#161e36',
          300: '#12182c',
          400: '#0e1222',
          500: '#0b1437',
          600: '#090f2a',
          700: '#070b1d',
          800: '#050710',
          900: '#030408',
        },
        primary: {
          50: '#f0f4ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        secondary: {
          50: '#fdf4ff',
          100: '#fae8ff',
          200: '#f5d0fe',
          300: '#f0abfc',
          400: '#e879f9',
          500: '#d946ef',
          600: '#c026d3',
          700: '#a21caf',
          800: '#86198f',
          900: '#701a75',
        }
      },
      backgroundImage: {
        'gradient-dark': 'linear-gradient(135deg, #0b1437 0%, #1a1448 50%, #2d1b69 100%)',
        'gradient-purple': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'gradient-blue': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'gradient-emerald': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        'gradient-cyan': 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
        'gradient-violet': 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
        'gradient-rose': 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
        'gradient-amber': 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
      }
    },
  },
  plugins: [],
};
