import { PhoneIcon, VideoCameraIcon } from '@heroicons/react/24/solid';
import { useState } from 'react';

export default function CallButton({ conversation, onCallInitiate, type = 'video' }) {
    const [isInitiating, setIsInitiating] = useState(false);

    const handleClick = async () => {
        if (isInitiating) return;
        
        setIsInitiating(true);
        try {
            await onCallInitiate(conversation, type === 'video');
        } catch (error) {
            console.error('Error initiating call:', error);
        } finally {
            setIsInitiating(false);
        }
    };

    const isVideo = type === 'video';

    return (
        <button
            onClick={handleClick}
            disabled={isInitiating}
            className={`p-2 rounded-full transition-all duration-200 transform hover:scale-110 ${
                isInitiating 
                    ? 'bg-gray-300 cursor-not-allowed' 
                    : isVideo
                    ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg'
                    : 'bg-green-500 hover:bg-green-600 text-white shadow-md hover:shadow-lg'
            }`}
            title={isVideo ? 'Start Video Call' : 'Start Audio Call'}
        >
            {isInitiating ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : isVideo ? (
                <VideoCameraIcon className="w-5 h-5" />
            ) : (
                <PhoneIcon className="w-5 h-5" />
            )}
        </button>
    );
}
