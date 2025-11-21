import { ArrowLeftIcon, PencilSquareIcon, TrashIcon } from "@heroicons/react/24/solid";
import { Link, usePage, router } from "@inertiajs/react";
import UserAvatar from "./UserAvatar";
import GroupAvatar from "./GroupAvatar";
import GroupDescriptionPopover from "./GroupDescriptionPopover";
import GroupUsersPopover from "./GroupUsersPopover";
import UserOptionsDropdown from "./UserOptionsDropdown";
import CallButton from "../Call/CallButton";
import { useEventBus } from "@/EventBus";
import axios from "axios";
import LiveLocationBubble from "./LiveLocationBubble";


const ConversationHeader = ({ selectedConversation, onCallInitiate }) => {

  const authUser = usePage().props.auth.user;
  const emit = useEventBus().emit;

  const onDeleteGroup = () => {
    if (!window.confirm("Are you sure you want to delete this group?")) return;

    axios.delete(route("group.destroy", selectedConversation.id))
      .then((res) => {
        console.log(res.data);
        emit("toast.show", res.data.message || "Group deleted successfully");
        // Redirect to dashboard to avoid 'page not found' when viewing deleted group
        router.visit(route('dashboard'));
      }).catch((error) => {
        console.log(error);
        emit("toast.show", "Failed to delete group");
      });
  };

  return (
    <>
      {selectedConversation && (
        <div className="p-3 md:p-4 flex justify-between items-center border-b border-gray-200 dark:border-slate-700/50 bg-gradient-to-r from-white to-gray-50 dark:from-slate-800 dark:to-slate-700 shadow-md backdrop-blur-sm transition-colors duration-300">
          <div className="flex items-center gap-3">
            <Link
              href={route("dashboard")}
              className="inline-block sm:hidden text-gray-700 dark:text-gray-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </Link>

            {selectedConversation.is_user && (
              <UserAvatar user={selectedConversation} />
            )}

            {selectedConversation.is_group && <GroupAvatar />}

            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 truncate">
                {selectedConversation.name}
              </h3>
              {selectedConversation.is_user && (
                <div className="mt-0.5">
                  <LiveLocationBubble user={selectedConversation} />
                </div>
              )}
              {selectedConversation.is_group && (
                <p className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1">
                  <span>👥</span>
                  <span>
                    {selectedConversation.users.length}{" "}
                    {selectedConversation.users.length === 1
                      ? "member"
                      : "members"}
                  </span>
                </p>
              )}
            </div>
          </div>
          {selectedConversation.is_user && (
            <div className="flex gap-3 items-center">
              {/* Call Buttons */}
              <CallButton
                conversation={selectedConversation}
                onCallInitiate={onCallInitiate}
                type="audio"
              />
              <CallButton
                conversation={selectedConversation}
                onCallInitiate={onCallInitiate}
                type="video"
              />

              {authUser.is_admin && (
                <UserOptionsDropdown conversation={selectedConversation} />
              )}
            </div>
          )}
          {selectedConversation.is_group && (
            <div className="flex gap-3 items-center">
              {/* Call Buttons for Group */}
              <CallButton
                conversation={selectedConversation}
                onCallInitiate={onCallInitiate}
                type="audio"
              />
              <CallButton
                conversation={selectedConversation}
                onCallInitiate={onCallInitiate}
                type="video"
              />

              <GroupDescriptionPopover
                description={selectedConversation.description}
              />
              <GroupUsersPopover
                users={selectedConversation.users}
              />

              {authUser.is_admin && (
                <div
                  className="tooltip tooltip-left"
                  data-tip="Edit Group"
                >
                  <button
                    onClick={(event) => emit("GroupModal.show", selectedConversation)}
                    className="text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors transform hover:scale-110"
                    aria-label={`Edit group ${selectedConversation.name}`}
                  >
                    <PencilSquareIcon className="w-5 h-5" />
                  </button>
                </div>
              )}

              <div
                className="tooltip tooltip-left"
                data-tip="Delete Group"
              >
                <button
                  onClick={onDeleteGroup}
                  className="text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors transform hover:scale-110"
                  aria-label={`Delete group ${selectedConversation.name}`}
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default ConversationHeader
