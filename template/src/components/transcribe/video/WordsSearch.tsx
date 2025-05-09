import { memo } from "react";
import { WordSearchBar } from "./WordSearchBar";
import { WordSearchResult } from "./WordSearchResult";
import type { SentencesResponse, Transcript } from "assemblyai";
import type { ChapterWords } from "@/components/transcribe/common/TranscriptFollower.tsx";
import { $wordStore } from "@/store/transcribe/transcribeStore.ts";
import { Popup } from "@/components/transcribe/common/Popup.tsx";

export type WordsSearchProps = {
  searching: boolean;
  onClose: () => void;
  transcript: Transcript | undefined;
  chapterWords: Map<number, ChapterWords> | undefined;
  sentences: SentencesResponse | undefined;
};

export const WordsSearch = memo((props: WordsSearchProps) => {
  const closePopup = () => {
    props.onClose();
  };

  return (
    <Popup open={props.searching} title="Search Word" onClose={() => props.onClose()}>
      <WordSearchBar words={$wordStore.get() || []} />
      <WordSearchResult onWordClicked={closePopup} />
    </Popup>
  );
});
