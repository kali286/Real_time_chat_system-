import { useEffect, useState, useRef } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import {
    PhoneXMarkIcon,
    MicrophoneIcon,
    VideoCameraIcon,
    VideoCameraSlashIcon,
    SpeakerWaveIcon,
    SpeakerXMarkIcon,
} from '@heroicons/react/24/solid';
import axios from 'axios';

export default function VideoCallModal({ call, onClose }) {
    const [localTracks, setLocalTracks] = useState({ audio: null, video: null });
    const [remoteUsers, setRemoteUsers] = useState({});
    const [isMicMuted, setIsMicMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isSpeakerOff, setIsSpeakerOff] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    const [isConnecting, setIsConnecting] = useState(true);

    const clientRef = useRef(null);
    const localVideoRef = useRef(null);
    const startTimeRef = useRef(null);

    // Initialize Agora Client
    useEffect(() => {
        if (!call) return;

        const initAgora = async () => {
            try {
                // Create Agora client
                const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
                clientRef.current = client;

                // Get token from backend
                const response = await axios.get(route('call.token', call.id));
                console.log('🔑 Token response:', response.data);

                const { token, channel, uid, appId } = response.data;

                console.log('📱 Joining Agora with:', { appId, channel, uid, hasToken: !!token });

                // Join channel
                await client.join(appId, channel, token, uid);

                // Create local tracks
                const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
                const videoTrack = call.is_video ? await AgoraRTC.createCameraVideoTrack() : null;

                setLocalTracks({ audio: audioTrack, video: videoTrack });

                // Publish tracks
                if (videoTrack) {
                    await client.publish([audioTrack, videoTrack]);
                } else {
                    await client.publish([audioTrack]);
                }

                // Play local video
                if (videoTrack && localVideoRef.current) {
                    videoTrack.play(localVideoRef.current);
                }

                // Handle remote users
                client.on('user-published', async (user, mediaType) => {
                    await client.subscribe(user, mediaType);

                    if (mediaType === 'video') {
                        setRemoteUsers(prev => ({
                            ...prev,
                            [user.uid]: { ...prev[user.uid], videoTrack: user.videoTrack }
                        }));
                    }

                    if (mediaType === 'audio') {
                        setRemoteUsers(prev => ({
                            ...prev,
                            [user.uid]: { ...prev[user.uid], audioTrack: user.audioTrack }
                        }));
                        user.audioTrack?.play();
                    }
                });

                client.on('user-unpublished', (user, mediaType) => {
                    if (mediaType === 'video') {
                        setRemoteUsers(prev => {
                            const updated = { ...prev };
                            if (updated[user.uid]) {
                                updated[user.uid].videoTrack = null;
                            }
                            return updated;
                        });
                    }
                });

                client.on('user-left', (user) => {
                    setRemoteUsers(prev => {
                        const updated = { ...prev };
                        delete updated[user.uid];
                        return updated;
                    });
                });

                setIsConnecting(false);
                startTimeRef.current = Date.now();

            } catch (error) {
                console.error('Error initializing Agora:', error);
                setIsConnecting(false);
                try {
                    // If navigator reports offline or the error message indicates network down, treat as network offline
                    const isNavigatorOffline = (typeof navigator !== 'undefined' && navigator.onLine === false);
                    const msg = (error && error.message) ? String(error.message).toLowerCase() : '';
                    const indicatesNetworkDown = msg.includes('network') || msg.includes('rtcp') || msg.includes("can't create rtcpeerconnections") || msg.includes('failed to fetch');

                    if (isNavigatorOffline || indicatesNetworkDown) {
                        const ev = new CustomEvent('app.network.offline', { detail: { error } });
                        window.dispatchEvent(ev);
                    } else {
                        // Non-network Agora error — signal a call-specific error so UI can show a toast instead of full offline overlay
                        const ev = new CustomEvent('app.call.error', { detail: { error } });
                        window.dispatchEvent(ev);
                    }
                } catch (e) {
                    // ignore
                }
            }
        };

        initAgora();

        // Cleanup
        return () => {
            if (localTracks.audio) {
                localTracks.audio.close();
            }
            if (localTracks.video) {
                localTracks.video.close();
            }
            if (clientRef.current) {
                clientRef.current.leave();
                try {
                    const ev = new CustomEvent('app.network.online');
                    window.dispatchEvent(ev);
                } catch (e) {
                    // ignore
                }
            }
        };
    }, [call]);

    // Call duration timer
    useEffect(() => {
        if (!startTimeRef.current) return;

        const interval = setInterval(() => {
            const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
            setCallDuration(duration);
        }, 1000);

        return () => clearInterval(interval);
    }, [startTimeRef.current]);

    // Play remote videos when they become available
    useEffect(() => {
        Object.entries(remoteUsers).forEach(([uid, user]) => {
            if (user.videoTrack) {
                const videoElement = document.getElementById(`remote-video-${uid}`);
                if (videoElement) {
                    user.videoTrack.play(videoElement);
                }
            }
        });
    }, [remoteUsers]);

    const toggleMic = async () => {
        if (localTracks.audio) {
            await localTracks.audio.setEnabled(!isMicMuted);
            setIsMicMuted(!isMicMuted);

            // Update backend
            axios.post(route('call.toggleMic', call.id), {
                is_muted: !isMicMuted
            }).catch(console.error);
        }
    };

    const toggleVideo = async () => {
        if (localTracks.video) {
            await localTracks.video.setEnabled(!isVideoOff);
            setIsVideoOff(!isVideoOff);

            // Update backend
            axios.post(route('call.toggleVideo', call.id), {
                is_off: !isVideoOff
            }).catch(console.error);
        }
    };

    const toggleSpeaker = () => {
        setIsSpeakerOff(!isSpeakerOff);
        Object.values(remoteUsers).forEach(user => {
            if (user.audioTrack) {
                user.audioTrack.setVolume(isSpeakerOff ? 100 : 0);
            }
        });
    };

    const endCall = async () => {
        try {
            await axios.post(route('call.leave', call.id));
            onClose();
        } catch (error) {
            console.error('Error ending call:', error);
            onClose();
        }
    };

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    if (!call) return null;

    const hasRemoteUsers = Object.keys(remoteUsers).length > 0;

    return (
        <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col">
            {/* Header */}
            <div className="bg-gray-800/90 backdrop-blur-sm px-6 py-4 flex items-center justify-between">
                <div>
                    <h2 className="text-white text-xl font-semibold">
                        {call.call_type === 'group' ? 'Group Call' : call.initiator.name}
                    </h2>
                    <p className="text-gray-400 text-sm">
                        {call.status === 'ringing' && !hasRemoteUsers
                            ? 'Ringing...'
                            : (isConnecting ? 'Connecting...' : formatDuration(callDuration))}
                    </p>
                </div>
            </div>

            {/* Video Grid */}
            <div className="flex-1 relative overflow-hidden">
                {isConnecting ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-green-500 mx-auto mb-4"></div>
                            <p className="text-white text-lg">Connecting...</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Remote Videos - Main Grid */}
                        {hasRemoteUsers ? (
                            <div className={`grid gap-2 p-4 h-full ${Object.keys(remoteUsers).length === 1 ? 'grid-cols-1' :
                                    Object.keys(remoteUsers).length === 2 ? 'grid-cols-2' :
                                        Object.keys(remoteUsers).length <= 4 ? 'grid-cols-2 grid-rows-2' :
                                            'grid-cols-3'
                                }`}>
                                {Object.entries(remoteUsers).map(([uid, user]) => (
                                    <div key={uid} className="relative bg-gray-800 rounded-lg overflow-hidden">
                                        {user.videoTrack ? (
                                            <div id={`remote-video-${uid}`} className="w-full h-full"></div>
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-700">
                                                <div className="text-white text-6xl font-bold">
                                                    {/* Avatar placeholder */}
                                                    <VideoCameraSlashIcon className="w-20 h-20" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center text-white">
                                    <div className="animate-pulse mb-4">
                                        <PhoneXMarkIcon className="w-16 h-16 mx-auto text-gray-400" />
                                    </div>
                                    <p className="text-lg">Waiting for others to join...</p>
                                </div>
                            </div>
                        )}

                        {/* Local Video - Picture in Picture */}
                        {call.is_video && (
                            <div className="absolute bottom-24 right-6 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden shadow-2xl border-2 border-gray-600">
                                {!isVideoOff ? (
                                    <div ref={localVideoRef} className="w-full h-full"></div>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900">
                                        <VideoCameraSlashIcon className="w-12 h-12 text-gray-400" />
                                    </div>
                                )}
                                <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-white text-xs">
                                    You
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Controls */}
            <div className="bg-gray-800/90 backdrop-blur-sm px-6 py-6">
                <div className="flex justify-center items-center gap-4">
                    {/* Mic Toggle */}
                    <button
                        onClick={toggleMic}
                        className={`w-14 h-14 rounded-full flex items-center justify-center transition transform hover:scale-110 ${isMicMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
                            }`}
                    >
                        <MicrophoneIcon className={`w-5 h-5 text-white ${isMicMuted ? 'line-through' : ''}`} />
                    </button>

                    {/* Video Toggle (if video call) */}
                    {call.is_video && (
                        <button
                            onClick={toggleVideo}
                            className={`w-14 h-14 rounded-full flex items-center justify-center transition transform hover:scale-110 ${isVideoOff ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
                                }`}
                        >
                            {isVideoOff ? (
                                <VideoCameraSlashIcon className="w-5 h-5 text-white" />
                            ) : (
                                <VideoCameraIcon className="w-5 h-5 text-white" />
                            )}
                        </button>
                    )}

                    {/* End Call */}
                    <button
                        onClick={endCall}
                        className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition transform hover:scale-110 shadow-lg"
                    >
                        <PhoneXMarkIcon className="w-5 h-5 text-white" />
                    </button>

                    {/* Speaker Toggle */}
                    <button
                        onClick={toggleSpeaker}
                        className={`w-14 h-14 rounded-full flex items-center justify-center transition transform hover:scale-110 ${isSpeakerOff ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
                            }`}
                    >
                        {isSpeakerOff ? (
                            <SpeakerXMarkIcon className="w-5 h-5 text-white" />
                        ) : (
                            <SpeakerWaveIcon className="w-5 h-5 text-white" />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
