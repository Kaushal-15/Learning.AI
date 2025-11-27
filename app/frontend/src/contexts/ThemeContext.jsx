import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

export const ThemeProvider = ({ children }) => {
    const [isDarkMode, setIsDarkMode] = useState(() => {
        // Check if we're in the browser environment
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('darkMode');
            return saved ? JSON.parse(saved) : false;
        }
        return false;
    });

    // Apply theme on mount and when isDarkMode changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const root = document.documentElement;
            if (isDarkMode) {
                root.classList.add('dark');
            } else {
                root.classList.remove('dark');
            }
        }
    }, [isDarkMode]);

    // Save to localStorage when theme changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
        }
    }, [isDarkMode]);

    const toggleTheme = () => {
        setIsDarkMode(prev => !prev);
    };

    return (
        <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};