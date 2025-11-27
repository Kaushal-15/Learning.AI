// Utility functions for consistent dark mode class application

export const darkModeClasses = {
  // Background classes
  bg: {
    primary: "bg-white dark:bg-gray-800",
    secondary: "bg-gray-50 dark:bg-gray-900",
    card: "bg-white dark:bg-gray-800",
    modal: "bg-white dark:bg-gray-800",
    overlay: "bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-75"
  },
  
  // Text classes
  text: {
    primary: "text-gray-900 dark:text-white",
    secondary: "text-gray-600 dark:text-gray-400",
    muted: "text-gray-500 dark:text-gray-500",
    accent: "text-[#344F1F] dark:text-green-400"
  },
  
  // Border classes
  border: {
    primary: "border-gray-200 dark:border-gray-700",
    secondary: "border-gray-300 dark:border-gray-600",
    accent: "border-[#344F1F] dark:border-green-500"
  },
  
  // Button classes
  button: {
    primary: "bg-[#344F1F] hover:bg-[#2a3f1a] text-white dark:bg-green-600 dark:hover:bg-green-700",
    secondary: "bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200",
    ghost: "text-gray-600 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800"
  },
  
  // Input classes
  input: {
    base: "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-[#344F1F] dark:focus:border-green-500 focus:ring-[#344F1F] dark:focus:ring-green-500"
  },
  
  // Alert classes
  alert: {
    success: "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800",
    error: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
    warning: "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800",
    info: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
  }
};

// Helper function to combine classes
export const cn = (...classes) => {
  return classes.filter(Boolean).join(' ');
};

// Quick class generators
export const getBgClass = (variant = 'primary') => darkModeClasses.bg[variant] || darkModeClasses.bg.primary;
export const getTextClass = (variant = 'primary') => darkModeClasses.text[variant] || darkModeClasses.text.primary;
export const getBorderClass = (variant = 'primary') => darkModeClasses.border[variant] || darkModeClasses.border.primary;
export const getButtonClass = (variant = 'primary') => darkModeClasses.button[variant] || darkModeClasses.button.primary;
export const getInputClass = () => darkModeClasses.input.base;
export const getAlertClass = (variant = 'info') => darkModeClasses.alert[variant] || darkModeClasses.alert.info;