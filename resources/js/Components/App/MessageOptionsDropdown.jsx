import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { EllipsisVerticalIcon, TrashIcon } from '@heroicons/react/24/solid';
import axios from 'axios';
import { useEventBus } from '@/EventBus';

export default function MessageOptionsDropdown({ message }) {
    const { emit } = useEventBus();

    const onMessageDelete = () => {
        if (!window.confirm("Are you sure you want to delete this message?")) return;

        axios
            .delete(route('message.destroy', message.id))
            .then((res) => {
                emit('message.deleted', message);
                emit('toast.show', 'Message deleted successfully');
            })
            .catch((err) => {
                console.error(err);
                emit('toast.show', 'Failed to delete message');
            });
    };

    const onCopy = () => {
        if (message.message) {
            navigator.clipboard.writeText(message.message);
            emit('toast.show', 'Message copied to clipboard');
        }
    };

    const onReply = () => emit('message.reply', message);
    const onForward = () => emit('message.forward', message);
    const onReport = () => emit('message.report', message);

    return (
        <div className="absolute right-full text-gray-100 top-1/2 -translate-y-1/2">
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
                    <Menu.Items className="absolute left-0 mt-2 w-48 rounded-md bg-gray-800 shadow-lg z-50">
                        <div className="px-1 py-1">
                            <Menu.Item>
                                {({ active }) => (
                                    <button onClick={onReply} className={`${active ? 'bg-black/30 text-white' : 'text-gray-100'} group flex w-full items-center rounded-md px-2 py-2 text-sm`}>Reply</button>
                                )}
                            </Menu.Item>
                            <Menu.Item>
                                {({ active }) => (
                                    <button onClick={onForward} className={`${active ? 'bg-black/30 text-white' : 'text-gray-100'} group flex w-full items-center rounded-md px-2 py-2 text-sm`}>Forward</button>
                                )}
                            </Menu.Item>
                            <Menu.Item>
                                {({ active }) => (
                                    <button onClick={onCopy} className={`${active ? 'bg-black/30 text-white' : 'text-gray-100'} group flex w-full items-center rounded-md px-2 py-2 text-sm`}>Copy</button>
                                )}
                            </Menu.Item>
                            <Menu.Item>
                                {({ active }) => (
                                    <button onClick={onReport} className={`${active ? 'bg-black/30 text-white' : 'text-gray-100'} group flex w-full items-center rounded-md px-2 py-2 text-sm`}>Report</button>
                                )}
                            </Menu.Item>
                            <Menu.Item>
                                {({ active }) => (
                                    <button onClick={onMessageDelete} className={`${active ? 'bg-black/30 text-white' : 'text-gray-100'} group flex w-full items-center rounded-md px-2 py-2 text-sm text-red-500`}> <TrashIcon className="w-5 h-5 mr-2"/> Delete</button>
                                )}
                            </Menu.Item>
                        </div>
                    </Menu.Items>
                </Transition>
            </Menu>
        </div>
    );
}
