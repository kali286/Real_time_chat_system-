import { FaceSmileIcon, HandThumbUpIcon, PaperAirplaneIcon, PaperClipIcon, PhotoIcon } from "@heroicons/react/24/solid";
import AudioRecorder from "./AudioRecorder";
import { useState, useRef, useEffect } from "react";
import { usePage } from "@inertiajs/react";
import NewMessageInput from "./NewMessageInput";
import ReplyMessageBar from "./ReplyMessageBar";
import axios from "axios";
import { useEventBus } from "../../EventBus";
import data from '@emoji-mart/data'
import Picker from '@emoji-mart/react';


const MessageInput = ({ conversation = null, replyTo = null, onClearReply = null }) => {
    const { emit } = useEventBus();
    const page = usePage();
    const currentUser = page.props.auth.user;
    const [newMessage, setNewMessage] = useState("");
    const [inputErrorMessage, setInputErrorMessage] = useState("");
    const [messageSending, setMessageSending] = useState(false);
    const [attachments, setAttachments] = useState([]);
    const attachmentsRef = useRef(attachments);
    const recorderRef = useRef(null);
    const typingLastSentRef = useRef(0);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const emojiPickerRef = useRef(null);
    const fileInputRef = useRef(null);
    const imageInputRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
                setShowEmojiPicker(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleEmojiSelect = (emoji) => {
        setNewMessage(prev => prev + emoji.native);
        setShowEmojiPicker(false);
    };

    const handleFileChange = (e, type = 'file') => {
        const files = Array.from(e.target.files);
        if (files.length) {
            setAttachments(prev => [...prev, ...files.map(file => ({ file, type }))]);
        }
    };

    const handleAudioFile = (file) => {
        if (!file) return;
        setAttachments(prev => [...prev, { file, type: 'audio' }]);
    };

    // keep a ref in sync so we can read latest attachments synchronously
    useEffect(() => {
        attachmentsRef.current = attachments;
    }, [attachments]);

    const notifyTyping = () => {
        if (!conversation || (!conversation.is_user && !conversation.is_group)) {
            return;
        }

        if (typeof window === 'undefined' || !window.Echo) {
            return;
        }

        const now = Date.now();
        if (now - (typingLastSentRef.current || 0) < 1000) {
            return;
        }
        typingLastSentRef.current = now;

        let channel = null;

        if (conversation.is_group) {
            channel = `message.group.${conversation.id}`;
        } else if (conversation.is_user) {
            const ids = [parseInt(currentUser.id, 10), parseInt(conversation.id, 10)]
                .sort((a, b) => a - b);
            channel = `message.user.${ids.join('-')}`;
        }

        if (!channel) return;

        try {
            console.log('[typing] sending whisper', { channel, from: currentUser.id, convoId: conversation.id, is_group: !!conversation.is_group });
            window.Echo.private(channel).whisper('typing', {
                from_user_id: currentUser.id,
                from_name: currentUser.name,
                conversation_id: conversation.id,
                is_group: !!conversation.is_group,
                at: now,
            });
        } catch (e) {
            console.error('Failed to send typing indicator', e);
        }
    };

    const removeAttachment = (index) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleSendMessage = async () => {
        // Clear reply after sending
        const replyToId = replyTo?.id || null;

        //Toast implementation can goes here
        emit('toast.show', 'Message sent!');
        if (messageSending) {
            return;
        }

        // Clear any previous error
        setInputErrorMessage("");

        // If recording, stop and get file before attempting to send
        if (recorderRef.current && typeof recorderRef.current.isRecording === 'function' && recorderRef.current.isRecording()) {
            try {
                const recordedFile = await recorderRef.current.stopAndGetFile();
                // ensure attachment added immediately for optimistic render
                // add to attachmentsRef snapshot for immediate use
                attachmentsRef.current = [...attachmentsRef.current, { file: recordedFile, type: 'audio' }];
            } catch (e) {
                console.error('Error stopping recorder', e);
            }
        }

        // Validate message content or attachments
        const currentAtt = attachmentsRef.current || attachments;
        if (newMessage.trim() === "" && (!currentAtt || currentAtt.length === 0)) {
            setInputErrorMessage("Please provide a message or upload attachments.");
            return;
        }

        // Validate conversation exists
        if (!conversation || (!conversation.is_user && !conversation.is_group)) {
            setInputErrorMessage("Please select a valid conversation first.");
            return;
        }

        const formData = new FormData();
        formData.append('message', newMessage);
        if (replyToId) {
            formData.append('reply_to_id', replyToId);
        }

        // Use latest attachments snapshot (including any just-recorded file)
        const currentAttachments = attachmentsRef.current || attachments;
        // Add attachments to form data
        currentAttachments.forEach((attachment) => {
            formData.append('attachments[]', attachment.file);
        });

        // Create optimistic local message so UI shows immediately
        const tempId = `tmp-${Date.now()}`;
        const optimisticMessage = {
            id: tempId,
            message: newMessage,
            sender_id: currentUser.id,
            sender: currentUser,
            receiver_id: conversation.is_user ? conversation.id : null,
            group_id: conversation.is_group ? conversation.id : null,
            attachments: (currentAttachments || []).map((a, idx) => {
                const mime = a.file.type || '';
                // Provide friendly captions for optimistic attachments
                let displayName = a.file.name || '';
                if (mime.startsWith('audio/')) {
                    displayName = 'Audio';
                } else if (mime.startsWith('image/')) {
                    // keep original filename when available, else show 'Image'
                    displayName = displayName || 'Image';
                } else if (!displayName) {
                    displayName = 'File';
                }

                return {
                    id: `tmp-att-${idx}`,
                    name: displayName,
                    url: URL.createObjectURL(a.file),
                    mime,
                    size: a.file.size,
                };
            }),
            // use numeric timestamp to avoid timezone parsing issues
            created_at: Date.now(),
            temp_id: tempId,
        };

        // emit local event so Home can render it immediately
        emit('message.local', optimisticMessage);
        console.log('Conversation:', {
            id: conversation?.id,
            is_user: conversation?.is_user,
            is_group: conversation?.is_group,
            name: conversation?.name,
            description: conversation?.description,
            users: conversation?.users,
            raw: conversation
        });

        if (!conversation) {
            setInputErrorMessage("No conversation selected");
            return;
        }

        // Check conversation type and ID
        if (conversation.is_user) {
            console.log('Sending to user:', conversation.id);
            formData.append("receiver_id", conversation.id);
        } else if (conversation.is_group) {
            console.log('Sending to group:', conversation.id);
            formData.append("group_id", conversation.id);
        } else {
            console.error('Invalid conversation type:', conversation);
            setInputErrorMessage("Invalid conversation type");
            return;
        }

        // Debug formData
        console.log('Form data entries:', Array.from(formData.entries()));

        setMessageSending(true);
        // include temp id so server response can be correlated (optional)
        formData.append('temp_id', tempId);
        axios.post(route("message.store"), formData, {
            onUploadProgress: (ProgressEvent) => {
                const progress = Math.round(
                    (ProgressEvent.loaded / ProgressEvent.total) * 100
                );
                console.log(progress);
            }
        }).then((response) => {
            // clear local state; server broadcast will deliver the final message (including temp_id)
            setNewMessage("");
            setAttachments([]);
            setMessageSending(false);
            setInputErrorMessage("");
            if (onClearReply) {
                onClearReply();
            }
        }).catch((error) => {
            console.error('message.store error', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            setMessageSending(false);

            // Show validation errors from Laravel
            if (error.response?.status === 422) {
                const errors = error.response.data.errors;
                console.log('Validation errors:', errors);
                const firstError = Object.values(errors)[0]?.[0] || 'Invalid data provided';
                setInputErrorMessage(firstError);
            } else {
                setInputErrorMessage('Failed to send message. Please try again.');
            }

            // Clear error after 5 seconds
            setTimeout(() => setInputErrorMessage(""), 5000);
        })
    }
    return (
        <div className="flex flex-col border-t border-gray-200 dark:border-slate-700/50 bg-gradient-to-b from-white to-gray-50 dark:from-slate-800 dark:to-slate-900 py-3 shadow-inner transition-colors duration-300">
            {/* Reply Bar */}
            {replyTo && (
                <div className="px-3">
                    <ReplyMessageBar
                        message={replyTo}
                        onClose={onClearReply}
                    />
                </div>
            )}

            {/* Attachment previews */}
            {attachments.length > 0 && (
                <div className="flex gap-2 p-2 border-b border-gray-200 dark:border-slate-700/50 overflow-x-auto bg-gray-100 dark:bg-slate-800/50 rounded-t-lg">
                    {attachments.map((attachment, index) => (
                        <div key={index} className="relative group flex-shrink-0">
                            {attachment.type === 'image' ? (
                                <img
                                    src={URL.createObjectURL(attachment.file)}
                                    className="h-16 w-16 sm:h-20 sm:w-20 object-cover rounded"
                                    alt="attachment preview"
                                />
                            ) : attachment.type === 'audio' ? (
                                <div className="h-16 w-40 sm:h-20 sm:w-48 bg-gray-200 dark:bg-slate-800 rounded flex items-center justify-center p-2">
                                    <audio controls src={URL.createObjectURL(attachment.file)} className="w-full" />
                                </div>
                            ) : (
                                <div className="h-16 w-16 sm:h-20 sm:w-20 bg-gray-300 dark:bg-slate-700 rounded flex items-center justify-center">
                                    <PaperClipIcon className="w-6 h-6 text-gray-500 dark:text-slate-400" />
                                </div>
                            )}
                            <button
                                onClick={() => removeAttachment(index)}
                                className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                            >
                                <span className="sr-only">Remove</span>
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
                {/* Left Icons: Attachment, Image, Voice */}
                <div className="flex items-center gap-1 sm:gap-2">
                    <button className="p-1.5 sm:p-2 text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 relative transition-colors transform hover:scale-110">
                        <PaperClipIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            onChange={(e) => handleFileChange(e, 'file')}
                            className="absolute left-0 top-0 right-0 bottom-0 z-20 opacity-0 cursor-pointer"
                        />
                    </button>

                    <button className="p-1.5 sm:p-2 text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 relative transition-colors transform hover:scale-110">
                        <PhotoIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                        <input
                            ref={imageInputRef}
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={(e) => handleFileChange(e, 'image')}
                            className="absolute left-0 top-0 right-0 bottom-0 z-20 opacity-0 cursor-pointer"
                        />
                    </button>

                    {/* Audio recorder button */}
                    <AudioRecorder ref={recorderRef} fileReady={handleAudioFile} />
                </div>

                {/* Message Input Area - Grows to fill space */}
                <div className="flex-1 min-w-[200px] max-w-full">
                    <div className="flex items-center gap-2 w-full bg-white/80 dark:bg-slate-800/50 border border-gray-300 dark:border-slate-600/50 rounded-2xl px-3 py-2 sm:px-4 sm:py-3 backdrop-blur-sm shadow-inner transition-colors duration-300">
                        <div className="flex-1 min-w-0">
                            <NewMessageInput
                                value={newMessage}
                                onSend={handleSendMessage}
                                onChange={(ev) => {
                                    setNewMessage(ev.target.value);
                                    notifyTyping();
                                }}
                            />
                            {inputErrorMessage && (
                                <p className="text-xs text-red-400 mt-1">{inputErrorMessage}</p>
                            )}
                        </div>

                        <button
                            onClick={handleSendMessage}
                            disabled={messageSending}
                            className={`inline-flex items-center gap-1 sm:gap-2 shrink-0 ${messageSending ? 'opacity-70 cursor-wait' : 'hover:scale-105 active:scale-95'} bg-emerald-500 hover:bg-emerald-400 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-full shadow-lg transition-all duration-200`}
                            aria-label="Send message"
                        >
                            {messageSending ? (
                                <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5 text-white" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                </svg>
                            ) : (
                                <PaperAirplaneIcon className="w-4 h-4 sm:w-5 sm:h-5 -rotate-45" />
                            )}
                            <span className="text-xs sm:text-sm hidden xs:inline">Send</span>
                        </button>
                    </div>
                </div>

                {/* Right Icons: Emoji, Like */}
                <div className="flex items-center gap-1 relative">
                    <button
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="p-1.5 sm:p-2 text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                    >
                        <FaceSmileIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>

                    <button
                        onClick={() => setNewMessage(prev => prev + '👍')}
                        className="p-1.5 sm:p-2 text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                    >
                        <HandThumbUpIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>

                    {showEmojiPicker && (
                        <div
                            ref={emojiPickerRef}
                            className="absolute bottom-full right-0 z-50 mb-2"
                        >
                            <Picker
                                data={data}
                                onEmojiSelect={handleEmojiSelect}
                                theme="dark"
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

};

export default MessageInput;