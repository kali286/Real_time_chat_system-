import { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import { useEventBus } from '@/EventBus';

const REPORT_REASONS = [
    { id: 'spam', label: 'Spam or misleading', description: 'Unwanted commercial content or spam' },
    { id: 'harassment', label: 'Harassment or hate speech', description: 'Bullying, threats, or hateful content' },
    { id: 'violence', label: 'Violence or dangerous content', description: 'Promotes violence or self-harm' },
    { id: 'nudity', label: 'Nudity or sexual content', description: 'Contains inappropriate sexual content' },
    { id: 'privacy', label: 'Privacy violation', description: 'Shares private information without consent' },
    { id: 'scam', label: 'Scam or fraud', description: 'Attempts to deceive or defraud' },
    { id: 'other', label: 'Other', description: 'Something else not listed here' },
];

export default function ReportMessageModal({ message, isOpen, onClose }) {
    const [selectedReason, setSelectedReason] = useState('');
    const [additionalInfo, setAdditionalInfo] = useState('');
    const [reporting, setReporting] = useState(false);
    const { emit } = useEventBus();

    const handleReport = async () => {
        if (!selectedReason) {
            emit('toast.show', 'Please select a reason for reporting');
            return;
        }

        setReporting(true);
        try {
            await axios.post('/message/report', {
                message_id: message.id,
                reason: selectedReason,
                additional_info: additionalInfo,
            });

            emit('toast.show', 'Message reported successfully. Our team will review it.');
            handleClose();
        } catch (error) {
            console.error('Error reporting message:', error);
            emit('toast.show', 'Failed to report message. Please try again.');
        } finally {
            setReporting(false);
        }
    };

    const handleClose = () => {
        setSelectedReason('');
        setAdditionalInfo('');
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
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center justify-center w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full">
                                            <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
                                        </div>
                                        <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                                            Report Message
                                        </Dialog.Title>
                                    </div>
                                    <button
                                        onClick={handleClose}
                                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                    >
                                        <XMarkIcon className="h-6 w-6" />
                                    </button>
                                </div>

                                {/* Description */}
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                    Help us understand what's wrong with this message. Your report will be reviewed by our team.
                                </p>

                                {/* Message Preview */}
                                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg mb-4">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Reported message:</p>
                                    <p className="text-sm text-gray-900 dark:text-white truncate">
                                        {message.message || '(Attachment)'}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        From: {message.sender?.name}
                                    </p>
                                </div>

                                {/* Reasons */}
                                <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                                    {REPORT_REASONS.map((reason) => (
                                        <button
                                            key={reason.id}
                                            onClick={() => setSelectedReason(reason.id)}
                                            className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                                                selectedReason === reason.id
                                                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                                                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                                            }`}
                                        >
                                            <div className="font-medium text-gray-900 dark:text-white text-sm">
                                                {reason.label}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                {reason.description}
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                {/* Additional Info */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Additional information (optional)
                                    </label>
                                    <textarea
                                        value={additionalInfo}
                                        onChange={(e) => setAdditionalInfo(e.target.value)}
                                        placeholder="Provide more details about why you're reporting this message..."
                                        rows="3"
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                                    />
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
                                        onClick={handleReport}
                                        disabled={!selectedReason || reporting}
                                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {reporting ? 'Reporting...' : 'Submit Report'}
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
