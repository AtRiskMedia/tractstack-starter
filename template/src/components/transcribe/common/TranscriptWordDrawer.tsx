import type { Word } from "@/utils/transcribe/converters.ts";

export interface EditableWordProps {
  chapterIdx: number;
  word: Word;
  wordIdx: number;
  selected: boolean;
  onClick: (/*idx: number,*/ word: Word) => void;
}

export const TranscriptWordDrawer = (props: EditableWordProps) => {
  const getClass = () => {
    if (props.selected) {
      return `pr-1 mt-1 selectable select-none border-l-4 rounded-l-lg rounded-r-lg bg-green-300 cursor-pointer`;
    }
    return "mr-1 mt-1 selectable select-none cursor-pointer";
  };

  const drawWord = () => {
    return (
      <span className={getClass()} onClick={() => props.onClick(/*props.wordIdx,*/ props.word)}>
        {props.word.getText()}
      </span>
    );
  };

  return drawWord();
};
