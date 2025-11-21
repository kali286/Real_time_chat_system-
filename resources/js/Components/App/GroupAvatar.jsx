import {UsersIcon} from "@heroicons/react/24/solid";

const GroupAvatar = ({}) => {
    return (
        <>
           <div className="chat-image avatar placeholder">
                <div className="bg-gray-400 text-gray-800 rounded-full w-8 flex items-center justify-center">
                    <UsersIcon className="w-5 h-5" />
                </div>
           </div>
        </>
    );
}

export default GroupAvatar;