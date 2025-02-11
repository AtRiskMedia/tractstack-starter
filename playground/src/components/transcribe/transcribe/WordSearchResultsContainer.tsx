import { useStore } from "@nanostores/react";
import React, { memo, useEffect, useState } from "react";
import { MatchingChapterSearchAccordion } from "./MatchingChapterSearchAccordion";
import { $searchWord } from "@/store/transcribe/appState.ts";
import { $chaptersStore, setChapters } from "@/store/transcribe/transcribeStore.ts";
import type { Chapter } from "@/utils/transcribe/converters.ts";

export const WordSearchResultsContainer = memo(() => {
  const searchWord = useStore($searchWord);
  const chapters = $chaptersStore.get();

  const [allChapters, setAllChapters] = React.useState<Chapter[]>(chapters || []);
  const [matchingChapters, setMatchingChapters] = useState<Chapter[]>([]);

  const excludeAll = (exclude: boolean) => {
    if (!chapters) return;

    const tmpChapters = [...allChapters];
    for (let i = 0; i < tmpChapters.length; ++i) {
      tmpChapters[i] = { ...tmpChapters[i] };
      tmpChapters[i].excluded = exclude;
    }
    const tmpMatchingChapters = [...matchingChapters];
    for (let i = 0; i < matchingChapters.length; ++i) {
      tmpMatchingChapters[i] = { ...tmpMatchingChapters[i] }; // make a new chapter to update the data
      tmpMatchingChapters[i].excluded = exclude;
    }

    setChapters(tmpChapters);
    setMatchingChapters(tmpMatchingChapters);
    setAllChapters(tmpChapters);
  };

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

  return (
    <div className="mt-5 ml-5">
      <div className="flex gap-x-4">
        <button
          className="px-4 py-2 rounded-md text-lg shadow-sm transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-myorange bg-myorange text-white hover:bg-myblue"
          onClick={() => excludeAll(true)}
        >
          Exclude All
        </button>
        <button
          className="px-4 py-2 rounded-md text-lg shadow-sm transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-myorange bg-myorange text-white hover:bg-myblue"
          onClick={() => excludeAll(false)}
        >
          Clear Excluded
        </button>
      </div>
      <p>search word: {searchWord}</p>
      {matchingChapters.map((chapter) => (
        <MatchingChapterSearchAccordion chapter={chapter} searchWord={searchWord} />
      ))}
    </div>
  );
});
