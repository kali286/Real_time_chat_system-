import { useEffect, useRef } from "react";


const NewMessageInput = ({value, onChange, onSend}) => {

    const input = useRef();
    const onInputKeyDown = (ev) => {
        if (ev.key === "Enter" && !ev.shiftKey) {
           ev.preventDefault();
           onSend();
        }
    };

    const onChangeEvent = (ev) => {
        // adjust height after value change
        setTimeout(() => {
            adjustHeight();
        }, 10);
        onChange(ev);
    };
      
    const adjustHeight = () => {
        setTimeout(() => {
             input.current.style.height = "auto";
             input.current.style.height = input.current.scrollHeight + 1 + "px";
        }, 100);
    };

    useEffect(() => {
       adjustHeight();
    }, [value]);
      
     return (
         <textarea
            ref={input}
            value={value}
            rows={1}
            placeholder="Type a message..."
            onKeyDown={onInputKeyDown}
            onChange={onChangeEvent}
            className="w-full bg-transparent px-3 py-2 text-sm text-gray-900 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none resize-none max-h-40 transition-colors"
            style={{lineHeight: '1.3'}}
         ></textarea>
     );

};

export default NewMessageInput;