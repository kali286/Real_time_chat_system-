import { MicrophoneIcon, StopCircleIcon } from "@heroicons/react/24/solid";
import { useRef, useState, useEffect, forwardRef, useImperativeHandle } from "react";

// fileReady: function(file) -> called when recording complete with File object
const AudioRecorder = forwardRef(({ fileReady = () => {} }, ref) => {
    const [recording, setRecording] = useState(false);
    const [seconds, setSeconds] = useState(0);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);
    const resolveRef = useRef(null);

    useEffect(() => {
        return () => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
            clearInterval(timerRef.current);
        };
    }, []);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Choose the best supported audio mime type for MediaRecorder.
            const candidates = [
                'audio/webm;codecs=opus',
                'audio/ogg;codecs=opus',
                'audio/webm',
                'audio/ogg'
            ];
            let mimeType = '';
            for (const c of candidates) {
                if (typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(c)) {
                    mimeType = c;
                    break;
                }
            }
            const options = mimeType ? { mimeType } : undefined;
            const mr = options ? new MediaRecorder(stream, options) : new MediaRecorder(stream);
            mediaRecorderRef.current = mr;
            chunksRef.current = [];

            mr.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mr.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || mr.mimeType || 'audio/webm' });
                // Derive extension from mimeType if possible
                const ext = blob.type.includes('ogg') ? 'ogg' : blob.type.includes('webm') ? 'webm' : 'audio';
                const filename = `audio-${Date.now()}.${ext}`;
                const file = new File([blob], filename, { type: blob.type });
                // hand back file to parent
                fileReady(file);
                // resolve any pending stop promise
                if (resolveRef.current) {
                  resolveRef.current(file);
                  resolveRef.current = null;
                }
                // stop all tracks
                try {
                    stream.getTracks().forEach((t) => t.stop());
                } catch (e) {
                    // ignore
                }
            };

            mr.start();
            setRecording(true);
            setSeconds(0);
            timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
        } catch (err) {
            console.error('Microphone access denied or not available', err);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        setRecording(false);
        clearInterval(timerRef.current);
    };

    const onMicrophoneClick = async () => {
        if (recording) {
            stopRecording();
        } else {
            await startRecording();
        }
    };

    const fmt = (s) => {
        const mm = Math.floor(s / 60).toString().padStart(2, '0');
        const ss = (s % 60).toString().padStart(2, '0');
        return `${mm}:${ss}`;
    };

        // Expose imperative methods to parent
        useImperativeHandle(ref, () => ({
            isRecording: () => recording,
            stopAndGetFile: () => {
                return new Promise((resolve) => {
                    resolveRef.current = resolve;
                    stopRecording();
                });
            }
        }));

        return (
                <div className="flex items-center gap-2">
                        <button onClick={onMicrophoneClick} className="p-1 text-gray-400 hover:text-gray-200">
                                {recording ? (
                                        <StopCircleIcon className="w-6 text-red-500" />
                                ) : (
                                        <MicrophoneIcon className="w-5 h-5 text-emerald-400" />
                                )}
                        </button>
                        {recording && <span className="text-xs text-slate-300">REC {fmt(seconds)}</span>}
                </div>
        );

});

export default AudioRecorder;