import UserAvatar from "./UserAvatar";
import { usePage } from "@inertiajs/react";
import ReactMarkdown from "react-markdown";
import React, { useState, useEffect, useRef } from "react";
import { formatMessageDateLong, getTanzaniaTime } from "@/helpers";
import VoiceNotePlayer from "./VoiceNotePlayer";
import ForwardMessageModal from "./ForwardMessageModal";
import ReportMessageModal from "./ReportMessageModal";
import ImageLightbox from './ImageLightbox';
import FileAttachment from './FileAttachment';
import axios from 'axios';
import { useEventBus } from '@/EventBus';
const THEME_BUBBLE_CLASSES = {
  default: {
    mine: 'bg-emerald-500 border-emerald-200',
    theirs: 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600',
  },
  ocean: {
    mine: 'bg-sky-500 border-sky-200',
    theirs: 'bg-sky-100 dark:bg-slate-700 border-sky-200 dark:border-slate-600',
  },
  sunset: {
    mine: 'bg-gradient-to-r from-rose-500 to-orange-400 border-rose-200',
    theirs: 'bg-rose-50 dark:bg-rose-800 border-rose-200 dark:border-rose-700',
  },
  forest: {
    mine: 'bg-emerald-600 border-emerald-300',
    theirs: 'bg-emerald-50 dark:bg-emerald-800 border-emerald-700',
  },
};


