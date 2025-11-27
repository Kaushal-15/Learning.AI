// tailwind.config.js
import animate from "tailwindcss-animate";

export default {
    darkMode: 'class', // Enable class-based dark mode
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Cream colors for dark mode accents
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
                // Dark mode backgrounds
                dark: {
                    50: '#1e2a4a',
                    100: '#1a2440',
                    200: '#161e36',
                    300: '#12182c',
                    400: '#0e1222',
                    500: '#0b1437', // Main dark background
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
            },
            backdropBlur: {
                xs: '2px',
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-in-out',
                'slide-up': 'slideUp 0.3s ease-out',
                'slide-in-right': 'slideInRight 0.3s ease-out',
                'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(100%)' },
                    '100%': { transform: 'translateY(0)' },
                },
                slideInRight: {
                    '0%': { transform: 'translateX(100%)', opacity: '0' },
                    '100%': { transform: 'translateX(0)', opacity: '1' },
                },
                pulseSoft: {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.8' },
                }
            },
            boxShadow: {
                'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                'glass-dark': '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
            }
        },
    },
    plugins: [animate],
};
