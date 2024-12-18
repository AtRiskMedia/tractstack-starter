import { v4 as uuidv4 } from 'uuid';
import { SelectedWordType, TextSelectionType } from "@/types.ts";
import { $firstWordSelected, $secondWordSelected, type WordSelection } from "@/store/transcribe/appState.ts";

export const stripSpecialCharsEnd = (str: string): string => {
  const specialChars = [',', '.', '/', '!', '?']; // Add other characters as needed

  while (specialChars.includes(str[str.length - 1])) {
    str = str.slice(0, -1);
  }

  return str;
};

export const getChapterIdx = (node: HTMLElement): number => {
  return getNumberFromAttribute(node, "data-chapteridx");
}

export const getWordIdx = (node: HTMLElement): number => {
  return getNumberFromAttribute(node, "data-wordidx");
}

export const getNumberFromAttribute = (node: HTMLElement, attribute: string): number => {
  if(!node) return -1;

  const chapterStr = node.getAttribute(attribute);
  if(!chapterStr) return -1;

  return Number.parseInt(chapterStr, 10);
}

export const getTextSelectionColor = (mode: TextSelectionType): string => {
  switch (mode) {
    case TextSelectionType.ANECDOTE: return "bg-green-300";
    case TextSelectionType.KEY_POINT: return "bg-blue-300";
    case TextSelectionType.HEADLINE: return "bg-red-300";
    default:
    case TextSelectionType.NONE: return "bg-green-200";
  }
}

export const getTextBorderColor = (mode: TextSelectionType): string => {
  switch (mode) {
    case TextSelectionType.ANECDOTE: return "border-green-400";
    case TextSelectionType.KEY_POINT: return "border-blue-400";
    case TextSelectionType.HEADLINE: return "border-red-400";
    default:
    case TextSelectionType.NONE: return "bg-green-200";
  }
}

export const getWordSelectionType = (wordIdx: number, s: WordSelection): SelectedWordType => {
  if(s.startRange >= 0 && s.endRange >= 0) {
    if(wordIdx === s.startRange)
      return SelectedWordType.FIRST_WORD;
    else if(wordIdx === s.endRange)
      return SelectedWordType.LAST_WORD;
    else if(wordIdx >= s.startRange && wordIdx <= s.endRange)
      return SelectedWordType.MIDDLE;
  }
  return SelectedWordType.NOT_SELECTED;
}

const mergeSelection = (selections: WordSelection[]): WordSelection[] => {
  if(selections?.length === 0) return [];

  // Sort selections by startRange
  const sortedSelections = selections.sort((a, b) => a.startRange - b.startRange);

  // Initialize result with the first selection
  const mergedSelections: WordSelection[] = [sortedSelections[0]];

  for (let i = 1; i < sortedSelections.length; i++) {
    const lastMerged = mergedSelections[mergedSelections.length - 1];
    const current = sortedSelections[i];

    // Check if current selection overlaps with the last merged one
    if (current.startRange <= lastMerged.endRange) {
      // Merge them
      lastMerged.endRange = Math.max(lastMerged.endRange, current.endRange);
    } else {
      // If no overlap, add current selection to the result
      mergedSelections.push(current);
    }
  }

  return mergedSelections;
}

export const mergeSelections = (selections: WordSelection[]): WordSelection[] => {
  if (selections.length === 0) return [];

  const headlines = mergeSelection(selections.filter(x => x.type === TextSelectionType.HEADLINE));
  const anecdots = mergeSelection(selections.filter(x => x.type === TextSelectionType.ANECDOTE));
  const fullQuotes = mergeSelection(selections.filter(x => x.type === TextSelectionType.KEY_POINT));

  return headlines.concat(anecdots).concat(fullQuotes);
};

export const firstAndSecondWordAreDifferent = (): boolean => {
  return $firstWordSelected.get().wordIdx !== $secondWordSelected.get().wordIdx
    && $firstWordSelected.get().chapterIdx === $firstWordSelected.get().chapterIdx;
}

export const isTheSameChapterAsFirstWord = (chapterIdx: number): boolean => {
  if (chapterIdx >= 0) {
    if ($firstWordSelected.get().chapterIdx < 0) {
      return false;
    }
    return $firstWordSelected.get().chapterIdx === chapterIdx;
  }
  return false;
}

export const createNewv4UUID = (): string => uuidv4();

export const generateRandomString = (length: number): string => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters[randomIndex];
  }

  return result;
};

export const createEmptyStory = (transcriptId: string, uuid: string) => {
  return {
    transcriptId,
    uuid,
    title: generateRandomString(12),
    status: 0,
    chaptersOverrides: {},
    wordsSelection: {},
  };
}

export function getSearchParameters() {
  const prmstr = window.location.search.substring(1);
  return prmstr != null && prmstr != "" ? transformToAssocArray(prmstr) : {};
}

function transformToAssocArray( prmstr: string ) {
  const params: Record<string, string> = {};
  const prmarr = prmstr.split("&");
  for ( let i = 0; i < prmarr.length; i++) {
    const tmparr = prmarr[i].split("=");
    params[tmparr[0]] = tmparr[1];
  }
  return params;
}