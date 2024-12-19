import React, {useEffect, useRef, useState} from "react";
import {ChapterWordsEditor} from "../transcribe/ChapterWordsEditor";
import type { Chapter } from "@/utils/transcribe/converters.ts";
import { TextSelectionOperation, type TextSelectionType } from "@/types.ts";

export interface PDFModeChapterEditProps {
    chapter: Chapter,
    textSelectMode: TextSelectionType,
    textSelectOp: TextSelectionOperation,
    onChapterEdit: (chapter: Chapter) => void,
}

export const PDFModeChapter = (props: PDFModeChapterEditProps) => {
    const contentRef = useRef<HTMLDivElement | null>(null);
    const iconRef = useRef<HTMLDivElement | null>(null);
    const [open, setOpen] = useState(false);

    const {chapter} = props;

    useEffect(() => {
        const content = contentRef.current;
        const icon = iconRef.current;

        if (!content || !icon) {
            console.warn("either content or icon are undefined, can't render chapter");
            return;
        }
        // Toggle the content's max-height for smooth opening and closing
        if (!open) {
            content.style.maxHeight = '0';
        } else {
            content.style.maxHeight = content.scrollHeight + 'px';
        }
    }, [open]);

    const toggleAccordion = () => {
        setOpen(!open);
    }

    return (
        <div className="flex mt-2 w-full">
            <div className="border-b w-full border-slate-200">
                <button onClick={toggleAccordion}
                        className="w-full flex justify-between py-5 text-slate-800">
                    <div className="flex gap-x-2 items-center">
                        <button className="px-4 py-2 rounded-md text-lg shadow-sm transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-myorange bg-myorange text-white hover:bg-myblue"
                                onClick={e => {
                                    if(props.onChapterEdit) {
                                        props.onChapterEdit(props.chapter);
                                    }
                                    e.stopPropagation();
                                }}>
                            Edit
                        </button>
                        <span>{chapter.getGist()}</span>
                    </div>
                    <span ref={iconRef} className="text-slate-800 transition-transform duration-300">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"
                                             className="w-4 h-4">
                                        <path
                                            d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z"/>
                                        </svg>
                                    </span>
                </button>
                <div ref={contentRef}
                     className="max-h-0 overflow-hidden transition-all duration-300 ease-in-out">
                    {open &&
                        <ChapterWordsEditor key={chapter.index}
                                            textSelectType={props.textSelectMode}
                                            textSelectOp={props.textSelectOp}
                                            active={open}
                                            chapter={chapter}/>
                    }
                </div>
            </div>
        </div>
    );
}