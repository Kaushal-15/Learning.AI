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
                // Vibrant Modern Colors
                cyan: {
                    50: '#ecfeff',
                    100: '#cffafe',
                    200: '#a5f3fc',
                    300: '#67e8f9',
                    400: '#22d3ee',
                    500: '#06b6d4',
                    600: '#0891b2',
                    700: '#0e7490',
                    800: '#155e75',
                    900: '#164e63',
                },
                emerald: {
                    50: '#ecfdf5',
                    100: '#d1fae5',
                    200: '#a7f3d0',
                    300: '#6ee7b7',
                    400: '#34d399',
                    500: '#10b981',
                    600: '#059669',
                    700: '#047857',
                    800: '#065f46',
                    900: '#064e3b',
                },
                violet: {
                    50: '#f5f3ff',
                    100: '#ede9fe',
                    200: '#ddd6fe',
                    300: '#c4b5fd',
                    400: '#a78bfa',
                    500: '#8b5cf6',
                    600: '#7c3aed',
                    700: '#6d28d9',
                    800: '#5b21b6',
                    900: '#4c1d95',
                },
                rose: {
                    50: '#fff1f2',
                    100: '#ffe4e6',
                    200: '#fecdd3',
                    300: '#fda4af',
                    400: '#fb7185',
                    500: '#f43f5e',
                    600: '#e11d48',
                    700: '#be123c',
                    800: '#9f1239',
                    900: '#881337',
                },
                amber: {
                    50: '#fffbeb',
                    100: '#fef3c7',
                    200: '#fde68a',
                    300: '#fcd34d',
                    400: '#fbbf24',
                    500: '#f59e0b',
                    600: '#d97706',
                    700: '#b45309',
                    800: '#92400e',
                    900: '#78350f',
                },
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
                // Enhanced Gradients
                'gradient-dark': 'linear-gradient(135deg, #0b1437 0%, #1a1448 50%, #2d1b69 100%)',
                'gradient-purple': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                'gradient-blue': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                'gradient-emerald': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                'gradient-cyan': 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                'gradient-violet': 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                'gradient-rose': 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
                'gradient-amber': 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                'gradient-electric': 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
                'gradient-sunset': 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                'gradient-ocean': 'linear-gradient(135deg, #2e3192 0%, #1bffff 100%)',
                'gradient-fire': 'linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)',
            },
            backdropBlur: {
                xs: '2px',
            },
            animation: {
                // Existing
                'fade-in': 'fadeIn 0.5s ease-in-out',
                'slide-up': 'slideUp 0.3s ease-out',
                'slide-in-right': 'slideInRight 0.3s ease-out',
                'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
                // New Premium Animations
                'bounce-soft': 'bounceSoft 1s ease-in-out',
                'scale-in': 'scaleIn 0.3s ease-out',
                'glow-pulse': 'glowPulse 2s ease-in-out infinite',
                'shimmer': 'shimmer 2s linear infinite',
                'float': 'float 3s ease-in-out infinite',
                'slide-in-left': 'slideInLeft 0.3s ease-out',
                'wiggle': 'wiggle 1s ease-in-out',
                'gradient-shift': 'gradientShift 3s ease infinite',
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
                slideInLeft: {
                    '0%': { transform: 'translateX(-100%)', opacity: '0' },
                    '100%': { transform: 'translateX(0)', opacity: '1' },
                },
                pulseSoft: {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.8' },
                },
                bounceSoft: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                scaleIn: {
                    '0%': { transform: 'scale(0.9)', opacity: '0' },
                    '100%': { transform: 'scale(1)', opacity: '1' },
                },
                glowPulse: {
                    '0%, 100%': { boxShadow: '0 0 20px rgba(139, 92, 246, 0.5)' },
                    '50%': { boxShadow: '0 0 40px rgba(139, 92, 246, 0.8)' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-20px)' },
                },
                wiggle: {
                    '0%, 100%': { transform: 'rotate(0deg)' },
                    '25%': { transform: 'rotate(-3deg)' },
                    '75%': { transform: 'rotate(3deg)' },
                },
                gradientShift: {
                    '0%, 100%': { backgroundPosition: '0% 50%' },
                    '50%': { backgroundPosition: '100% 50%' },
                },
            },
            boxShadow: {
                'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                'glass-dark': '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
                'glow-emerald': '0 0 20px rgba(16, 185, 129, 0.5)',
                'glow-cyan': '0 0 20px rgba(6, 182, 212, 0.5)',
                'glow-violet': '0 0 20px rgba(139, 92, 246, 0.5)',
                'glow-rose': '0 0 20px rgba(244, 63, 94, 0.5)',
                'glow-amber': '0 0 20px rgba(251, 191, 36, 0.5)',
                'xl-emerald': '0 20px 50px -12px rgba(16, 185, 129, 0.5)',
                'xl-cyan': '0 20px 50px -12px rgba(6, 182, 212, 0.5)',
                'xl-violet': '0 20px 50px -12px rgba(139, 92, 246, 0.5)',
                'xl-rose': '0 20px 50px -12px rgba(244, 63, 94, 0.5)',
            }
        },
    },
    plugins: [animate],
};
