import React from 'react';

export default function OfflineFallback({ onRetry }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-slate-900">
      <div className="max-w-lg mx-4 text-center">
        <div className="inline-flex items-center justify-center w-36 h-36 rounded-full bg-rose-50 dark:bg-rose-900/30 mb-6 mx-auto">
          {/* Simple disconnected wifi SVG */}
          <svg xmlns="http://www.w3.org/2000/svg" className="w-20 h-20 text-rose-600 dark:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.28 8.28a16 16 0 0120.44 0M4.93 10.93a12 12 0 0114.14 0M7.76 13.76a8 8 0 018.48 0M10.6 16.6a4 4 0 012.8 0M12 20l.01-.01" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" className="opacity-0" />
          </svg>
        </div>

        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Connection lost</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
          It looks like your network connection dropped. Some features (video/audio) require an active connection.
          Please check your network and try again.
        </p>

        <div className="flex items-center justify-center gap-3">
          <button onClick={onRetry} className="px-4 py-2 rounded-md bg-emerald-500 text-white hover:bg-emerald-600">Retry</button>
          <a href="mailto:support@kalichat.local" className="px-4 py-2 rounded-md border border-gray-200 dark:border-slate-700 text-sm text-gray-700 dark:text-gray-200">Contact support</a>
        </div>
      </div>
    </div>
  );
}
