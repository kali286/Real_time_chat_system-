import TextInput from "@/Components/TextInput";
import { router, usePage } from "@inertiajs/react";
import { useEffect, useState, cloneElement, Children, isValidElement } from "react";
import { useEventBus } from '@/EventBus';
import { PencilSquareIcon } from "@heroicons/react/24/solid";
import ConversationItem from "@/Components/App/ConversationItem";
import GroupModal from "@/Components/App/GroupModal";
import OfflineFallback from '@/Components/App/OfflineFallback';
import StatusModal from '@/Components/App/StatusModal';
import StatusViewerModal from '@/Components/App/StatusViewerModal';
import axios from 'axios';


const ChatLayout = ({ children }) => {

    const page = usePage();
    const conversations = page.props.conversations;
    const selectedConversation = page.props.selectedConversation;
    const currentUser = page.props.auth.user;
    const [localConversations, setLocalConversations] = useState(conversations || []);
    const [sortedConversations, setSortedConversations] = useState(conversations || []);
    const [onlineUsers, setOnlineUsers] = useState({});
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [chatTheme, setChatTheme] = useState('default');
    const [statuses, setStatuses] = useState([]);
    const [statusByUser, setStatusByUser] = useState({}); // { [userId]: Status[] }
    const [activeStatuses, setActiveStatuses] = useState([]);
    const [showStatusViewer, setShowStatusViewer] = useState(false);

    const isUserOnline = (userId) => onlineUsers[userId];

    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState('all'); // 'all' | 'unread' | 'groups'

    const onSearch = (ev) => {
        // Controlled search input — filtering happens in the effect below
        setSearchTerm(ev.target.value);
    }

    const applyFilters = (items, search, filter) => {
        const s = (search || '').toLowerCase().trim();

        let out = items || [];

        // Apply filter type first
        if (filter === 'unread') {
            out = out.filter((c) => (c.unread_count || 0) > 0);
        } else if (filter === 'groups') {
            out = out.filter((c) => c.is_group);
        }

        // Apply search on top
        if (s !== '') {
            out = out.filter((conversation) => {
                if (!conversation || !conversation.name) return false;
                if (conversation.name.toLowerCase().includes(s)) return true;

                if (conversation.is_group && conversation.description && conversation.description.toLowerCase().includes(s)) return true;

                if (conversation.is_user && conversation.email && conversation.email.toLowerCase().includes(s)) return true;

                return false;
            });
        }

        return out;
    }

    const messageCreated = (message) => {
        // Update the conversation's last message/date so sorting will push it to top
        setLocalConversations((prev) => {
            if (!message) return prev;
            return prev.map((c) => {
                // match by group id
                if (c.is_group && message.group_id && c.id == message.group_id) {
                    const isIncoming = message.sender_id !== page.props.auth.user.id;
                    return {
                        ...c,
                        last_message: message.message || (message.attachments && message.attachments.length ? 'Attachment' : c.last_message),
                        last_message_date: (typeof message.created_at === 'number') ? new Date(message.created_at).toISOString() : message.created_at,
                        unread_count: (c.unread_count || 0) + (isIncoming ? 1 : 0)
                    };
                }

                // match by user conversation more strictly: ensure the message involves the current user and the conversation user
                if (!c.is_group && message.sender_id && message.receiver_id) {
                    const me = page.props.auth.user.id;
                    const other = c.id;
                    const involvesMeAndOther = (message.sender_id === me && message.receiver_id === other) || (message.sender_id === other && message.receiver_id === me);
                    if (involvesMeAndOther) {
                        const isIncoming = message.sender_id !== me;
                        return {
                            ...c,
                            last_message: message.message || (message.attachments && message.attachments.length ? 'Attachment' : c.last_message),
                            last_message_date: (typeof message.created_at === 'number') ? new Date(message.created_at).toISOString() : message.created_at,
                            unread_count: (c.unread_count || 0) + (isIncoming ? 1 : 0)
                        };
                    }
                }
                return c;
            });
        });
    };

    const { on, emit } = useEventBus();

    const loadStatuses = async () => {
        try {
            const response = await axios.get(route('status.index'));
            const list = (response.data && response.data.data) ? response.data.data : [];
            setStatuses(list);

            const grouped = {};
            list.forEach((s) => {
                if (!s || !s.user_id) return;
                if (!grouped[s.user_id]) {
                    grouped[s.user_id] = [];
                }
                grouped[s.user_id].push(s);
            });
            setStatusByUser(grouped);
        } catch (error) {
            console.error('Failed to load statuses', error);
        }
    };

    const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

    useEffect(() => {
        // Load user's preferred chat theme from localStorage
        if (typeof window !== 'undefined' && currentUser?.id) {
            const key = `chatTheme:${currentUser.id}`;
            const saved = window.localStorage.getItem(key);
            if (saved) {
                setChatTheme(saved);
            }
        }
    }, [currentUser?.id]);

    useEffect(() => {
        // Persist chat theme per-user in localStorage
        if (typeof window !== 'undefined' && currentUser?.id && chatTheme) {
            const key = `chatTheme:${currentUser.id}`;
            window.localStorage.setItem(key, chatTheme);
        }
    }, [chatTheme, currentUser?.id]);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        const handleAppOffline = () => setIsOnline(false);
        const handleAppOnline = () => setIsOnline(true);
        const handleAppCallError = (ev) => {
            try {
                const err = ev && ev.detail && ev.detail.error ? ev.detail.error : ev && ev.detail ? ev.detail : null;
                const msg = err && err.message ? err.message : (typeof err === 'string' ? err : 'Call failed');
                // Show a transient toast instead of toggling offline state
                emit('toast.show', `Call error: ${msg}`);
            } catch (e) {
                console.error('Error handling app.call.error event', e);
            }
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        window.addEventListener('app.network.offline', handleAppOffline);
        window.addEventListener('app.network.online', handleAppOnline);
        window.addEventListener('app.call.error', handleAppCallError);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('app.network.offline', handleAppOffline);
            window.removeEventListener('app.network.online', handleAppOnline);
            window.removeEventListener('app.call.error', handleAppCallError);
        };
    }, []);

    useEffect(() => {
        // Initial load of statuses
        loadStatuses();

        // Refresh when a new status is posted
        const offStatusRefresh = on('status.refresh', () => {
            loadStatuses();
        });

        return () => {
            if (offStatusRefresh) offStatusRefresh();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const messageDeleted = (message) => {
        // Remove deleted message from local conversations
        setLocalConversations((prev) => {
            return prev.map((c) => {
                if (c.is_group && message.group_id && c.id == message.group_id) {
                    return {
                        ...c,
                        last_message: 'Message deleted',
                        last_message_date: message.created_at
                    };
                }

                if (!c.is_group && message.sender_id && message.receiver_id) {
                    const me = page.props.auth.user.id;
                    const other = c.id;
                    const involvesMeAndOther = (message.sender_id === me && message.receiver_id === other) || (message.sender_id === other && message.receiver_id === me);
                    if (involvesMeAndOther) {
                        return {
                            ...c,
                            last_message: 'Message deleted',
                            last_message_date: message.created_at
                        };
                    }
                }
                return c;
            });
        });
    };

    useEffect(() => {
        const offLocal = on('message.local', messageCreated);
        const offCreated = on('message.created', messageCreated);
        const offDeleted = on('message.deleted', messageDeleted);
        const offModalShow = on('GroupModal.show', (group) => {
            setShowGroupModal(true);
        });
        const offModalCreate = on('GroupModal.create', () => {
            // Open modal for creation (no group data passed)
            setShowGroupModal(true);
        });

        const offGroupDelete = on('group.deleted', ({ id, name }) => {
            setLocalConversations((oldConversations) => {
                return oldConversations.filter((c) => c.id !== id);
            });

            emit("toast.show", `Group "${name}" was deleted`);

            console.log(selectedConversation);

            if (
                !selectedConversation ||
                selectedConversation.is_group &&
                selectedConversation.id == id
            ) {
                router.visit(route('dashboard'));
            }
        });

        return () => {
            offLocal();
            offCreated();
            offDeleted();
            offModalShow();
            offModalCreate();
            offGroupDelete();
        };
    }, [on]);

    useEffect(() => {
        setSortedConversations(
            [...localConversations].sort((a, b) => {
                // First sort by blocked status
                if (a.blocked_at && b.blocked_at) {
                    return a.blocked_at > b.blocked_at ? 1 : -1;
                } else if (a.blocked_at) {
                    return 1;
                } else if (b.blocked_at) {
                    return -1;
                }

                // Prioritize unread messages (conversations with unread_count > 0)
                const aHasUnread = (a.unread_count || 0) > 0;
                const bHasUnread = (b.unread_count || 0) > 0;
                if (aHasUnread !== bHasUnread) {
                    return aHasUnread ? -1 : 1;
                }

                // Then sort by last message date (most recent first)
                const dateA = a.last_message_date ? new Date(a.last_message_date) : new Date(0);
                const dateB = b.last_message_date ? new Date(b.last_message_date) : new Date(0);

                if (dateA.getTime() !== dateB.getTime()) {
                    return dateB - dateA;
                }

                // Finally, if dates are equal, prioritize online users
                const aOnline = isUserOnline(a.id);
                const bOnline = isUserOnline(b.id);
                if (aOnline !== bOnline) {
                    return aOnline ? -1 : 1;
                }

                return 0;
            })
        );
    }, [localConversations, onlineUsers]);


    useEffect(() => {
        setLocalConversations(conversations);
    }, [conversations]);

    // Recompute local conversations when conversations/search/filter change
    useEffect(() => {
        setLocalConversations(applyFilters(conversations || [], searchTerm, filterType));
    }, [conversations, searchTerm, filterType]);

    // Reset unread count when opening a conversation
    useEffect(() => {
        if (selectedConversation) {
            setLocalConversations((prev) =>
                prev.map((c) =>
                    c.id === selectedConversation.id
                        ? { ...c, unread_count: 0 }
                        : c
                )
            );
        }
    }, [selectedConversation]);

    useEffect(() => {
        console.log('🔌 Joining Echo "online" channel...');
        const channel = Echo.join('online')
            .here((users) => {
                console.log('✅ HERE - Users already online:', users);
                const onlineUserObj = Object.fromEntries(
                    users.map((user) => [user.id, user])
                );


                setOnlineUsers((prevOnlineUsers) => {
                    console.log('📝 Setting online users:', onlineUserObj);
                    return { ...prevOnlineUsers, ...onlineUserObj };
                });
            })
            .joining((user) => {
                console.log('➕ User JOINING:', user);
                setOnlineUsers((prevOnlineUsers) => {
                    const updateUsers = { ...prevOnlineUsers };
                    updateUsers[user.id] = user;
                    console.log('📝 Updated online users:', updateUsers);
                    return updateUsers;
                });
            })
            .leaving((user) => {
                console.log('➖ User LEAVING:', user);
                setOnlineUsers((prevOnlineUsers) => {
                    const updateUsers = { ...prevOnlineUsers };
                    delete updateUsers[user.id]; // Remove user when they leave
                    console.log('📝 Updated online users after leave:', updateUsers);
                    return updateUsers;
                });
            })
            .error((error) => {
                console.error('❌ Presence channel error:', error);
            });

        // Cleanup: leave the channel when component unmounts
        return () => {
            try {
                Echo.leave('online');
            } catch (error) {
                console.error('Error leaving online channel:', error);
            }
        };
    }, []);

    const handleAvatarStatusClick = (conversation) => {
        if (!conversation || !conversation.id) return;
        const list = statusByUser[conversation.id];
        if (!list || !list.length) return;
        setActiveStatuses(list);
        setShowStatusViewer(true);
    };

    const handleStatusButtonClick = () => {
        const selfStatuses = statusByUser[currentUser.id];
        if (selfStatuses && selfStatuses.length) {
            setActiveStatuses(selfStatuses);
            setShowStatusViewer(true);
        } else {
            setShowStatusModal(true);
        }
    };

    return (
        <>
            <div className="flex-1 w-full flex flex-col md:flex-row overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-slate-900 dark:via-slate-800 dark:to-gray-900 transition-colors duration-500">
                <div
                    className={`transition-all duration-300 ease-in-out w-full sm:w-[220px] md:w-[300px] lg:w-[340px] bg-white/95 dark:bg-slate-800/95 backdrop-blur-md flex flex-col overflow-hidden border-r border-gray-200 dark:border-slate-700/50 shadow-2xl ${selectedConversation ? "-translate-x-full sm:translate-x-0 absolute sm:static inset-y-0 left-0 z-30" : "static"}`}
                >
                    <div className="flex items-center justify-between py-4 px-5 text-xl font-bold bg-gradient-to-r from-emerald-500 to-teal-600 dark:from-slate-800 dark:to-slate-700 border-b border-emerald-600/30 dark:border-slate-600/50 shadow-lg text-white dark:text-gray-100">
                        <span>My Conversations</span>
                        <div className="flex items-center gap-2">

                            {currentUser.is_admin && (
                                <div
                                    className="tooltip tooltip-left"
                                    data-tip="Create new Group"
                                >
                                    <button
                                        className="text-white/80 hover:text-white dark:text-gray-300 dark:hover:text-white transition-all duration-200 hover:scale-110 active:scale-95 transform"
                                        onClick={(ev) => {
                                            ev.preventDefault();
                                            // Use event bus so GroupModal can reset and open in create mode
                                            emit('GroupModal.create');
                                        }}
                                    >
                                        <PencilSquareIcon className="w-5 h-5 inline-block ml-2 drop-shadow-lg" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-3 sm:p-4 bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700/30">
                        <TextInput
                            value={searchTerm}
                            onChange={(e) => {
                                onSearch(e);
                            }}
                            placeholder="🔍 Filter users and Groups"
                            className="w-full transition-all duration-200 focus:ring-2 focus:ring-emerald-500 dark:focus:ring-teal-500"
                        />
                        {searchTerm && (
                            <div className="text-xs text-emerald-600 dark:text-teal-400 mt-2 font-medium animate-fade-in">
                                ✓ Found {sortedConversations.length} {sortedConversations.length === 1 ? 'result' : 'results'}
                            </div>
                        )}
                        {/* Quick filter buttons: All / Unread / Groups */}
                        <div className="mt-3 flex flex-wrap items-center gap-2 rtl:space-x-reverse">
                            <button
                                type="button"
                                onClick={() => setFilterType('all')}
                                className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${filterType === 'all' ? 'bg-emerald-500 text-white shadow' : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-slate-700'}`}
                            >
                                All
                            </button>
                            <button
                                type="button"
                                onClick={() => setFilterType('unread')}
                                className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${filterType === 'unread' ? 'bg-emerald-500 text-white shadow' : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-slate-700'}`}
                            >
                                Unread
                            </button>
                            <button
                                type="button"
                                onClick={() => setFilterType('groups')}
                                className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${filterType === 'groups' ? 'bg-emerald-500 text-white shadow' : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-slate-700'}`}
                            >
                                Groups
                            </button>
                            <button
                                type="button"
                                onClick={handleStatusButtonClick}
                                className="px-3 py-1 rounded-md text-sm font-medium transition-all bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-slate-700"
                            >
                                Status
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent hover:scrollbar-thumb-gray-400 dark:hover:scrollbar-thumb-slate-500 transition-colors">
                        {sortedConversations && sortedConversations.length > 0 ? (
                            sortedConversations.map((conversation, index) => (
                                <div
                                    key={`${conversation.is_group
                                        ? "group_"
                                        : "user_"
                                        }${conversation.id}`}
                                    className="animate-slide-in"
                                    style={{ animationDelay: `${index * 50}ms` }}
                                >
                                    <ConversationItem
                                        conversation={conversation}
                                        online={!!isUserOnline(conversation.id)}
                                        selectedConversation={selectedConversation}
                                        hasStatus={!conversation.is_group && !!(statusByUser[conversation.id] && statusByUser[conversation.id].length)}
                                        onAvatarClick={handleAvatarStatusClick}
                                    />
                                </div>
                            ))
                        ) : (
                            <div className="p-6 text-center">
                                <div className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">
                                    {searchTerm?.trim() ? `No results for "${searchTerm}"` : filterType === 'unread' ? 'No unread conversations' : filterType === 'groups' ? 'No groups found' : 'No conversations yet'}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-slate-400 mb-4">
                                    Try clearing the search or changing the filter.
                                </div>
                                {(filterType !== 'all' || (searchTerm && searchTerm.trim())) && (
                                    <div className="flex items-center justify-center">
                                        <button
                                            type="button"
                                            onClick={() => { setFilterType('all'); setSearchTerm(''); }}
                                            className="px-3 py-1 rounded-md bg-emerald-500 text-white text-sm font-medium shadow"
                                        >
                                            Show all conversations
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                </div>
                <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                    {Children.map(children, child =>
                        isValidElement(child)
                            ? cloneElement(child, { onlineUsers, chatTheme, setChatTheme })
                            : child
                    )}
                </div>
                {/* Offline overlay — covers the whole app when network is down */}
                {!isOnline && (
                    <OfflineFallback onRetry={() => window.location.reload()} />
                )}
            </div>
            <GroupModal show={showGroupModal}
                onClose={() => setShowGroupModal(false)} />
            <StatusModal show={showStatusModal} onClose={() => setShowStatusModal(false)} />
            <StatusViewerModal
                show={showStatusViewer}
                statuses={activeStatuses}
                currentUserId={currentUser.id}
                onAddStatus={() => setShowStatusModal(true)}
                onClose={() => { setShowStatusViewer(false); setActiveStatuses([]); }}
            />
        </>
    )
}

export default ChatLayout