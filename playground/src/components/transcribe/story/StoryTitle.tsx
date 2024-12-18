import React, {useRef, useState} from "react";
import { recordStoryChange } from "@/store/transcribe/storiesStore.ts";

export const StoryTitle = (props: {
    value: string,
}) => {
    const [title, setTitle] = useState<string>(props.value);
    const titleTxtRef = useRef<HTMLInputElement>(null);

    const onStoryTitleUpdate = () => {
      if(titleTxtRef.current) {
        recordStoryChange({ title: titleTxtRef.current.value })
      }
    }

    return (
        <div className="flex items-center gap-x-2 my-2 pl-2">
            <label htmlFor="story-title">
                Story Title:
            </label>
            <input className="border-black border-2 px-2"
                   type="text"
                   value={title}
                   onInput={e => setTitle(e.currentTarget.value)}
                   ref={titleTxtRef}
                   id="story-title"/>
            <button className="btn btn-blue"
                    onClick={onStoryTitleUpdate}>
                Update
            </button>
        </div>);
}