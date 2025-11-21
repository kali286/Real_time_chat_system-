import React, { useState, useRef } from 'react';
import axios from 'axios';
import { useEventBus } from '@/EventBus';

const StatusModal = ({ show, onClose }) => {
    const { emit } = useEventBus();
    const [imageFile, setImageFile] = useState(null);
    const [caption, setCaption] = useState('');
    const [musicFile, setMusicFile] = useState(null);
    const [musicUrl, setMusicUrl] = useState('');
    const [musicQuery, setMusicQuery] = useState('');
    const [musicResults, setMusicResults] = useState([]);
    const [isSearchingMusic, setIsSearchingMusic] = useState(false);
    const [selectedTrack, setSelectedTrack] = useState(null);
    const musicSearchTimeoutRef = useRef(null);
    const [audioDuration, setAudioDuration] = useState(null);
    const [musicStartSeconds, setMusicStartSeconds] = useState(0);
    const audioPreviewRef = useRef(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    if (!show) return null;

    const reset = () => {
        setImageFile(null);
        setCaption('');
        setMusicFile(null);
        setMusicUrl('');
        setMusicQuery('');
        setMusicResults([]);
        setSelectedTrack(null);
        setAudioDuration(null);
        setMusicStartSeconds(0);
        setError('');
    };

    // Compute preview source for the selected/attached audio
    const previewSrc = (() => {
        if (musicFile) {
            try {
                return URL.createObjectURL(musicFile);
            } catch (e) {
                return null;
            }
        }
        if (musicUrl) {
            return musicUrl;
        }
        return null;
    })();

    const searchOnlineMusic = async (term) => {
        if (!term || term.trim().length < 2) {
            setMusicResults([]);
            setIsSearchingMusic(false);
            return;
        }

        try {
            setIsSearchingMusic(true);
            // Using iTunes Search API (no API key required) to fetch music previews
            const response = await axios.get('https://itunes.apple.com/search', {
                params: {
                    term: term,
                    media: 'music',
                    limit: 8,
                },
            });

            const items = (response.data && response.data.results) ? response.data.results : [];

            const mapped = items
                .filter((track) => track.previewUrl)
                .map((track) => ({
                    id: track.trackId || track.collectionId || track.artistId,
                    name: track.trackName || track.collectionName || 'Unknown title',
                    artist: track.artistName || 'Unknown artist',
                    previewUrl: track.previewUrl,
                }));

            setMusicResults(mapped);
        } catch (err) {
            console.error('Music search failed', err);
        } finally {
            setIsSearchingMusic(false);
        }
    };

    const handleMusicQueryChange = (e) => {
        const value = e.target.value;
        setMusicQuery(value);
        setSelectedTrack(null);
        setMusicUrl('');

        if (musicSearchTimeoutRef.current) {
            clearTimeout(musicSearchTimeoutRef.current);
        }

        if (!value || value.trim().length < 2) {
            setMusicResults([]);
            return;
        }

        musicSearchTimeoutRef.current = setTimeout(() => {
            searchOnlineMusic(value.trim());
        }, 500);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!imageFile) {
            setError('Please select a photo for your status.');
            return;
        }

        const formData = new FormData();
        formData.append('image', imageFile);
        if (caption) formData.append('caption', caption);
        if (musicFile) formData.append('music_file', musicFile);
        if (!musicFile && musicUrl) formData.append('music_url', musicUrl);
        // If we have any music attached and know duration, send segment info (30s window)
        if ((musicFile || musicUrl) && audioDuration) {
            formData.append('music_start_seconds', Math.max(0, Math.round(musicStartSeconds || 0)));
            formData.append('music_duration_seconds', 30);
        }

        try {
            setSubmitting(true);
            await axios.post(route('status.store'), formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            emit('toast.show', 'Status posted');
            emit('status.refresh');
            reset();
            if (onClose) onClose();
        } catch (err) {
            console.error('Status create failed', err);
            const msg = err.response?.data?.message || 'Failed to post status';
            setError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 border border-gray-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">New Status</h2>
                    <button
                        type="button"
                        onClick={() => { reset(); onClose && onClose(); }}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                        ×
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                            Photo
                        </label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                            className="block w-full text-sm text-gray-900 dark:text-gray-100 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 dark:file:bg-slate-700 dark:file:text-emerald-300"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                            Caption (optional)
                        </label>
                        <input
                            type="text"
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            className="w-full rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            maxLength={255}
                        />
                    </div>

                    <div className="border-t border-gray-200 dark:border-slate-700 pt-3 mt-2 space-y-3">
                        <p className="text-xs font-medium text-gray-500 dark:text-slate-400">
                            Optional: add your favourite song (like WhatsApp)
                        </p>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                Audio from your device
                            </label>
                            <input
                                type="file"
                                accept="audio/*"
                                onChange={(e) => setMusicFile(e.target.files?.[0] || null)}
                                className="block w-full text-sm text-gray-900 dark:text-gray-100 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 dark:file:bg-slate-700 dark:file:text-emerald-300"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                Or search online music
                            </label>
                            <input
                                type="text"
                                placeholder="Type song or artist name..."
                                value={musicQuery}
                                onChange={handleMusicQueryChange}
                                className="w-full rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />

                            {isSearchingMusic && (
                                <p className="mt-1 text-[11px] text-gray-500 dark:text-slate-400">
                                    Searching songs...
                                </p>
                            )}

                            {!isSearchingMusic && musicResults.length > 0 && (
                                <div className="mt-2 max-h-40 overflow-y-auto rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
                                    {musicResults.map((track) => (
                                        <button
                                            key={track.id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedTrack(track);
                                                setMusicUrl(track.previewUrl);
                                            }}
                                            className={`w-full text-left px-3 py-2 text-xs border-b last:border-b-0 border-gray-100 dark:border-slate-800 hover:bg-emerald-50 dark:hover:bg-slate-800/60 ${selectedTrack && selectedTrack.id === track.id ? 'bg-emerald-50 dark:bg-slate-800/60' : ''}`}
                                        >
                                            <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                                                {track.name}
                                            </div>
                                            <div className="text-[11px] text-gray-500 dark:text-slate-400 truncate">
                                                {track.artist}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {selectedTrack && (
                                <p className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-300">
                                    Selected: {selectedTrack.name} · {selectedTrack.artist}
                                </p>
                            )}
                        </div>

                        {/* Hidden audio element used only to detect duration for segment selection */}
                        {previewSrc && (
                            <audio
                                ref={audioPreviewRef}
                                src={previewSrc}
                                className="hidden"
                                onLoadedMetadata={() => {
                                    if (audioPreviewRef.current && audioPreviewRef.current.duration) {
                                        const dur = audioPreviewRef.current.duration;
                                        setAudioDuration(dur);
                                        setMusicStartSeconds(0);
                                    }
                                }}
                            />
                        )}

                        {previewSrc && audioDuration && (
                            <div className="mt-3 space-y-1">
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-200">
                                    Choose favourite part (30 seconds)
                                </label>
                                <input
                                    type="range"
                                    min={0}
                                    max={Math.max(0, Math.floor(audioDuration - 30))}
                                    step={1}
                                    value={Math.min(musicStartSeconds, Math.max(0, Math.floor(audioDuration - 30)))}
                                    onChange={(e) => setMusicStartSeconds(Number(e.target.value) || 0)}
                                    className="w-full"
                                />
                                <p className="text-[11px] text-gray-500 dark:text-slate-400">
                                    Starts at {Math.floor(musicStartSeconds)}s of ~{Math.floor(audioDuration)}s
                                </p>
                            </div>
                        )}
                    </div>

                    {error && (
                        <p className="text-xs text-red-500">{error}</p>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => { reset(); onClose && onClose(); }}
                            className="px-3 py-1.5 rounded-md text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-400 shadow-md transition-all ${submitting ? 'opacity-70 cursor-wait' : ''}`}
                        >
                            {submitting ? 'Posting...' : 'Post'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default StatusModal;
