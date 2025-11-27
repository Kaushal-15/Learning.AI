import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle = () => {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg bg-gray-100 dark:bg-dark-400 hover:bg-gray-200 dark:hover:bg-dark-300 transition-all duration-300 group"
      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDarkMode ? (
        <Sun className="w-5 h-5 text-cream-300 group-hover:text-cream-200 transition-colors" />
      ) : (
        <Moon className="w-5 h-5 text-gray-700 group-hover:text-gray-900 transition-colors" />
      )}
    </button>
  );
};

export default ThemeToggle;