import { memo } from "react";
import type { TranscriptWord } from "assemblyai";
import type { Sentence } from "@/utils/transcribe/converters.ts";

export interface EditableSentenceProps {
  sentence: Sentence;
  searchWord: string;
  searchWordLocations?: number[];
  onWordClicked: (word: TranscriptWord) => void;
}

export const EditableSentence = memo((props: EditableSentenceProps) => {
  const onWordClicked = (word: TranscriptWord) => {
    props.onWordClicked(word);
  };

  const getClasses = (start: number): string => {
    let classes = "mr-1 select-none cursor-pointer";
    if (props.searchWordLocations) {
      for (let i = 0; i < props.searchWordLocations.length; ++i) {
        if (start === props.searchWordLocations[i]) {
          classes += " bg-green-300";
        }
      }
    }
    return classes;
  };

  return (
    <div className="inline-flex w-fit flex-wrap">
      {props.sentence.rawWords.map((word) => (
        <span className={getClasses(word.start)} onClick={() => onWordClicked(word)}>
          {word.text}
        </span>
      ))}
    </div>
  );
});
