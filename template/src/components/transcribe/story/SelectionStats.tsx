import { memo, useEffect, useState } from "react";
import { $allWordsSelectionMap, type WordSelection } from "@/store/transcribe/appState.ts";
import { TextSelectionType } from "@/types.ts";

type StatsType = {
  anecdotes: number;
  headlines: number;
  keyPoints: number;
};

export const SelectionStats = memo(() => {
  const calculateStats = (stats: Record<number, WordSelection[]>) => {
    let anecdotes = 0;
    let headlines = 0;
    let keyPoints = 0;
    if (Object.keys(stats).length > 0) {
      for (const key in stats) {
        stats[key].forEach((x) => {
          switch (x.type) {
            case TextSelectionType.HEADLINE:
              ++headlines;
              break;
            case TextSelectionType.KEY_POINT:
              ++keyPoints;
              break;
            case TextSelectionType.ANECDOTE:
              ++anecdotes;
              break;
          }
        });
      }
    }
    return { anecdotes, headlines, keyPoints };
  };

  const [stats, setStats] = useState<StatsType>(calculateStats($allWordsSelectionMap.get()));
  useEffect(() => {
    const wordsSelection = $allWordsSelectionMap.subscribe((newValue) => {
      setStats(calculateStats(newValue));
    });
    return () => {
      wordsSelection();
    };
  }, []);

  return (
    <div className="flex p-2 gap-x-2">
      <div className="rounded-md bg-green-600 py-0.5 px-2.5 border border-transparent text-sm text-white transition-all shadow-sm">
        Anecdotes: {stats.anecdotes}
      </div>
      <div className="rounded-md bg-amber-600 py-0.5 px-2.5 border border-transparent text-sm text-slate-800 transition-all shadow-sm">
        Headlines: {stats.headlines}
      </div>
      <div className="rounded-md bg-blue-600 py-0.5 px-2.5 border border-transparent text-sm text-white transition-all shadow-sm">
        Key Points: {stats.keyPoints}
      </div>
    </div>
  );
});
