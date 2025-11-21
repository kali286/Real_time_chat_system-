import { useEventBus } from "@/EventBus";
import { Link } from "@inertiajs/react";
import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import UserAvatar from "./UserAvatar";

export default function NewMessageNotification() {
    const [toasts, setToasts] = useState([]);
    const { on } = useEventBus();

    useEffect(() => {
        // Expect a single payload object { message, user, group_id }
        on("newMessageNotification", (payload) => {
            const id = uuidv4();
            const message = payload?.message || '';
            const user = payload?.user || null;
            const group_id = payload?.group_id || null;

            setToasts((oldToasts) => [...oldToasts, { message, uuid: id, user, group_id }]);

            setTimeout(() => {
                setToasts((oldToasts) => oldToasts.filter((toast) => toast.uuid !== id));
            }, 3000); // Remove toast after 3 seconds
        });
    }, [on]);
    return (
        <div className="toast toast-top toast-center min-w-[280px]">  
            {toasts.map((toast) => (
                <div key={toast.uuid} 
                   className="alert alert-success py-3 px-4 text-gray-100 rounded-md">

                    <Link href={toast.group_id 
                               ? route('chat.group', toast.group_id)
                               : route('chat.user', toast.user?.id)}
                            className="flex items-center gap-2"
                    >
                         {toast.user && <UserAvatar user={toast.user}/> }
                         <span>{toast.message}</span>
                    </Link>
                   </div>
            ))}
        </div>
    );
}