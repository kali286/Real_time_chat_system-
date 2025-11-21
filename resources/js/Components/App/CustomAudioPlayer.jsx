import { PauseCircleIcon, PlayCircleIcon, SpeakerWaveIcon, SpeakerXMarkIcon } from "@heroicons/react/24/solid";
import { useEffect, useRef, useState } from "react";

const CustomAudioPlayer = ({ file, showVolume = true}) => {
    const audioRef = useRef();
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(1);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    const togglePlayPause = () => {
        const audio = audioRef.current;
        if (!audio) return;
        if(isPlaying) {
            audio.pause();
        } else {
            audio.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleVolumeChange = (e) => {
        const v = Number(e.target.value);
        if (audioRef.current) audioRef.current.volume = v;
        setVolume(v);
    };

    const handleTimeUpdate = (e) => {
        const audio = audioRef.current;
        if (!audio) return;
        setCurrentTime(audio.currentTime || 0);
    };

    const handleLoadedMetadata = (e) => {
        const audio = audioRef.current;
        if (!audio) return;
        setDuration(audio.duration || 0);
        setIsLoading(false);
    };

    const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
        }
    };

    const handleSeekChange = (e) => {
        const time = Number(e.target.value);
        if (audioRef.current) audioRef.current.currentTime = time;
        setCurrentTime(time);
    };

    // If metadata didn't load for some reason (duration = 0), try loading via a temporary Audio instance
    useEffect(() => {
        if (!file || !file.url) return;
        if (Number.isFinite(duration) && duration > 0) return;
        let tmp = new Audio(file.url);
        const onLoaded = () => {
            if (tmp && tmp.duration) setDuration(tmp.duration);
        };
        tmp.addEventListener('loadedmetadata', onLoaded);
        // try to load
        tmp.load();
        return () => {
            try { tmp.pause(); } catch (e) {}
            tmp.removeEventListener('loadedmetadata', onLoaded);
            tmp = null;
        };
    }, [file && file.url]);

    const fmtTime = (t) => {
        if (!Number.isFinite(t) || t < 0) return '00:00';
        const m = Math.floor(t / 60).toString().padStart(2,'0');
        const s = Math.floor(t % 60).toString().padStart(2,'0');
        return `${m}:${s}`;
    };

    // Initialize audio element when component mounts
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        // Force load metadata
        audio.load();
        
        return () => {
            if (audio) {
                audio.pause();
                audio.currentTime = 0;
            }
        };
    }, [file?.url]);

    return (
        <div className="w-full min-w-[280px] max-w-md flex flex-col gap-2 py-3 px-4 rounded-lg bg-white/10 dark:bg-black/20 backdrop-blur-sm border border-white/20 dark:border-white/10">
            <audio
                ref={audioRef}
                src={file.url}
                preload="metadata"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleEnded}
                className="hidden"
            />
            
            {/* Top row: Play button and progress bar */}
            <div className="flex items-center gap-3">
                <button 
                    onClick={togglePlayPause}
                    disabled={isLoading}
                    className="flex-shrink-0 hover:scale-110 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isPlaying ? (
                        <PauseCircleIcon className="w-10 h-10 text-white drop-shadow-lg" />
                    ) : (
                        <PlayCircleIcon className="w-10 h-10 text-white drop-shadow-lg" />
                    )}
                </button>
                
                <div className="flex-1 flex flex-col gap-1">
                    <input
                        type="range"
                        min="0"
                        max={Number.isFinite(duration) ? duration : 0}
                        step="0.1"
                        value={Math.min(currentTime, Number.isFinite(duration) ? duration : currentTime)}
                        onChange={handleSeekChange}
                        className="w-full h-1 bg-white/30 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                    />
                    <div className="flex justify-between items-center">
                        {isLoading ? (
                            <span className="text-xs text-white/70 italic">Loading audio...</span>
                        ) : (
                            <>
                                <span className="text-xs text-white/90 font-medium">
                                    {fmtTime(currentTime)}
                                </span>
                                <span className="text-xs text-white/70">
                                    {fmtTime(duration)}
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Bottom row: Volume control */}
            {showVolume && (
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => {
                            const newVolume = volume > 0 ? 0 : 1;
                            if (audioRef.current) audioRef.current.volume = newVolume;
                            setVolume(newVolume);
                        }}
                        className="flex-shrink-0 hover:scale-110 transition-transform"
                    >
                        {volume > 0 ? (
                            <SpeakerWaveIcon className="w-5 h-5 text-white/80" />
                        ) : (
                            <SpeakerXMarkIcon className="w-5 h-5 text-white/80" />
                        )}
                    </button>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        onChange={handleVolumeChange}
                        className="flex-1 h-1 bg-white/30 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                    />
                    <span className="text-xs text-white/70 w-10 text-right">
                        {Math.round(volume * 100)}%
                    </span>
                </div>
            )}
        </div>
    );
};

export default CustomAudioPlayer;
