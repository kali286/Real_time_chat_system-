import { useState, useRef, useEffect } from 'react';

const VoiceNotePlayer = ({ file }) => {
    const audioRef = useRef();
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

    const togglePlayPause = () => {
        const audio = audioRef.current;
        if (!audio) return;
        
        if (isPlaying) {
            audio.pause();
        } else {
            audio.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleTimeUpdate = () => {
        const audio = audioRef.current;
        if (!audio) return;
        setCurrentTime(audio.currentTime || 0);
    };

    const handleLoadedMetadata = () => {
        const audio = audioRef.current;
        if (!audio) return;
        // audio.duration can be NaN until the data is available; guard against that
        const d = Number.isFinite(audio.duration) ? audio.duration : 0;
        setDuration(d || 0);
    };

    // Sometimes loadedmetadata doesn't fire early enough for streamed files — also respond to loadeddata/canplay
    const handleLoadedData = () => {
        const audio = audioRef.current;
        if (!audio) return;
        if (Number.isFinite(audio.duration) && audio.duration > 0) {
            setDuration(audio.duration);
        }
    };

    const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
        }
    };

    const fmtTime = (t) => {
        if (!Number.isFinite(t) || t < 0) return '0:00';
        const m = Math.floor(t / 60);
        const s = Math.floor(t % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        // Force reload of the source so metadata events are triggered for new files
        try {
            audio.load();
            // If metadata already available, ensure duration is captured
            if (Number.isFinite(audio.duration) && audio.duration > 0) {
                setDuration(audio.duration);
            }
        } catch (e) {
            // ignore load errors here — we'll rely on event handlers
        }

        return () => {
            if (audio) {
                audio.pause();
                audio.currentTime = 0;
            }
        };
    }, [file?.url]);

    // Calculate progress percentage
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <audio
                ref={audioRef}
                src={file.url}
                preload="metadata"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onLoadedData={handleLoadedData}
                onCanPlay={handleLoadedData}
                onEnded={handleEnded}
                className="hidden"
            />
            
            {/* Play/Pause Button */}
            <button 
                onClick={togglePlayPause}
                className="inline-flex self-center items-center p-2 text-sm font-medium text-center rounded-lg bg-transparent focus:ring-4 focus:outline-none" 
                type="button"
            >
                {isPlaying ? (
                    <svg className="w-4 h-4 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 12 16">
                        <path d="M3 0H2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2Zm7 0H9a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2Z"/>
                    </svg>
                ) : (
                    <svg className="w-4 h-4 text-current" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 14 16">
                        <path d="M0 .984v14.032a1 1 0 0 0 1.506.845l12.006-7.016a.974.974 0 0 0 0-1.69L1.506.139A1 1 0 0 0 0 .984Z"/>
                    </svg>
                )}
            </button>
            
            {/* Waveform Visualization */}
            <svg aria-hidden="true" className="w-[145px] md:w-[185px] md:h-[40px]" viewBox="0 0 185 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect y="17" width="3" height="6" rx="1.5" fill={progress > 0 ? "#6B7280" : "#E5E7EB"} className={progress > 0 ? "dark:fill-white" : "dark:fill-gray-500"}/>
                <rect x="7" y="15.5" width="3" height="9" rx="1.5" fill={progress > 3.78 ? "#6B7280" : "#E5E7EB"} className={progress > 3.78 ? "dark:fill-white" : "dark:fill-gray-500"}/>
                <rect x="14" y="6.5" width="3" height="27" rx="1.5" fill={progress > 7.57 ? "#6B7280" : "#E5E7EB"} className={progress > 7.57 ? "dark:fill-white" : "dark:fill-gray-500"}/>
                <rect x="21" y="6.5" width="3" height="27" rx="1.5" fill={progress > 11.35 ? "#6B7280" : "#E5E7EB"} className={progress > 11.35 ? "dark:fill-white" : "dark:fill-gray-500"}/>
                <rect x="28" y="3" width="3" height="34" rx="1.5" fill={progress > 15.14 ? "#6B7280" : "#E5E7EB"} className={progress > 15.14 ? "dark:fill-white" : "dark:fill-gray-500"}/>
                <rect x="35" y="3" width="3" height="34" rx="1.5" fill={progress > 18.92 ? "#6B7280" : "#E5E7EB"} className={progress > 18.92 ? "dark:fill-white" : "dark:fill-gray-500"}/>
                <rect x="42" y="5.5" width="3" height="29" rx="1.5" fill={progress > 22.70 ? "#6B7280" : "#E5E7EB"} className={progress > 22.70 ? "dark:fill-white" : "dark:fill-gray-500"}/>
                <rect x="49" y="10" width="3" height="20" rx="1.5" fill={progress > 26.49 ? "#6B7280" : "#E5E7EB"} className={progress > 26.49 ? "dark:fill-white" : "dark:fill-gray-500"}/>
                <rect x="56" y="13.5" width="3" height="13" rx="1.5" fill={progress > 30.27 ? "#6B7280" : "#E5E7EB"} className={progress > 30.27 ? "dark:fill-white" : "dark:fill-gray-500"}/>
                <rect x="63" y="16" width="3" height="8" rx="1.5" fill={progress > 34.05 ? "#6B7280" : "#E5E7EB"} className={progress > 34.05 ? "dark:fill-white" : "dark:fill-gray-500"}/>
                <rect x="70" y="12.5" width="3" height="15" rx="1.5" fill={progress > 37.84 ? "#6B7280" : "#E5E7EB"} className={progress > 37.84 ? "dark:fill-white" : "dark:fill-gray-500"}/>
                <rect x="77" y="3" width="3" height="34" rx="1.5" fill={progress > 41.62 ? "#6B7280" : "#E5E7EB"} className={progress > 41.62 ? "dark:fill-white" : "dark:fill-gray-500"}/>
                <rect x="84" y="3" width="3" height="34" rx="1.5" fill={progress > 45.41 ? "#6B7280" : "#E5E7EB"} className={progress > 45.41 ? "dark:fill-white" : "dark:fill-gray-500"}/>
                <rect x="91" y="0.5" width="3" height="39" rx="1.5" fill={progress > 49.19 ? "#6B7280" : "#E5E7EB"} className={progress > 49.19 ? "dark:fill-white" : "dark:fill-gray-500"}/>
                <rect x="98" y="0.5" width="3" height="39" rx="1.5" fill={progress > 52.97 ? "#6B7280" : "#E5E7EB"} className={progress > 52.97 ? "dark:fill-white" : "dark:fill-gray-500"}/>
                <rect x="105" y="2" width="3" height="36" rx="1.5" fill={progress > 56.76 ? "#6B7280" : "#E5E7EB"} className={progress > 56.76 ? "dark:fill-white" : "dark:fill-gray-500"}/>
                <rect x="112" y="6.5" width="3" height="27" rx="1.5" fill={progress > 60.54 ? "#6B7280" : "#E5E7EB"} className={progress > 60.54 ? "dark:fill-white" : "dark:fill-gray-500"}/>
                <rect x="119" y="9" width="3" height="22" rx="1.5" fill={progress > 64.32 ? "#6B7280" : "#E5E7EB"} className={progress > 64.32 ? "dark:fill-white" : "dark:fill-gray-500"}/>
                <rect x="126" y="11.5" width="3" height="17" rx="1.5" fill={progress > 68.11 ? "#6B7280" : "#E5E7EB"} className={progress > 68.11 ? "dark:fill-white" : "dark:fill-gray-500"}/>
                <rect x="133" y="2" width="3" height="36" rx="1.5" fill={progress > 71.89 ? "#6B7280" : "#E5E7EB"} className={progress > 71.89 ? "dark:fill-white" : "dark:fill-gray-500"}/>
                <rect x="140" y="2" width="3" height="36" rx="1.5" fill={progress > 75.68 ? "#6B7280" : "#E5E7EB"} className={progress > 75.68 ? "dark:fill-white" : "dark:fill-gray-500"}/>
                <rect x="147" y="7" width="3" height="26" rx="1.5" fill={progress > 79.46 ? "#6B7280" : "#E5E7EB"} className={progress > 79.46 ? "dark:fill-white" : "dark:fill-gray-500"}/>
                <rect x="154" y="9" width="3" height="22" rx="1.5" fill={progress > 83.24 ? "#6B7280" : "#E5E7EB"} className={progress > 83.24 ? "dark:fill-white" : "dark:fill-gray-500"}/>
                <rect x="161" y="9" width="3" height="22" rx="1.5" fill={progress > 87.03 ? "#6B7280" : "#E5E7EB"} className={progress > 87.03 ? "dark:fill-white" : "dark:fill-gray-500"}/>
                <rect x="168" y="13.5" width="3" height="13" rx="1.5" fill={progress > 90.81 ? "#6B7280" : "#E5E7EB"} className={progress > 90.81 ? "dark:fill-white" : "dark:fill-gray-500"}/>
                <rect x="175" y="16" width="3" height="8" rx="1.5" fill={progress > 94.59 ? "#6B7280" : "#E5E7EB"} className={progress > 94.59 ? "dark:fill-white" : "dark:fill-gray-500"}/>
                <rect x="182" y="17.5" width="3" height="5" rx="1.5" fill={progress > 98.38 ? "#6B7280" : "#E5E7EB"} className={progress > 98.38 ? "dark:fill-white" : "dark:fill-gray-500"}/>
                {/* Progress indicator */}
                <rect x={66 + (progress * 1.16)} y="16" width="8" height="8" rx="4" fill={isPlaying ? '#FFFFFF' : '#1C64F2'} />
            </svg>
            
            {/* Time Display: current / total */}
            <span className="inline-flex self-center items-center p-2 text-sm font-medium text-gray-900 dark:text-white">
                {fmtTime(currentTime)} / {fmtTime(duration)}
            </span>
        </div>
    );
};

export default VoiceNotePlayer;
