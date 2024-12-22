import { memo, useEffect, useRef, useState } from "react";
import type { TranscriptWord } from "assemblyai";
import type { Chapter } from "@/utils/transcribe/converters.ts";
import { EditableSentence } from "@/components/transcribe/video/EditableSentence.tsx";

export interface MatchingChapterResultProps {
  chapter: Chapter;
  searchWord: string;
  onWordClicked: (word: TranscriptWord) => void;
}

export const MatchingChapterResult = memo((props: MatchingChapterResultProps) => {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const iconRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const content = contentRef.current;
    const icon = iconRef.current;

    if (!content || !icon) {
      console.warn("either content or icon are undefined, can't render chapter");
      return;
    }
    // Toggle the content's max-height for smooth opening and closing
    if (!open) {
      content.style.maxHeight = "0";
    } else {
      content.style.maxHeight = content.scrollHeight + "px";
    }
  }, [open]);

  const toggleAccordion = () => {
    setOpen(!open);
  };

  return (
    <div className="flex mt-2 w-fit">
      <div className="border-b border-slate-200">
        <button
          onClick={toggleAccordion}
          className="w-full flex justify-between items-center py-5 text-slate-800"
        >
          <span>{props.chapter.getGist()}</span>
          <span ref={iconRef} className="text-slate-800 transition-transform duration-300">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
            </svg>
          </span>
        </button>
        <div
          ref={contentRef}
          className="max-h-0 overflow-hidden transition-all duration-300 ease-in-out"
        >
          <div className="pb-5 text-sm text-slate-500 w-fit flex-wrap">
            {props.chapter.rawSentences.map((x) => (
              <EditableSentence
                sentence={x}
                searchWord={props.searchWord}
                onWordClicked={props.onWordClicked}
                searchWordLocations={x.wordsMap.get(props.searchWord)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});
