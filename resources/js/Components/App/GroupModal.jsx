import TextAreaInput from "@/Components/TextAreaInput";
import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import Modal from "@/Components/Modal";
import TextInput from "@/Components/TextInput";
import PrimaryButton from "@/Components/PrimaryButton";
import SecondaryButton from "@/Components/SecondaryButton";
import UserPicker from "@/Components/App/UserPicker";
import { useForm, usePage } from "@inertiajs/react";
import { useEffect, useState } from "react";
import { useEventBus } from "@/EventBus";

export default function GroupModal({ show = false, onClose = () => {}}) {
      const page = usePage();
      const conversations = page.props.conversations;
      const {on, emit } = useEventBus();
      const [group, setGroup] = useState(null);

      const {data, setData, post, processing, reset, put, errors} = useForm({
       id:"",
       name:"",
       description:"",
       user_ids:[] 
    });
    
    const users = conversations.filter((c) => !c.is_group);
    const createdOrUpdateGroup = (e) => {
        e.preventDefault();
        if(group?.id){
            put(route("groups.update", group.id), {
                onSuccess: () => {
                   closeModal();
                   emit("toast.show", `Group "${data.name}" was updated`);
                }
            });

    return;
        }
        post(route("group.store"), {
            onSuccess: () => {
                onClose();
                emit("toast.show", `Group "${data.name}" was created`);
                closeModal();
            },
        });

    };
     const closeModal = () => {
        reset();
        onClose();
    };

    useEffect(() => {
        // Handle opening modal to edit a group
        const offShow = on("GroupModal.show", (group) => {
            setData({
                name: group.name,
                description: group.description,
                user_ids: group.users
                    .filter((u) => group.owner_id !== u.id)
                    .map((u) => u.id)
            });
            setGroup(group);
        });

        // Handle create event — reset form and clear group
        const offCreate = on("GroupModal.create", () => {
            setGroup(null);
            setData({ id: "", name: "", description: "", user_ids: [] });
        });

        return () => {
            offShow();
            offCreate();
        };
    }, [on]);

    return (
        <Modal show={show} onClose={closeModal}>
             <form 
                  onSubmit={createdOrUpdateGroup}
                  className="p-6 overflow-y-auto"
             >
              <h2 className="text-xl font-medium text-gray-900 dark:text-gray-100">
                  {group?.id 
                  ? `Edit Group "${group.name}"`
                  : `Create New Group`}
              </h2> 

              <div className="mt-8">
                <InputLabel htmlFor="name" value="Name" />
                <TextInput
                     id="name"
                     className="mt-1 block w-full"
                     value={data.name}
                     disabled={!!group?.id}
                     onChange={(e) => setData("name", e.target.value)}
                     required
                     isFocused
                     />

                     <InputError className="mt-2" message={errors.name} />
              </div>

              <div className="mt-6">
                <InputLabel htmlFor="description" value="Description" />
                <TextAreaInput
                     id="description"
                     rows="3"
                     className="mt-1 block w-full"
                     value={data.description}
                     onChange={(e) => setData("description", e.target.value)}
                     required
                     isFocused
                     />

                     <InputError className="mt-2" message={errors.description} />
              </div>

              <div className="mt-4">
                <InputLabel value="select users"/>
                <UserPicker
                   value={
                           users.filter(
                            (u) => group?.owner_id !== u.id &&
                            data.user_ids.includes(u.id)
                           ) || []
                        }
                   options={users}
                   onSelect={(users) => {
                    setData(
                        "user_ids",
                        users.map((u) => u.id)
                    )
                   }}
                />
                <InputError className="mt-2" message={errors.user_ids} />
              </div>

                <div className="mt-6 flex justify-end">
                    <SecondaryButton onClick={closeModal}>Cancel</SecondaryButton>
                    <PrimaryButton className="ms-3" disabled={processing}>
                        {group?.id ? "Update" : "Create"}
                    </PrimaryButton>
                </div>

             </form>
      </Modal>

    );
}