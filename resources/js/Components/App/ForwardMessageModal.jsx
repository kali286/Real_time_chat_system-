import { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { MagnifyingGlassIcon, XMarkIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';
import axios from 'axios';
import { useEventBus } from '@/EventBus';
import { router } from '@inertiajs/react';

export default function ForwardMessageModal({ message, isOpen, onClose }) {
    const [conversations, setConversations] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedConversations, setSelectedConversations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [forwarding, setForwarding] = useState(false);
    const { emit } = useEventBus();

    useEffect(() => {
        if (isOpen) {
            loadConversations();
        }
    }, [isOpen]);

    const loadConversations = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/conversations');
            const data = response.data || [];
            setConversations(data);
        } catch (error) {
            console.error('Error loading conversations:', error);
            emit('toast.show', 'Failed to load conversations');
        } finally {
            setLoading(false);
        }
    };

    const filteredConversations = conversations.filter(conv => {
        const name = conv.name || '';
        return name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const toggleSelection = (convId) => {
        setSelectedConversations(prev => {
            if (prev.includes(convId)) {
                return prev.filter(id => id !== convId);
            } else {
                return [...prev, convId];
            }
        });
    };

    const handleForward = async () => {
        if (selectedConversations.length === 0) {
            emit('toast.show', 'Please select at least one conversation');
            return;
        }

        setForwarding(true);
        try {
            await axios.post('/message/forward', {
                message_id: message.id,
                conversation_ids: selectedConversations,
            });

            emit('toast.show', `Message forwarded to ${selectedConversations.length} conversation(s)`);
            
            // Navigate to the first forwarded conversation
            if (selectedConversations.length > 0) {
                const firstConvId = selectedConversations[0];
                const firstConv = conversations.find(c => c.id === firstConvId);
                
                if (firstConv) {
                    // Close modal first
                    onClose();
                    setSelectedConversations([]);
                    setSearchQuery('');
                    
                    // Navigate using Inertia router
                    if (firstConv.is_group) {
                        router.visit(`/group/${firstConvId}`);
                    } else {
                        router.visit(`/user/${firstConvId}`);
                    }
                } else {
                    onClose();
                    setSelectedConversations([]);
                    setSearchQuery('');
                }
            } else {
                onClose();
                setSelectedConversations([]);
                setSearchQuery('');
            }
        } catch (error) {
            console.error('Error forwarding message:', error);
            emit('toast.show', 'Failed to forward message');
        } finally {
            setForwarding(false);
        }
    };

    const handleClose = () => {
        setSelectedConversations([]);
        setSearchQuery('');
        onClose();
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={handleClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/50" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-xl transition-all">
                                {/* Header */}
                                <div className="flex items-center justify-between mb-4">
                                    <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                                        Forward Message
                                    </Dialog.Title>
                                    <button
                                        onClick={handleClose}
                                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                    >
                                        <XMarkIcon className="h-6 w-6" />
                                    </button>
                                </div>

                                {/* Search */}
                                <div className="relative mb-4">
                                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search conversations..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                {/* Selected Count */}
                                {selectedConversations.length > 0 && (
                                    <div className="mb-3 text-sm text-blue-600 dark:text-blue-400">
                                        {selectedConversations.length} selected
                                    </div>
                                )}

                                {/* Conversations List */}
                                <div className="max-h-96 overflow-y-auto mb-4 space-y-1">
                                    {loading ? (
                                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                            Loading conversations...
                                        </div>
                                    ) : filteredConversations.length === 0 ? (
                                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                            No conversations found
                                        </div>
                                    ) : (
                                        filteredConversations.map((conv) => {
                                            const isSelected = selectedConversations.includes(conv.id);
                                            const isGroup = conv.is_group;
                                            const displayName = conv.name;
                                            const avatarUrl = isGroup ? '/api/placeholder/40/40' : (conv.user?.avatar_url || '/api/placeholder/40/40');

                                            return (
                                                <button
                                                    key={`conv-${conv.id}`}
                                                    onClick={() => toggleSelection(conv.id)}
                                                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                                                        isSelected
                                                            ? 'bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-500'
                                                            : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border-2 border-transparent'
                                                    }`}
                                                >
                                                    {/* Avatar */}
                                                    <div className="relative shrink-0">
                                                        <img
                                                            src={avatarUrl}
                                                            alt=""
                                                            className="w-10 h-10 rounded-full object-cover"
                                                        />
                                                        {isSelected && (
                                                            <div className="absolute -top-1 -right-1 bg-blue-500 rounded-full p-0.5">
                                                                <CheckIcon className="h-3 w-3 text-white" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    {/* Name and Info */}
                                                    <div className="flex-1 min-w-0 text-left">
                                                        <div className="font-medium text-gray-900 dark:text-white truncate">
                                                            {displayName}
                                                        </div>
                                                        {isGroup && (
                                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                                Group • {conv.users?.length || 0} members
                                                            </div>
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleClose}
                                        className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleForward}
                                        disabled={selectedConversations.length === 0 || forwarding}
                                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                                    >
                                        {forwarding ? (
                                            'Forwarding...'
                                        ) : (
                                            <>
                                                <PaperAirplaneIcon className="h-5 w-5" />
                                                Forward
                                            </>
                                        )}
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
