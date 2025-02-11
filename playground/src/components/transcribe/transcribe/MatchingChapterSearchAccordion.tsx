import { memo, useEffect, useRef, useState } from "react";
import type { Chapter } from "@/utils/transcribe/converters.ts";
import { $chaptersStore, setChapters } from "@/store/transcribe/transcribeStore.ts";
import { recordChapterOverride } from "@/store/transcribe/transcriptOverridesStore.ts";
import { ChapterWordsEditor } from "@/components/transcribe/transcribe/ChapterWordsEditor.tsx";
import { TextSelectionOperation, TextSelectionType } from "@/types.ts";

export interface MatchingChapterResultProps {
  chapter: Chapter;
  searchWord: string;
}

export const MatchingChapterSearchAccordion = memo((props: MatchingChapterResultProps) => {
  const { chapter } = props;

  const contentRef = useRef<HTMLDivElement | null>(null);
  const iconRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [excluded, setExcluded] = useState<boolean>(chapter.excluded);
  const [gist, setGist] = useState(chapter.getGist());

  useEffect(() => {
    setExcluded(chapter.excluded);
  }, [chapter.excluded]);

  const setChapterExcluded = (exclude: boolean) => {
    if ($chaptersStore.get()) {
      // @ts-expect-error never undefined, check iterators
      const tmpChapters = [...$chaptersStore.get()];
      const idx = tmpChapters.findIndex((x) => x.index === props.chapter.index);
      // chapter exists, set it's excluded flag and update chapters
      if (idx !== -1) {
        tmpChapters[idx].excluded = exclude;
      }
      setChapters(tmpChapters);
      setExcluded(exclude);
    }
  };

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

  useEffect(() => {
    setOpen(false);
    setGist(chapter.getGist());
  }, [props]);

  const toggleAccordion = () => {
    setOpen(!open);
  };

  const handleChapterGistChange = () => {
    const newGist = prompt("Override chapter gist:", props.chapter.getGist()) || "";
    recordChapterOverride(props.chapter.index, newGist);
    if (newGist.length > 0) {
      setGist(newGist);
    } else {
      setGist(chapter.getGist());
    }
  };

  const getColor = (): string => (excluded ? "bg-accent-500" : "bg-green-200");
  const createTimeSearchSet = (values: number[] | undefined) => new Set<number>(values);

  return (
    <div className="flex mt-2 w-full pr-10">
      <div className="border-b w-full border-slate-200">
        <button
          onClick={toggleAccordion}
          className="w-full flex justify-between items-center py-5 text-slate-800"
        >
          <div className={`flex ${getColor()} p-2 w-full`}>
            <button
              className="px-4 py-2 rounded-md text-lg shadow-sm transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-myorange bg-myorange text-white hover:bg-myblue"
              onClick={(e) => {
                e.stopPropagation();
                handleChapterGistChange();
              }}
            >
              Edit
            </button>
            <div className="flex flex-col items-start">
              <span>Index: {props.chapter.index}</span>
              <p>
                Gist: <span className="font-bold">{gist}</span>
              </p>
              <label>
                Excluded: {excluded}
                <input
                  type="checkbox"
                  checked={excluded}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => setChapterExcluded(!excluded)}
                />
              </label>
            </div>
          </div>
          <span ref={iconRef} className="text-slate-800 transition-transform duration-300">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="w-8 h-8"
            >
              <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
            </svg>
          </span>
        </button>
        <div
          ref={contentRef}
          className="max-h-0 overflow-hidden transition-all duration-300 ease-in-out"
        >
          <div className="pb-5 text-sm text-slate-500">
            {open && (
              <ChapterWordsEditor
                chapter={props.chapter}
                textSelectOp={TextSelectionOperation.NONE}
                textSelectType={TextSelectionType.NONE}
                searchWord={props.searchWord}
                active={open}
                searchWordLocations={createTimeSearchSet(
                  props.chapter.wordsMap.get(props.searchWord)
                )}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
