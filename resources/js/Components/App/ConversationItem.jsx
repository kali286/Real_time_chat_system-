import { Link, usePage } from "@inertiajs/react";
import UserAvatar from "./UserAvatar";
import GroupAvatar from "./GroupAvatar";
import UserOptionsDropdown from "./UserOptionsDropdown";
import { formatMessageDateshort } from "@/helpers";
import MessageOptionsDropdown from "./MessageOptionsDropdown";

const ConversationItem = ({
    conversation,
    selectedConversation = null,
    online = null,
    hasStatus = false,
    onAvatarClick,
}) => {
    const page = usePage();
    const currentUser = page.props.auth.user;
    let classes = " border-l-4 border-transparent";

    if (selectedConversation) {
        if (
            !selectedConversation.is_group &&
            !conversation.is_group &&
            selectedConversation.id == conversation.id
        ) {
            classes = " border-l-4 border-l-emerald-500 bg-black/20";
        }
        if (
            selectedConversation.is_group &&
            conversation.is_group &&
            selectedConversation.id == conversation.id
        ) {
            classes = " border-l-4 border-l-emerald-500 bg-black/20";
        }
    }
    return (
        <Link
            href={
                conversation.is_group
                    ? route("chat.group", conversation)
                    : route("chat.user", conversation)
            }
            preserveState
            className={
                "conversation-item flex items-center gap-3 p-3 sm:p-2 md:p-3 text-gray-900 dark:text-gray-200 transition-all duration-200 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700/70 hover:shadow-lg rounded-lg" +
                classes +
                (conversation.is_user && conversation.is_admin
                    ? " pr-2"
                    : " pr-4")
            }
        >
            {conversation.is_user && (
                <UserAvatar
                    user={conversation}
                    online={online}
                    hasStatus={hasStatus}
                    onClick={(e) => {
                        if (hasStatus && onAvatarClick) {
                            e.preventDefault();
                            e.stopPropagation();
                            onAvatarClick(conversation);
                        }
                    }}
                />
            )}
            {conversation.is_group && <GroupAvatar />}
            <div
                className={
                    `flex-1 text-xs sm:text-xs md:text-sm max-w-full overflow-hidden min-w-0` +
                    (conversation.is_user && conversation.blocked_at
                        ? " opacity-50"
                        : "")
                }
            >
                <div className="flex gap-1 justify-between items-center">
                    <div className="flex items-center gap-2 min-w-0">
                        <h3 className="text-sm font-semibold truncate">
                            {conversation.name}
                        </h3>
                        {conversation.unread_count > 0 && (
                            <span className="inline-flex items-center justify-center bg-gradient-to-br from-rose-500 to-rose-600 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-lg shadow-rose-900/50 animate-pulse">
                                {conversation.unread_count}
                            </span>
                        )}
                    </div>

                    {conversation.last_message_date && (
                        <span className="text-xs text-gray-500 dark:text-slate-400">
                            {formatMessageDateshort(
                                conversation.last_message_date
                            )}
                        </span>
                    )}
                </div>

                {conversation.last_message_date && (
                    <p className="text-xs truncate text-gray-600 dark:text-slate-300">
                        {conversation.last_message}
                    </p>
                )}
            </div>
            {!!currentUser.is_admin && conversation.is_user && (
                <UserOptionsDropdown conversation={conversation} />
            )}
        </Link>
    );
};

export default ConversationItem;
