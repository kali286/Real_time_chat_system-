import ApplicationLogo from '@/Components/ApplicationLogo';
import Dropdown from '@/Components/Dropdown';
import NavLink from '@/Components/NavLink';
import ResponsiveNavLink from '@/Components/ResponsiveNavLink';
import PrimaryButton from '@/Components/PrimaryButton';
import ThemeToggle from '@/Components/ThemeToggle';
import { Link, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { useEventBus } from '../EventBus';
import Toast from '@/Components/App/Toast';
import NewMessageNotification from '@/Components/App/NewMessageNotification';
import NewUserModal from '@/Components/App/NewUseModal';
import { UserPlusIcon } from '@heroicons/react/24/solid';

export default function AuthenticatedLayout({ header, children }) {
    const page = usePage();
    const user = page.props.auth.user;
    const conversations = page.props.conversations;
    const [showNewUserModal, setShowNewUserModal] = useState(false);

    const [showingNavigationDropdown, setShowingNavigationDropdown] =
        useState(false);

    const { emit } = useEventBus();

    const openCreateGroup = () => {
        // Emit an event to open the Group modal in create mode
        emit('GroupModal.create');
    };

    useEffect(() => {
        conversations.forEach((conversation) => {
            let channel = `message.group.${conversation.id}`;

            if (conversation.is_user) {
                channel = `message.user.${[
                    parseInt(user.id),
                    parseInt(conversation.id),
                ]
                    .sort((a, b) => a - b)
                    .join("-")}`;
            }

            // start listening on channel
            Echo.private(channel)
                .error((error) => {
                    console.error(`Error on channel ${channel}:`, error);
                })
                .listen("SocketMessage", (e) => {
                    console.log("SocketMessage", e);

                    if (!e || !e.message) {
                        console.warn('Received invalid message event:', e);
                        return;
                    }

                    const payload = e.message;
                    if (e.temp_id) payload.temp_id = e.temp_id;

                    // Emit the created message payload (may include temp_id)
                    emit("message.created", payload);

                    // if sender is current user, no need to show new message notification
                    if (payload.sender_id === user.id) {
                        return;
                    }

                    emit("newMessageNotification", {
                        user: payload.sender,
                        group_id: payload.group_id,
                        message:
                            payload.message ||
                            `Shared ${payload.attachments?.length === 1
                                ? "an attachment"
                                : (payload.attachments?.length || 0) +
                                " attachments"
                            }`
                    });
                })
                .listenForWhisper('typing', (payload) => {
                    if (!payload) {
                        return;
                    }
                    try {
                        console.log('[typing] whisper received on', channel, payload);
                        emit('typing.indicator', {
                            channel,
                            ...payload,
                        });
                    } catch (err) {
                        console.error('Error handling typing whisper', err);
                    }
                });

            // listen to group deleted event
            if (conversation.is_group) {
                Echo.private(`group.deleted.${conversation.id}`)
                    .error((error) => {
                        console.error('Group deleted channel error:', error);
                    })
                    .listen("GroupDeleted", (e) => {
                        console.log("GroupDeleted", e);
                        if (e && e.id) {
                            emit("group.deleted", { id: e.id, name: e.name || 'Group' });
                        }
                    });
            }
        });

        return () => {
            conversations.forEach((conversation) => {
                try {
                    let channel = `message.group.${conversation.id}`;

                    if (conversation.is_user) {
                        channel = `message.user.${[
                            parseInt(user.id),
                            parseInt(conversation.id)
                        ]
                            .sort((a, b) => a - b)
                            .join("-")}`
                    }
                    Echo.leave(channel);

                    if (conversation.is_group) {
                        Echo.leave(`group.deleted.${conversation.id}`);
                    }
                } catch (error) {
                    console.error('Error leaving channel:', error);
                }
            });
        };
    }, [conversations]);

    return (
        <>
            <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col h-screen transition-colors duration-300">
                <nav className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm transition-colors duration-300">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex h-16 justify-between">
                            <div className="flex">
                                <div className="flex shrink-0 items-center">
                                    <Link href="/" className="flex items-center">
                                        <span className="text-xl font-bold text-gray-800 dark:text-gray-200">LOGO</span>
                                    </Link>
                                </div>

                                <div className="space-x-8 sm:-my-px sm:ms-10 flex items-center">
                                    <NavLink
                                        href={route('dashboard')}
                                        active={route().current('dashboard')}
                                        className=" text-lg sm:text-xl font-semibold"
                                    >
                                        Dashboard
                                    </NavLink>
                                    <div className="flex items-center">
                                        <ThemeToggle />
                                    </div>
                                </div>
                            </div>

                            <div className="hidden sm:ms-6 sm:flex sm:items-center">
                                <div className="flex relative ms-3">

                                    {user.is_admin && (
                                        <div className="flex items-center gap-3">
                                            <PrimaryButton onClick={(ev) => setShowNewUserModal(true)}>
                                                <UserPlusIcon className="w-5 h-5 mr-2" />
                                                Add New User
                                            </PrimaryButton>
                                        </div>
                                    )}
                                    <Dropdown>
                                        <Dropdown.Trigger>
                                            <span className="inline-flex rounded-md">
                                                <button
                                                    type="button"
                                                    className="inline-flex items-center rounded-md border border-transparent bg-white px-3 py-2 text-sm font-medium leading-4 text-gray-500 transition duration-150 ease-in-out hover:text-gray-700 focus:outline-none"
                                                >
                                                    {user.name}

                                                    <svg
                                                        className="-me-0.5 ms-2 h-4 w-4"
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        viewBox="0 0 20 20"
                                                        fill="currentColor"
                                                    >
                                                        <path
                                                            fillRule="evenodd"
                                                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                                            clipRule="evenodd"
                                                        />
                                                    </svg>
                                                </button>
                                            </span>
                                        </Dropdown.Trigger>

                                        <Dropdown.Content>
                                            <Dropdown.Link
                                                href={route('profile.edit')}
                                            >
                                                Profile
                                            </Dropdown.Link>
                                            <Dropdown.Link
                                                href={route('logout')}
                                                method="post"
                                                as="button"
                                            >
                                                Log Out
                                            </Dropdown.Link>
                                        </Dropdown.Content>
                                    </Dropdown>
                                </div>
                            </div>

                            <div className="-me-2 flex items-center sm:hidden">
                                <button
                                    onClick={() =>
                                        setShowingNavigationDropdown(
                                            (previousState) => !previousState,
                                        )
                                    }
                                    className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 transition duration-150 ease-in-out hover:bg-gray-100 hover:text-gray-500 focus:bg-gray-100 focus:text-gray-500 focus:outline-none"
                                >
                                    <svg
                                        className="h-6 w-6"
                                        stroke="currentColor"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            className={
                                                !showingNavigationDropdown
                                                    ? 'inline-flex'
                                                    : 'hidden'
                                            }
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M4 6h16M4 12h16M4 18h16"
                                        />
                                        <path
                                            className={
                                                showingNavigationDropdown
                                                    ? 'inline-flex'
                                                    : 'hidden'
                                            }
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M6 18L18 6M6 6l12 12"
                                        />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div
                        className={
                            (showingNavigationDropdown ? 'block' : 'hidden') +
                            ' sm:hidden'
                        }
                    >
                        <div className="space-y-1 pb-3 pt-2">
                            <ResponsiveNavLink
                                href={route('dashboard')}
                                active={route().current('dashboard')}
                            >
                                Dashboard
                            </ResponsiveNavLink>
                        </div>

                        <div className="border-t border-gray-200 pb-1 pt-4">
                            <div className="px-4">
                                <div className="text-base font-medium text-gray-800">
                                    {user.name}
                                </div>
                                <div className="text-sm font-medium text-gray-500">
                                    {user.email}
                                </div>
                            </div>

                            <div className="mt-3 space-y-1">
                                <ResponsiveNavLink href={route('profile.edit')}>
                                    Profile
                                </ResponsiveNavLink>
                                {/* Theme toggle for mobile users */}
                                <div className="px-4 py-2">
                                    <ThemeToggle />
                                </div>
                                <ResponsiveNavLink
                                    method="post"
                                    href={route('logout')}
                                    as="button"
                                >
                                    Log Out
                                </ResponsiveNavLink>
                            </div>
                        </div>
                    </div>
                </nav>

                {header && (
                    <header className="bg-white shadow">
                        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                            {header}
                        </div>
                    </header>
                )}

                {children}
            </div>
            <Toast />
            <NewMessageNotification />
            <NewUserModal show={showNewUserModal}
                onClose={(ev) => setShowNewUserModal(false)} />
        </>
    );
}
