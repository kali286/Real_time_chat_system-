import { useEffect, useState } from 'react';
import { XMarkIcon, PhoneIcon, VideoCameraIcon } from '@heroicons/react/24/solid';

export default function IncomingCallModal({ call, onAccept, onReject }) {
    const [ringing, setRinging] = useState(false);

    useEffect(() => {
        if (call) {
            setRinging(true);
            // Play ringtone if available
            const audio = new Audio('/sounds/ringtone.mpga');
            audio.loop = true;
            audio.play().catch(() => { });

            return () => {
                audio.pause();
                audio.currentTime = 0;
            };
        }
    }, [call]);

    if (!call) return null;

    const caller = call.initiator;
    const isVideoCall = call.is_video;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 w-96 text-center animate-scaleIn">
                {/* Avatar */}
                <div className="relative inline-block mb-6">
                    <div className={`w-32 h-32 rounded-full overflow-hidden border-4 ${ringing ? 'border-green-500 animate-pulse' : 'border-gray-300'}`}>
                        {caller.avatar_url ? (
                            <img
                                src={caller.avatar_url}
                                alt={caller.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-4xl font-bold">
                                {caller.name.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                    {/* Pulsing rings */}
                    {ringing && (
                        <>
                            <div className="absolute inset-0 rounded-full border-4 border-green-500 animate-ping opacity-20"></div>
                            <div className="absolute inset-0 rounded-full border-4 border-green-500 animate-ping opacity-10" style={{ animationDelay: '0.5s' }}></div>
                        </>
                    )}
                </div>

                {/* Caller Name */}
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {caller.name}
                </h2>

                {/* Call Type */}
                <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400 mb-8">
                    {isVideoCall ? (
                        <>
                            <VideoCameraIcon className="w-5 h-5" />
                            <span>Incoming Video Call</span>
                        </>
                    ) : (
                        <>
                            <PhoneIcon className="w-5 h-5" />
                            <span>Incoming Audio Call</span>
                        </>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 justify-center">
                    {/* Reject Button */}
                    <button
                        onClick={onReject}
                        className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg transform transition hover:scale-110 active:scale-95"
                    >
                        <XMarkIcon className="w-8 h-8" />
                    </button>

                    {/* Accept Button */}
                    <button
                        onClick={onAccept}
                        className="w-20 h-20 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center shadow-lg transform transition hover:scale-110 active:scale-95 animate-bounce"
                    >
                        {isVideoCall ? (
                            <VideoCameraIcon className="w-10 h-10" />
                        ) : (
                            <PhoneIcon className="w-10 h-10" />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
