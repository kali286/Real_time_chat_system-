import {Popover, Transition} from "@headlessui/react";
import {Fragment} from "react";
import { UsersIcon } from "@heroicons/react/24/solid";
import UserAvatar from "./UserAvatar";
import { Link } from "@inertiajs/react";

export default function GroupUsersPopover({users = [] }) {
    return (
        <Popover className="relative">
            {({open}) => (
                <>
                {/* Render as a non-button element to avoid nested button issues when used inside other interactive controls */}
                <Popover.Button as="div" role="button" tabIndex={0} className={`${
                    open ? "text-gray-200" : "text-gray-400"
                } hover:text-gray-200 inline-flex items-center`}>
                    <UsersIcon className="w-4" />
                </Popover.Button>

                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-200"
                  enterFrom="opacity-0 translate-y-1"
                  enterTo="opacity-100 translate-y-0"
                  leave="transition ease-in duration-150"
                  leaveFrom="opacity-100 translate-y-0"
                  leaveTo="opacity-0 translate-y-1"
                >
                    <Popover.Panel
                      className="absolute right-0 z-10 mt-3 w-[200px] px-4 sm:px-0"
                    >
                        <div className="bg-gray-800 py-2">
                             {users.map((user) => (
                                <Link
                                    key={user.id}
                                    href={route("chat.user", user.id)}
                                    className="flex items-center gap-2 p-2 hover:bg-gray-700"
                                >
                                    <UserAvatar size="sm" user={user} />
                                    <span className="text-sm text-gray-100">{user.name}</span>
                                </Link>
                             ))}
                        </div>

                    </Popover.Panel>
                </Transition>
                </>
            )}
        </Popover>
    );
}