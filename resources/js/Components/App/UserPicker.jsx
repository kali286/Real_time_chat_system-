import { Fragment, useState, useEffect } from "react";
import { Combobox, Transition } from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon, XMarkIcon } from "@heroicons/react/24/solid";

export default function UserPicker({value = [], options = [], onSelect}) {
    const [selected, setSelected] = useState(value || []);
    const [query, setQuery] = useState("");

    // Sync with parent component's value
    useEffect(() => {
        setSelected(value || []);
    }, [value]);

    const filteredPeople =
       query === ""
       ? options
       : options.filter((person) =>
            person.name
               .toLowerCase()
              .replace(/\s/g, "")
              .includes(query.toLowerCase().replace(/\s/g, ""))
       );

    const onSelectedChange = (persons) => {
        setSelected(persons);
        onSelect(persons);
    };

    const removeUser = (userId) => {
        const newSelected = selected.filter(u => u.id !== userId);
        setSelected(newSelected);
        onSelect(newSelected);
    };
    return (
         <>
           <Combobox value={selected} onChange={onSelectedChange} multiple>
            <div className="relative mt-1">
                <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-gray-800 text-left shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 sm:text-sm">
                    <Combobox.Input
                    className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-gray-100 bg-gray-800 placeholder-gray-400 focus:ring-0"
                    displayValue={(persons) => 
                        persons && persons.length > 0
                        ? `${persons.length} user${persons.length === 1 ? '' : 's'} selected`
                        : ""
                        }
                        placeholder="Select users..."
                        onChange={(event) => setQuery(event.target.value)}
                    />
                    <Combobox.Button className="absolute inset-y-0 right-0 flex items-center rounded-r-md px-2 focus:outline-none">
                        <ChevronUpDownIcon className="h-5 w-5 text-gray-300"
                         aria-hidden="true" />
                    </Combobox.Button>
                </div>
                <Transition
                as={Fragment}
                leave="transition ease-in duration-100"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
                afterLeave={() => setQuery("")}
                >
                    <Combobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-gray-900 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">

                        {filteredPeople.length === 0 && query !== "" ? (
                            <div className="relative cursor-default select-none py-2 pl-10 pr-4">
                                <span className="block text-sm text-gray-400">
                                    Nothing found.
                                </span>
                            </div>
                        ) : (
                            filteredPeople.map((person) => (
                                <Combobox.Option
                                key={person.id}
                                className={({ active }) => `relative cursor-default select-none py-2 pl-10 pr-4 ${active ? "bg-teal-600 text-white" : "bg-gray-900 text-gray-100"}`}
                                    value={person}
                                >
                                    {({selected, active}) => (
                                        <>
                                          <span className={`block truncate ${selected ? "font-semibold" : "font-normal"} ${active ? "font-medium" : ""}`}>
                                            {person.name}
                                          </span>

                                          {selected && (
                                            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                             <CheckIcon className="h-5 w-5 text-white" aria-hidden="true" />
                                             </span>
                                          )}
                                        </>
                                    )}
                                </Combobox.Option>
                            ))
                        )}

                    </Combobox.Options>
                </Transition>

            </div>
           </Combobox>

           {selected && selected.length > 0 && (
            <div className="flex gap-2 flex-wrap mt-3">
               {selected.map((person) => (
                 <div
                   key={person.id}
                   className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 transition-colors"
                 >
                   <span>{person.name}</span>
                   <button
                     type="button"
                     onClick={() => removeUser(person.id)}
                     className="inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-indigo-800 transition-colors"
                   >
                     <XMarkIcon className="w-3 h-3" />
                   </button>
                 </div>
               ))}
            </div>
           )}
         </>
    );
}