import React from 'react';

const THEMES = [
    { id: 'default', label: 'Default', previewClass: 'from-emerald-500 to-sky-500' },
    { id: 'ocean', label: 'Ocean', previewClass: 'from-sky-500 to-indigo-500' },
    { id: 'sunset', label: 'Sunset', previewClass: 'from-rose-500 to-orange-400' },
    { id: 'forest', label: 'Forest', previewClass: 'from-emerald-600 to-lime-500' },
];

const ChatThemeSwitcher = ({ chatTheme = 'default', setChatTheme }) => {
    if (!setChatTheme) return null;

    return (
        <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-gray-500 dark:text-slate-400">Chat theme</span>
            <div className="flex items-center gap-2 overflow-x-auto">
                {THEMES.map((theme) => (
                    <button
                        key={theme.id}
                        type="button"
                        onClick={() => setChatTheme(theme.id)}
                        className={`relative h-7 w-7 rounded-full bg-gradient-to-br ${theme.previewClass} border-2 transition-all duration-200 shadow-sm flex-shrink-0 ${chatTheme === theme.id
                                ? 'border-emerald-400 ring-2 ring-emerald-400/60 scale-110'
                                : 'border-transparent opacity-70 hover:opacity-100 hover:scale-105'
                            }`}
                        aria-label={theme.label}
                        title={theme.label}
                    >
                        {chatTheme === theme.id && (
                            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
                                ✓
                            </span>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default ChatThemeSwitcher;
