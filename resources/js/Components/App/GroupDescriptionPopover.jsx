import {Popover, Transition} from "@headlessui/react";
import { ExclamationCircleIcon} from "@heroicons/react/24/outline";
import { Fragment } from "react";

export default function GroupDescriptionPopover({description}) {
    return (
        <Popover className="relative">
            {({open}) => (
                <>
                {/* Render trigger as a non-button element to avoid nested <button> warnings when this component
                    is placed inside other interactive buttons. We keep accessibility attributes. */}
                <Popover.Button as="div" role="button" tabIndex={0} className={`${
                    open ? "text-gray-200": "text-gray-400"
                } hover:text-gray-200 inline-flex items-center`}>
                    <ExclamationCircleIcon className="w-4" />
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
                    className="absolute right-0 z-10 mt-3 w-[300px] px-4 sm:px-0" 
                    >
                        <div className="overflow-hidden rounded-lg shadow-lg">
                            <div className="bg-gray-800 p-4">
                                <h2 className="text-lg mb-3">Description</h2>
                            </div>
                            {description && (
                                <div className="bg-gray-700 p-4">
                                    <p className="text-sm text-gray-300">{description}</p>
                                </div>
                            )}
                            {!description && (
                                <div className="bg-gray-700 p-4">
                                    <p className="text-sm text-gray-300">No description defined</p>
                                </div>
                            )}
                        </div>
                    </Popover.Panel>
                 </Transition>
                </>
            )}
        </Popover>
    );
}
