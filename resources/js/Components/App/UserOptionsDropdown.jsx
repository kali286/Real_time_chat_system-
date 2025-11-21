import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { EllipsisVerticalIcon, LockOpenIcon, LockClosedIcon, ShieldCheckIcon, UserIcon, TrashIcon } from '@heroicons/react/24/solid';
import { useEventBus } from '@/EventBus';
import axios from 'axios';
import { usePage, router } from '@inertiajs/react';

export default function UserOptionsDropdown({ conversation = {} }) {
    const { emit } = useEventBus();
    const currentUser = usePage().props.auth.user;

    const changeUserRole = () => {
        console.log('change role for', conversation.id);
        if(!currentUser.is_admin) {
            emit('toast.show', 'You do not have permission to change user roles');
            return;
        }

        if(!conversation.is_user) {
            return;
        }

        const action = conversation.is_admin ? 'demote to regular user' : 'promote to admin';
        if(!window.confirm(`Are you sure you want to ${action} "${conversation.name}"?`)) {
            return;
        }

        //send axios request to change user role and show notification on success
        axios
        .put(route('user.changeRole', conversation.id))
        .then((res) => {
           emit('toast.show', res.data.message);
           // Refresh the page to update the UI
           router.reload({ only: ['conversations'] });
        }).catch((error) => {
            console.error('Error changing role:', error);
            emit('toast.show', error.response?.data?.message || 'Failed to change user role');
        });
    };

    const onBlockUser = () => {
        console.log('Block User', conversation.id);
        if(!currentUser.is_admin) {
            emit('toast.show', 'You do not have permission to block/unblock users');
            return;
        }

        if(!conversation.is_user) {
            return;
        }

        const action = conversation.blocked_at ? 'unblock' : 'block';
        if(!window.confirm(`Are you sure you want to ${action} "${conversation.name}"?`)) {
            return;
        }
          
          //send axios put request to block user and show notification on success
        axios
        .put(route('user.blockUnblock', conversation.id))
        .then((res) => {
            emit('toast.show', res.data.message);
            // Refresh the page to update the UI
            router.reload({ only: ['conversations'] });
        }).catch((error) => {
            console.error('Error blocking/unblocking user:', error);
            emit('toast.show', error.response?.data?.message || 'Failed to block/unblock user');
        });
    };

    return (
        <div className="relative inline-block text-left">
            <Menu as="div" className="relative inline-block text-left">
                <div>
                    <Menu.Button className="flex justify-center items-center w-8 h-8 rounded-full hover:bg-black/40">
                        <EllipsisVerticalIcon className="h-5 w-5 text-gray-200" />
                    </Menu.Button>
                </div>

                <Transition
                    as={Fragment}
                    enter="transition ease-out duration-200"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                >
                    <Menu.Items className="absolute right-0 mt-2 w-48 rounded-md bg-gray-800 shadow-lg z-50">
                        <div className="px-1 py-1">
                            <Menu.Item>
                                {({ active }) => (
                                                    <button
                                                        onClick={onBlockUser}
                                                        className={`${
                                                            active ? 'bg-black/30 text-white' : 'text-gray-100'
                                                        } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                                                    >
                                                        {conversation.blocked_at ? (
                                                            <>
                                                                <LockOpenIcon className="w-5 h-5 mr-2" />
                                                                Unblock User
                                                            </>
                                                        ) : (
                                                            <>
                                                                <LockClosedIcon className="w-5 h-5 mr-2" />
                                                                Block User
                                                            </>
                                                        )}
                                                    </button>
                                )}
                            </Menu.Item>
                        </div>
                        <div className="px-1 py-1">
                            <Menu.Item>
                                {({ active }) => (
                                            <button
                                        onClick={() => {
                                            if(!currentUser.is_admin){
                                                emit('toast.show', 'You do not have permission to delete users');
                                                return;
                                            }
                                            if(!conversation.is_user) return;
                                            if(!window.confirm(`Are you sure you want to delete user "${conversation.name}"? This action is irreversible.`)) return;
                                            axios.delete(route('user.destroy', conversation.id))
                                            .then((res) => {
                                                emit('toast.show', res.data.message || 'User deleted');
                                                // Redirect to dashboard to avoid 404 if currently viewing deleted user
                                                router.visit(route('dashboard'));
                                            }).catch((err) => {
                                                console.error(err);
                                                emit('toast.show', err.response?.data?.message || 'Failed to delete user');
                                            });
                                        }}
                                        className={`${
                                            active ? 'bg-black/30 text-white' : 'text-gray-100'
                                        } group flex w-full items-center rounded-md px-2 py-2 text-sm text-red-500`}
                                    >
                                        <TrashIcon className="w-5 h-5 mr-2" />
                                        Delete User
                                    </button>
                                )}
                            </Menu.Item>
                        </div>

                        <div className="px-1 py-1">
                            <Menu.Item>
                                {({ active }) => (
                                            <button
                                        onClick={changeUserRole}
                                        className={`${
                                            active ? 'bg-black/30 text-white' : 'text-gray-100'
                                        } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                                    >
                                        {conversation.is_admin ? (
                                            <>
                                                <UserIcon className="w-5 h-5 mr-2" />
                                                Make Regular User
                                            </>
                                        ) : (
                                            <>
                                                <ShieldCheckIcon className="w-5 h-5 mr-2" />
                                                Make Admin
                                            </>
                                        )}
                                    </button>
                                )}
                            </Menu.Item>
                        </div>
                    </Menu.Items>
                </Transition>
            </Menu>
        </div>
    );
}