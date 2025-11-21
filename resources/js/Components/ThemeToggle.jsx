import { useState, useEffect } from 'react';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';

const ThemeToggle = () => {
    const [darkMode, setDarkMode] = useState(() => {
        // Check localStorage or system preference
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('theme');
            if (saved) {
                return saved === 'dark';
            }
            return window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        return false;
    });

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [darkMode]);

    return (
        <button
            onClick={() => setDarkMode(!darkMode)}
            className="relative inline-flex items-center justify-center p-2 rounded-lg transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
            aria-label="Toggle theme"
        >
            <div className="relative w-5 h-5">
                {/* Sun Icon */}
                <SunIcon 
                    className={`absolute inset-0 w-5 h-5 text-amber-500 transition-all duration-500 transform ${
                        darkMode 
                            ? 'rotate-90 scale-0 opacity-0' 
                            : 'rotate-0 scale-100 opacity-100'
                    }`}
                />
                {/* Moon Icon */}
                <MoonIcon 
                    className={`absolute inset-0 w-5 h-5 text-blue-400 transition-all duration-500 transform ${
                        darkMode 
                            ? 'rotate-0 scale-100 opacity-100' 
                            : '-rotate-90 scale-0 opacity-0'
                    }`}
                />
            </div>
        </button>
    );
};

export default ThemeToggle;
