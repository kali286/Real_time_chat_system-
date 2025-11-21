const UserAvatar = ({ user, online = null, profile = false, hasStatus = false, onClick }) => {
    let onlineClass =
        online === true ? "online" : online === false ? "offline" : "";

    const sizeClass = profile ? "w-40" : "w-8";
    const ringClass = hasStatus ? "ring-2 ring-emerald-500 ring-offset-2 ring-offset-transparent" : "";
    const clickableClass = onClick ? "cursor-pointer" : "";

    const handleClick = (e) => {
        if (onClick) {
            onClick(e);
        }
    };

    return (
        <>
            {user.avatar_url && (
                <div className={`chat-image avatar ${onlineClass} ${clickableClass}`} onClick={handleClick}>
                    <div className={`rounded-full ${sizeClass} ${ringClass}`}>
                        <img src={user.avatar_url} alt="profile" />
                    </div>
                </div>
            )}

            {!user.avatar_url && (
                <div className={`chat-image avatar placeholder ${onlineClass} ${clickableClass}`} onClick={handleClick}>
                    <div className={`bg-gray-400 text-gray-800 rounded-full ${sizeClass} flex items-center justify-center ${ringClass}`}>
                        <span className="text-base font-semibold">
                            {user.name.substring(0, 1).toUpperCase()}
                        </span>
                    </div>
                </div>
            )}
        </>
    );
}

export default UserAvatar;