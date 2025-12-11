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

    const [isPreferencesLoaded, setIsPreferencesLoaded] = useState(false);

    // Apply theme on mount and when isDarkMode changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const root = document.documentElement;
            if (isDarkMode) {
                root.classList.add('app-dark');
            } else {
                root.classList.remove('app-dark');
            }
        }
    }, [isDarkMode]);

    // Save to localStorage when theme changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
        }
    }, [isDarkMode]);

    // Sync with backend on mount and when changed
    useEffect(() => {
        // Only sync if we have loaded preferences from backend
        if (!isPreferencesLoaded) return;

        const syncTheme = async () => {
            try {
                await fetch('http://localhost:3000/api/users/profile', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        settings: { theme: isDarkMode ? 'dark' : 'light' }
                    })
                });
            } catch (err) {
                // Ignore errors
            }
        };

        // We only want to sync when isDarkMode changes, NOT when isPreferencesLoaded changes to true
        // But we need isPreferencesLoaded to be true to allow syncing.
        // The issue was likely that setting isPreferencesLoaded triggered this effect.
        // We can check if it's the initial load.
        syncTheme();
    }, [isDarkMode]); // Remove isPreferencesLoaded from dependency array to avoid sync on load finish

    // Fetch user preference on mount
    useEffect(() => {
        const fetchUserTheme = async () => {
            try {
                const res = await fetch('http://localhost:3000/api/users/me', { credentials: 'include' });
                if (res.ok) {
                    const data = await res.json();
                    if (data.success && data.user.settings?.theme) {
                        const userTheme = data.user.settings.theme;
                        if (userTheme === 'dark' && !isDarkMode) setIsDarkMode(true);
                        if (userTheme === 'light' && isDarkMode) setIsDarkMode(false);
                    }
                }
            } catch (e) {
                // ignore
            } finally {
                setIsPreferencesLoaded(true);
            }
        };
        fetchUserTheme();
    }, []);

    const toggleTheme = () => {
        setIsDarkMode(prev => !prev);
        // Ensure we start syncing if user manually toggles
        if (!isPreferencesLoaded) setIsPreferencesLoaded(true);
    };

    return (
        <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};