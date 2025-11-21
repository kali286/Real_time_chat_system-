import { XMarkIcon } from '@heroicons/react/24/outline';

export default function ReplyMessageBar({ message, onClose }) {
    if (!message) return null;

    const hasAttachments = message.attachments && message.attachments.length > 0;
    const firstImage = message.attachments?.find(a => a.mime?.startsWith('image/'));
    const firstAudio = message.attachments?.find(a => a.mime?.startsWith('audio/'));
    const firstFile = message.attachments?.find(a => !a.mime?.startsWith('image/') && !a.mime?.startsWith('audio/'));

    return (
        <div className="bg-gray-100 dark:bg-gray-800 border-l-4 border-blue-500 p-3 mb-2 rounded-r-lg">
            <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                            Replying to {message.sender?.name || 'Unknown'}
                        </span>
                    </div>
                    
                    {/* Show message text if available */}
                    {message.message && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                            {message.message}
                        </p>
                    )}

                    {/* Show attachment type if available */}
                    {!message.message && hasAttachments && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            {firstImage && (
                                <>
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                                    </svg>
                                    Photo
                                </>
                            )}
                            {firstAudio && !firstImage && (
                                <>
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                                    </svg>
                                    Voice message
                                </>
                            )}
                            {firstFile && !firstImage && !firstAudio && (
                                <>
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                    </svg>
                                    {firstFile.name || 'File'}
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Thumbnail for image */}
                {firstImage && (
                    <img 
                        src={firstImage.url} 
                        alt="Preview" 
                        className="w-12 h-12 rounded object-cover flex-shrink-0"
                    />
                )}

                {/* Close button */}
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
                >
                    <XMarkIcon className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
}
