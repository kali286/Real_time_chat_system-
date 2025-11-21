import React, { useState, useEffect, useRef } from 'react';
import UserAvatar from './UserAvatar';

const StatusViewerModal = ({ show, statuses, onClose, currentUserId, onAddStatus }) => {
    if (!show || !statuses || !statuses.length) return null;

    const [currentIndex, setCurrentIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const audioRef = useRef(null);

    // Reset index when opening or when statuses list changes
    useEffect(() => {
        if (show) {
            setCurrentIndex(0);
            setProgress(0);
        }
    }, [show, statuses.length]);

    // Auto-advance and 30s progress per status
    useEffect(() => {
        if (!show || !statuses || !statuses.length) return;

        const duration = 30000; // 30 seconds per status
        const startedAt = Date.now();

        setProgress(0);

        const interval = setInterval(() => {
            const elapsed = Date.now() - startedAt;
            const pct = Math.min(100, (elapsed / duration) * 100);
            setProgress(pct);
        }, 250);

        const timeout = setTimeout(() => {
            clearInterval(interval);
            setProgress(100);
            setTimeout(() => {
                if (currentIndex < statuses.length - 1) {
                    setCurrentIndex((idx) => Math.min(idx + 1, statuses.length - 1));
                } else {
                    onClose && onClose();
                }
            }, 150);
        }, duration);

        return () => {
            clearInterval(interval);
            clearTimeout(timeout);
        };
    }, [show, currentIndex, statuses.length, onClose]);

    // Auto-play music segment (if any) for the current status
    useEffect(() => {
        if (!show || !statuses || !statuses.length) return;
        const current = statuses[currentIndex];
        if (!current || !current.music_url) return;

        const audio = audioRef.current;
        if (!audio) return;

        const startSeconds = current.music_start_seconds || 0;
        const maxSegment = 30; // hard limit 30s
        const configuredDuration = current.music_duration_seconds || maxSegment;
        const playSeconds = Math.min(configuredDuration, maxSegment);

        let stopTimeout;

        const playSegment = async () => {
            try {
                audio.currentTime = startSeconds;
                await audio.play();
            } catch (err) {
                // Autoplay may be blocked by browser; fail silently
                console.warn('Status audio autoplay failed', err);
            }

            stopTimeout = setTimeout(() => {
                try {
                    audio.pause();
                } catch (e) {
                    // ignore
                }
            }, playSeconds * 1000);
        };

        playSegment();

        return () => {
            if (stopTimeout) clearTimeout(stopTimeout);
            try {
                audio.pause();
            } catch (e) {
                // ignore
            }
        };
    }, [show, currentIndex, statuses]);

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget && onClose) {
            onClose();
        }
    };

    const status = statuses[currentIndex];
    const user = status && status.user ? status.user : null;
    const isOwn = status && currentUserId && status.user_id === currentUserId;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
            onClick={handleBackdropClick}
        >
            <div className="relative w-full h-full max-w-md mx-auto flex flex-col bg-black text-white">
                {/* Progress bar segments */}
                <div className="pt-4 px-4 flex gap-1">
                    {statuses.map((s, idx) => (
                        <div key={s.id || idx} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-white transition-[width] duration-200 linear"
                                style={{
                                    width:
                                        idx < currentIndex
                                            ? '100%'
                                            : idx === currentIndex
                                                ? `${progress}%`
                                                : '0%',
                                }}
                            />
                        </div>
                    ))}
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                        {user && (
                            <UserAvatar user={user} profile={false} />
                        )}
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold">
                                {isOwn ? 'My Status' : (user ? user.name : 'Status')}
                            </span>
                            <span className="text-[11px] text-gray-300">
                                {/* Could be replaced with "time ago" later */}
                                Just now
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {isOwn && onAddStatus && (
                            <button
                                type="button"
                                onClick={() => {
                                    onClose && onClose();
                                    onAddStatus();
                                }}
                                className="px-2 py-1 rounded-full text-[11px] font-medium bg-white/10 hover:bg-white/20 border border-white/30"
                            >
                                Add status
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-gray-300 hover:text-white text-xl leading-none px-2"
                            aria-label="Close status viewer"
                        >
                            ×
                        </button>
                    </div>
                </div>

                {/* Image content */}
                <div className="flex-1 flex items-center justify-center px-2 pb-4">
                    {status && status.image_url && (
                        <img
                            src={status.image_url}
                            alt={status.caption || 'Status'}
                            className="max-h-full max-w-full object-contain rounded-xl"
                        />
                    )}
                </div>

                {/* Caption + Music */}
                <div className="px-4 pb-6 space-y-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
                    {status && status.caption && (
                        <p className="text-sm text-gray-100 break-words">
                            {status.caption}
                        </p>
                    )}

                    {status && status.music_url && (
                        <div className="space-y-1">
                            <p className="text-xs text-emerald-300 uppercase tracking-wide">
                                Music
                            </p>
                            <audio
                                ref={audioRef}
                                controls
                                src={status.music_url}
                                className="w-full"
                            >
                                Your browser does not support the audio element.
                            </audio>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StatusViewerModal;