const MessageItem = ({ message, onlineUsers = {}, selectedConversation = null, chatTheme = 'default' }) => {
  const currentUser = usePage().props.auth.user;
  const { emit } = useEventBus();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [imageHovered, setImageHovered] = useState(null);
  const [forwardModalOpen, setForwardModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [deliveryStatus, setDeliveryStatus] = useState(null);
  const dropdownRef = useRef(null);

  const isMyMessage = message.sender_id === currentUser.id;

  // Determine recipient and their online status
  const getRecipientId = () => {
    if (message.group_id) {
      // For group messages, we can't determine individual delivery
      return null;
    }
    // For private messages, recipient is the other user
    return isMyMessage ? message.receiver_id : message.sender_id;
  };

  const recipientId = getRecipientId();

  // Update delivery status reactively when online status changes
  useEffect(() => {
    if (!isMyMessage) {
      setDeliveryStatus(null);
      return;
    }

    const isRecipientOnline = recipientId ? !!onlineUsers[recipientId] : false;
    setDeliveryStatus(isRecipientOnline ? 'Delivered' : 'Sent');
  }, [onlineUsers, recipientId, isMyMessage]);

  // Determine if message has been read (try several possible shapes)
  const isRead = !!(
    message.reads?.length > 0 ||
    message.read_at ||
    message.read_by_count > 0 ||
    message.is_read
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  const ts = getTanzaniaTime(message.created_at);
  const timeStr = !isNaN(ts.getTime())
    ? ts.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
    : formatMessageDateLong(message.created_at);

  const handleDelete = () => {
    if (!window.confirm("Are you sure you want to delete this message?")) return;

    axios
      .delete(route('message.destroy', message.id))
      .then((res) => {
        emit('message.deleted', message);
        emit('toast.show', 'Message deleted successfully');
        setDropdownOpen(false);
      })
      .catch((err) => {
        console.error(err);
        emit('toast.show', 'Failed to delete message');
      });
  };

  const handleCopy = () => {
    if (message.message) {
      navigator.clipboard.writeText(message.message);
      emit('toast.show', 'Message copied to clipboard');
    }
    setDropdownOpen(false);
  };

  const handleReply = () => {
    emit('message.reply', message);
    setDropdownOpen(false);
  };

  const handleForward = () => {
    setForwardModalOpen(true);
    setDropdownOpen(false);
  };

  const handleReport = () => {
    setReportModalOpen(true);
    setDropdownOpen(false);
  };

  const hasImages = message.attachments?.some(a => a.mime?.startsWith('image/'));
  const hasAudio = message.attachments?.some(a => a.mime?.startsWith('audio/'));
  const hasFiles = message.attachments?.some(a => !a.mime?.startsWith('image/') && !a.mime?.startsWith('audio/'));
  const images = message.attachments?.filter(a => a.mime?.startsWith('image/')) || [];
  const audioFiles = message.attachments?.filter(a => a.mime?.startsWith('audio/')) || [];
  const files = message.attachments?.filter(a => !a.mime?.startsWith('image/') && !a.mime?.startsWith('audio/')) || [];
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);

  const theme = THEME_BUBBLE_CLASSES[chatTheme] || THEME_BUBBLE_CLASSES.default;
  const baseBubbleClasses = 'inline-block flex-col leading-1.5 p-3 sm:p-4 border rounded-e-xl rounded-es-xl break-words whitespace-pre-wrap';
  const bubbleClasses = isMyMessage
    ? `${baseBubbleClasses} ${theme.mine}`
    : `${baseBubbleClasses} ${theme.theirs}`;

  return (
    <div className={`flex items-center gap-2.5 mb-4 ${isMyMessage ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <img
        className="w-8 h-8 rounded-full object-cover shrink-0"
        src={message.sender.avatar_url || `/api/placeholder/32/32`}
        alt={message.sender.name}
      />

      <div className="flex flex-col gap-1 w-fit max-w-[85%] sm:max-w-[75%] md:max-w-[60%] lg:max-w-[55%] min-w-[6rem]">
        {/* Name + timestamp (outside the bubble) */}
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">{isMyMessage ? 'You' : message.sender.name}</span>
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400">{timeStr}</span>
        </div>

        {/* Bubble */}
        <div className={bubbleClasses}>
          {/* Text message */}
          {message.message && (
            <p className={`text-sm font-normal ${isMyMessage ? 'text-black dark:text-white' : 'text-gray-900 dark:text-gray-100'}`} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              <ReactMarkdown>{message.message}</ReactMarkdown>
            </p>
          )}

          {/* Images */}
          {images.length > 0 && (
            <div className={`${images.length > 1 ? 'grid gap-4 grid-cols-2' : ''} my-2.5`}>
              {images.map((image, idx) => (
                <div key={image.id || image.url || idx} className="group relative">
                  <div className="absolute inset-0 bg-gray-900/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg flex items-center justify-center">
                    <button onClick={() => { setLightboxSrc(image.url); setLightboxOpen(true); }} className="inline-flex items-center justify-center rounded-full h-10 w-10 bg-white/30 hover:bg-white/50 focus:ring-4 focus:outline-none dark:text-white focus:ring-gray-50">
                      <svg className="w-5 h-5 text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 18">
                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 1v11m0 0 4-4m-4 4L4 8m11 4v3a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-3" />
                      </svg>
                    </button>
                  </div>
                  <img onClick={() => { setLightboxSrc(image.url); setLightboxOpen(true); }} src={image.url} alt={image.name} className="rounded-lg max-h-[200px] object-cover w-full" />
                </div>
              ))}
            </div>
          )}

          {/* Voice notes */}
          {audioFiles.length > 0 && audioFiles.map((audio) => (
            <div key={audio.id} className="my-2.5">
              <VoiceNotePlayer file={{ url: audio.url }} />
            </div>
          ))}

          {/* File attachments */}
          {files.length > 0 && files.map((file, idx) => (
            <div key={file.id || idx} className="my-2.5">
              <FileAttachment file={file} />
            </div>
          ))}

          {/* URL preview: simple rendition if message contains urlPreview object */}
          {message.url_preview && (
            <a href={message.url_preview.url} className="bg-gray-50 dark:bg-gray-600 rounded-xl p-4 mb-2 hover:bg-gray-200 dark:hover:bg-gray-500 block">
              {message.url_preview.image && <img src={message.url_preview.image} className="rounded-lg mb-2" />}
              <span className="text-sm font-medium text-gray-900 dark:text-white mb-2 block">{message.url_preview.title}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{message.url_preview.domain}</span>
            </a>
          )}
        </div>

        {/* Delivery / status */}
        <span className="text-sm font-normal text-gray-500 dark:text-gray-400">{isMyMessage ? (isRead ? 'Read' : deliveryStatus || 'Sent') : 'Delivered'}</span>
      </div>

      {/* Dropdown — vertically centered and closer to the bubble */}
      <div className="relative flex items-center shrink-0 ml-1" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="inline-flex self-center items-center p-1 text-sm font-medium text-center text-gray-500 bg-transparent rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none"
          type="button"
          aria-label="message actions"
        >
          <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 4 15">
            <path d="M3.5 1.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm0 6.041a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm0 5.959a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
          </svg>
        </button>

        {dropdownOpen && (
          <div className="z-10 absolute right-0 top-10 bg-white divide-y divide-gray-100 rounded-lg shadow-sm w-40 dark:bg-gray-700 dark:divide-gray-600">
            <ul className="py-2 text-sm text-gray-700 dark:text-gray-200" aria-labelledby="dropdownMenuIconButton">
              <li><button onClick={handleReply} className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600">Reply</button></li>
              <li><button onClick={handleForward} className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600">Forward</button></li>
              <li><button onClick={handleCopy} className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600">Copy</button></li>
              <li><button onClick={handleReport} className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600">Report</button></li>
              <li><button onClick={handleDelete} className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 text-red-600">Delete</button></li>
            </ul>
          </div>
        )}
      </div>

      {/* Modals */}
      <ForwardMessageModal
        message={message}
        isOpen={forwardModalOpen}
        onClose={() => setForwardModalOpen(false)}
      />

      <ReportMessageModal
        message={message}
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
      />
      {lightboxOpen && (
        <ImageLightbox src={lightboxSrc} onClose={() => { setLightboxOpen(false); setLightboxSrc(null); }} />
      )}
    </div>
  );
};

export default MessageItem;