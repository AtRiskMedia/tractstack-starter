import { useStore } from "@nanostores/react";
import { memo, useEffect, useState } from "react";
import type { TranscriptWord } from "assemblyai";
import { $searchWord, $videoPlayer } from "@/store/transcribe/appState.ts";
import type { Chapter } from "@/utils/transcribe/converters.ts";
import { $chaptersStore } from "@/store/transcribe/transcribeStore.ts";
import { convertMillisecondsToSeconds } from "@/utils/transcribe/utils.ts";
import { MatchingChapterResult } from "@/components/transcribe/video/MatchingChapterResult.tsx";

export type WordSearchResultProps = {
  onWordClicked?: (word: TranscriptWord) => void;
};

export const WordSearchResult = memo((props: WordSearchResultProps) => {
  const searchWord = useStore($searchWord);

  const [matchingChapters, setMatchingChapters] = useState<Chapter[]>([]);

  useEffect(() => {
    // subscribe to listen for store changes
    const searchWordUnsub = $searchWord.subscribe((newValue) => {
      const chaptersWithWord = $chaptersStore.get()?.filter((x) => x.words.has(newValue)) || [];
      console.log(`word: ${newValue} | matching chapters: ${chaptersWithWord.length}`);
      setMatchingChapters(chaptersWithWord);
    });

    // unsubscribe from store changes
    return () => {
      searchWordUnsub();
    };
  }, []);

  const onWordClicked = (word: TranscriptWord) => {
    $videoPlayer.get().setCurrentTime(convertMillisecondsToSeconds(word.start));
    if (props.onWordClicked) {
      props.onWordClicked(word);
    }
  };

  return (
    <div className="mt-5 ml-5 w-fit">
      <p>search word: {searchWord}</p>
      {matchingChapters
        .filter((x) => !x.excluded) // check chapter is not turned off
        .map((x) => (
          <MatchingChapterResult
            chapter={x}
            searchWord={searchWord}
            onWordClicked={onWordClicked}
          />
        ))}
    </div>
  );
});
