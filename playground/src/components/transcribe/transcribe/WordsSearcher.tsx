import { ReactSearchAutocomplete } from "react-search-autocomplete";
import { useMemo, useState } from "react";
import type { Word } from "@/utils/transcribe/converters.ts";
import { stripSpecialCharsEnd } from "@/utils/transcribe/utils.ts";
import { setSearchWord } from "@/store/transcribe/appState.ts";

export interface WordsSearcherProps {
  words: Word[];
}

const buildWordsMap = (words: Word[]): Map<string, Word[]> => {
  console.time("buildWordsMap");
  const map = new Map<string, Word[]>();
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const cleanText = stripSpecialCharsEnd(w.getText()).toLowerCase();
    if (map.has(cleanText)) {
      map.get(cleanText)?.push(w);
    } else {
      map.set(cleanText, [w]);
    }
  }
  console.timeEnd("buildWordsMap");
  return map;
};

type SearchString = {
  id: number;
  text: string;
};

export const WordsSearcher = (props: WordsSearcherProps) => {
  const [searchString, setSearchString] = useState<string>("");

  const wordsMap = useMemo<Map<string, Word[]>>(() => buildWordsMap(props.words), [props.words]);
  const searchStrings = useMemo<SearchString[]>(() => {
    const data: SearchString[] = [];
    let i = 0;
    for (const word of wordsMap.keys()) {
      data.push({
        id: i++,
        text: word,
      });
    }
    return data;
  }, [wordsMap]);

  const handleOnSearch = (str: string, results: SearchString[]) => {
    // onSearch will have as the first callback parameter
    // the string searched and for the second the results.
    console.log(str, results);
  };

  const handleOnHover = () => {
    // the item hovered
  };

  const handleOnSelect = (item: SearchString) => {
    // the item selected
    setSearchWord(item.text);
    //console.log(wordsMap.get(item.text));
  };

  const handleOnFocus = () => {
    //console.log('Focused')
  };

  const handleOnClear = () => {
    setSearchString("");
    //console.log("Cleared");
  };

  const formatResult = (item: SearchString) => {
    return (
      <div key={item.id}>
        <span style={{ display: "block", textAlign: "left" }}>{item.text}</span>
      </div>
    );
  };

  return (
    <ReactSearchAutocomplete
      items={searchStrings}
      onSearch={handleOnSearch}
      onHover={handleOnHover}
      onSelect={handleOnSelect}
      onFocus={handleOnFocus}
      onClear={handleOnClear}
      fuseOptions={{ keys: ["text"], threshold: 0 }}
      resultStringKeyName="text"
      inputDebounce={50}
      inputSearchString={searchString}
      styling={{ zIndex: 4 }} // To display it on top of the search box below
      autoFocus
      formatResult={formatResult}
    />
  );
};
