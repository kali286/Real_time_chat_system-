import ChatLayout from '@/Layouts/ChatLayout';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/solid';
import ConversationHeader from '@/Components/App/ConversationHeader';
import MessageItem from '@/Components/App/MessageItem';
import MessageInput from '@/Components/App/MessageInput';
import IncomingCallModal from '@/Components/Call/IncomingCallModal';
import VideoCallModal from '@/Components/Call/VideoCallModal';
import { useEventBus } from '@/EventBus';
import axios from 'axios';

function Home({ selectedConversation = null, messages = null, onlineUsers = {} }) {
  const [localMessages, setLocalMessages] = useState([]);
  const [noMoremessages, setNoMoreMessages] = useState(false);
  const [scrollFromBottom, setScrollFromBottom] = useState(0);
  const [replyTo, setReplyTo] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [typingIndicator, setTypingIndicator] = useState(null);
  const messagesCtrRef = useRef(null);
  const { on, emit } = useEventBus();
  const page = usePage();
  const authUser = page.props.auth.user;
  const loadMoreIntersect = useRef(null);
  const outgoingRingtoneRef = useRef(null);
  const [isOutgoingRinging, setIsOutgoingRinging] = useState(false);

  // Automatically share current user's location once when dashboard loads
  useEffect(() => {
    if (!('geolocation' in navigator)) return;

    let cancelled = false;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return;

        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const rawSpeed = pos.coords.speed;

        const speedKmh =
          typeof rawSpeed === 'number' && !Number.isNaN(rawSpeed)
            ? rawSpeed * 3.6
            : null;

        axios
          .post(route('location.update'), {
            lat,
            lng,
            speed_kmh: speedKmh,
          })
          .catch(() => {
            // Fail silently; location sharing is optional
          });
      },
      () => {
        // User denied or error; just skip sharing
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const offTyping = on('typing.indicator', (payload) => {
      if (!payload || !selectedConversation) {
        return;
      }

      const authId = authUser.id;
      if (payload.from_user_id === authId) {
        return;
      }

      if (selectedConversation.is_group) {
        if (!payload.is_group || payload.conversation_id !== selectedConversation.id) {
          return;
        }
      } else if (selectedConversation.is_user) {
        if (payload.is_group || payload.conversation_id !== selectedConversation.id) {
          return;
        }
      } else {
        return;
      }

      const name = payload.from_name || 'Someone';

      setTypingIndicator({
        userId: payload.from_user_id,
        name,
        expiresAt: Date.now() + 3000,
      });
    });

    return () => {
      if (offTyping) offTyping();
    };
  }, [selectedConversation, authUser.id, on]);

  useEffect(() => {
    if (!typingIndicator) {
      return;
    }

    const now = Date.now();
    const timeout = typingIndicator.expiresAt - now;
    if (timeout <= 0) {
      setTypingIndicator(null);
      return;
    }

    const handle = setTimeout(() => {
      setTypingIndicator((current) => {
        if (!current) return null;
        if (current.expiresAt <= Date.now()) {
          return null;
        }
        return current;
      });
    }, timeout);

    return () => clearTimeout(handle);
  }, [typingIndicator]);

  const handleMessageReply = (message) => {
    setReplyTo(message);
  };

  const messageCreated = (message) => {
    // If this is an acknowledgement for an optimistic message, replace it
    if (message.temp_id) {
      setLocalMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === message.temp_id);
        if (idx !== -1) {
          const copy = [...prev];
          copy[idx] = message;
          return copy;
        }
        return [...prev, message];
      });

      // scroll into view — do a couple of ticks to ensure DOM updated
      setTimeout(() => {
        requestAnimationFrame(() => {
          if (messagesCtrRef.current) messagesCtrRef.current.scrollTop = messagesCtrRef.current.scrollHeight;
        });
      }, 50);

      return;
    }

    // Scroll to bottom when new message arrives (ensure DOM has updated)
    setTimeout(() => {
      requestAnimationFrame(() => {
        if (messagesCtrRef.current) messagesCtrRef.current.scrollTop = messagesCtrRef.current.scrollHeight;
      });
    }, 50);

    if (selectedConversation && selectedConversation.is_group && selectedConversation.id == message.group_id) {
      setLocalMessages((prevMessages) => [...prevMessages, message]);
    }

    if (selectedConversation && selectedConversation.is_user && message.sender_id && message.receiver_id) {
      const me = authUser.id;
      const other = selectedConversation.id;
      const involvesMeAndOther = (message.sender_id === me && message.receiver_id === other) || (message.sender_id === other && message.receiver_id === me);
      if (involvesMeAndOther) {
        setLocalMessages((prevMessages) => [...prevMessages, message]);
      }
    }
  };

  const messageDeleted = (message) => {
    if (selectedConversation && selectedConversation.is_group && selectedConversation.id == message.group_id) {
      setLocalMessages((prevMessages) => prevMessages.filter((m) => m.id !== message.id));
    }

    if (selectedConversation && selectedConversation.is_user && message.sender_id && message.receiver_id) {
      const me = authUser.id;
      const other = selectedConversation.id;
      const involvesMeAndOther = (message.sender_id === me && message.receiver_id === other) || (message.sender_id === other && message.receiver_id === me);
      if (involvesMeAndOther) {
        setLocalMessages((prevMessages) => prevMessages.filter((m) => m.id !== message.id));
      }
    }
  };
  const handleLocalMessage = (message) => {
    // Add optimistic message only when it belongs to the selected conversation
    if (selectedConversation && message) {
      if (selectedConversation.is_group && selectedConversation.id == message.group_id) {
        setLocalMessages((prev) => [...prev, message]);
      } else if (selectedConversation.is_user && (selectedConversation.id == message.receiver_id || selectedConversation.id == message.sender_id)) {
        setLocalMessages((prev) => [...prev, message]);
      }
    }
    // scroll to bottom for optimistic messages
    setTimeout(() => {
      if (messagesCtrRef.current) messagesCtrRef.current.scrollTop = messagesCtrRef.current.scrollHeight;
    }, 50);
  };

  const loadMoreMessages = useCallback(() => {
    console.log("Loading more messages ", noMoremessages);

    if (noMoremessages) {
      return;
    }
    // find the first message object
    const firstMessage = localMessages[0];
    axios
      .get(route("message.loadOlder", firstMessage.id))
      .then(({ data }) => {
        if (data.data.length === 0) {
          console.log("No more messages");
          setNoMoreMessages(true);
          return;
        }

        /* calculate how much is scrolled from bottom and scroll to the same position 
         from bottom after messages are loaded */

        const scrollHeight = messagesCtrRef.current.scrollHeight;
        const scrollTop = messagesCtrRef.current.scrollTop;
        const clientHeight = messagesCtrRef.current.clientHeight;
        const tmpScrollFromBottom = scrollHeight - scrollTop - clientHeight;
        console.log("tmpScrollFromBottom", tmpScrollFromBottom);
        setScrollFromBottom(scrollHeight - scrollTop - clientHeight);

        setLocalMessages((prevMessages) => {
          return [...data.data.reverse(), ...prevMessages];
        });

      });
  }, [localMessages, noMoremessages]);

  useEffect(() => {
    setTimeout(() => {
      if (messagesCtrRef.current) {
        messagesCtrRef.current.scrollTop =
          messagesCtrRef.current.scrollHeight;
      }
    }, 10);

    const offCreated = on('message.created', messageCreated);
    const offDeleted = on('message.deleted', messageDeleted);
    on('message.reply', handleMessageReply);
    const offLocal = on('message.local', handleLocalMessage);

    // set scroll to bottom immediately after click on any conversation
    setScrollFromBottom(0);
    setNoMoreMessages(false);

    return () => {
      offCreated();
      offDeleted();
      offLocal();
    }

  }, [selectedConversation]);

  useEffect(() => {
    setLocalMessages(messages?.data ? messages.data.reverse() : []);
  }, [messages]);

  const stopOutgoingRingtone = () => {
    try {
      if (outgoingRingtoneRef.current) {
        outgoingRingtoneRef.current.pause();
        outgoingRingtoneRef.current.currentTime = 0;
      }
    } catch (e) {
    }
    outgoingRingtoneRef.current = null;
    setIsOutgoingRinging(false);
  };

  const startOutgoingRingtone = () => {
    try {
      stopOutgoingRingtone();
      const audio = new Audio('/sounds/incoming-call.mpga');
      audio.loop = true;
      audio.play().catch(() => { });
      outgoingRingtoneRef.current = audio;
      setIsOutgoingRinging(true);
    } catch (e) {
    }
  };

  // Call Handlers
  const handleCallInitiate = async (conversation, isVideo) => {
    try {
      const payload = {
        is_video: isVideo,
      };

      if (conversation.is_group) {
        payload.group_id = conversation.id;
      } else {
        payload.receiver_id = conversation.id;
      }

      const response = await axios.post(route('call.initiate'), payload);

      if (response.data.success) {
        setActiveCall(response.data.call);
        emit('toast.show', `${isVideo ? 'Video' : 'Audio'} call initiated`);
        startOutgoingRingtone();
      }
    } catch (error) {
      console.error('Error initiating call:', error);
      emit('toast.show', 'Failed to initiate call');
      stopOutgoingRingtone();
    }
  };

  const handleAcceptCall = async () => {
    if (!incomingCall) return;

    try {
      const response = await axios.post(route('call.join', incomingCall.id));
      if (response.data.success) {
        setActiveCall(response.data.call);
        setIncomingCall(null);
      }
    } catch (error) {
      console.error('Error accepting call:', error);
      emit('toast.show', 'Failed to join call');
      setIncomingCall(null);
    }
  };

  const handleRejectCall = async () => {
    if (!incomingCall) return;

    try {
      await axios.post(route('call.reject', incomingCall.id));
      setIncomingCall(null);
      emit('toast.show', 'Call rejected');
    } catch (error) {
      console.error('Error rejecting call:', error);
      setIncomingCall(null);
    }
  };

  const handleCallClose = () => {
    setActiveCall(null);
    stopOutgoingRingtone();
  };

  // Listen for incoming calls
  useEffect(() => {
    const handleIncomingCall = (event) => {
      console.log('📞 Incoming call event:', event);
      if (event.call && event.call.status === 'ringing') {
        setIncomingCall(event.call);
      }
    };

    const handleCallAccepted = (event) => {
      console.log('✅ Call accepted event:', event);
      if (activeCall && event.call.id === activeCall.id) {
        setActiveCall(event.call);
        stopOutgoingRingtone();
      }
    };

    const handleCallEnded = (event) => {
      console.log('📴 Call ended event:', event);
      if (activeCall && event.call.id === activeCall.id) {
        setActiveCall(null);
        emit('toast.show', 'Call ended');
        stopOutgoingRingtone();
      }
      if (incomingCall && event.call.id === incomingCall.id) {
        setIncomingCall(null);
      }
    };

    Echo.private(`user.${window.Laravel.user.id}`)
      .listen('.IncomingCall', handleIncomingCall)
      .listen('.CallAccepted', handleCallAccepted)
      .listen('.CallEnded', handleCallEnded);

    return () => {
      Echo.leave(`user.${window.Laravel.user.id}`);
    };
  }, [activeCall, incomingCall]);

  useEffect(() => {
    //Recover scroll from bottom after messages are loaded
    if (messagesCtrRef.current && scrollFromBottom !== null) {
      messagesCtrRef.current.scrollTop =
        messagesCtrRef.current.scrollHeight -
        messagesCtrRef.current.offsetHeight -
        scrollFromBottom;
    }
    if (noMoremessages) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => entry.isIntersecting && loadMoreMessages()
        ),
      {
        rootMargin: "0px 0px 350px 0px",
      }
    );

    if (loadMoreIntersect.current) {
      setTimeout(() => {
        observer.observe(loadMoreIntersect.current);
      }, 100);
    }
    return () => {
      observer.disconnect();
    };

  }, [localMessages]);

  useEffect(() => {
    return () => {
      stopOutgoingRingtone();
    };
  }, []);

  return (
    <>
      {!selectedConversation && (
        <div className="flex flex-col gap-8 justify-center items-center text-center h-full bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-colors duration-500">
          <div className='text-2xl md:text-4xl lg:text-5xl p-8 md:p-16 text-gray-400 dark:text-slate-400 font-semibold drop-shadow-lg opacity-60'>
            Select a conversation to start messaging
          </div>
          <ChatBubbleLeftRightIcon className='w-24 h-24 md:w-32 md:h-32 inline-block text-gray-300 dark:text-slate-600 animate-pulse' />
        </div>
      )}
      {selectedConversation && (
        <>
          <ConversationHeader
            selectedConversation={selectedConversation}
            onCallInitiate={handleCallInitiate}
          />
          <div ref={messagesCtrRef} className='flex-1 overflow-y-auto p-3 md:p-5 bg-gradient-to-b from-gray-50 via-white to-gray-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 scrollbar-thin transition-colors duration-300'>
            {(!localMessages || localMessages.length === 0) && (
              <div className='flex justify-center items-center h-full'>
                <div className='text-lg text-gray-500 dark:text-slate-400 font-medium'>
                  💬 No messages yet. Start the conversation!
                </div>
              </div>
            )}
            {localMessages && localMessages.length > 0 && (
              <div className='flex-1 flex flex-col'>
                <div ref={loadMoreIntersect}></div>
                {localMessages.map((message) => (
                  <MessageItem
                    key={message.id}
                    message={message}
                    onlineUsers={onlineUsers}
                    selectedConversation={selectedConversation}
                  />
                ))}
              </div>
            )}
          </div>
          <MessageInput
            conversation={selectedConversation}
            replyTo={replyTo}
            onClearReply={() => setReplyTo(null)}
          />
        </>
      )}

      {/* Call Modals */}
      {incomingCall && (
        <IncomingCallModal
          call={incomingCall}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
      )}

      {activeCall && (
        <VideoCallModal
          call={activeCall}
          onClose={handleCallClose}
        />
      )}
    </>
  );
}

Home.layout = (page) => {
  return (
    <AuthenticatedLayout user={page.props.auth.user}>
      <ChatLayout children={page} />
    </AuthenticatedLayout>
  );
};

export default Home