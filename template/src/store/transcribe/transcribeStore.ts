import { atom } from "nanostores";
import type {
  Chapter,
  ConvertedTranscript,
  Paragraph,
  Sentence,
  TractStackTranscript,
  Selection,
  Highlight,
  Word,
} from "@/utils/transcribe/converters.ts";

// Stores
export const $paragraphStore = atom<Paragraph[] | undefined>(undefined);
export const setParagraph = (p: Paragraph[] | undefined) => {
  $paragraphStore.set(p);
};

export const $transcriptStore = atom<TractStackTranscript | undefined>(undefined);
export const setTranscript = (p: TractStackTranscript | undefined) => {
  $transcriptStore.set(p);
};

export const $selectionStore = atom<Selection[] | undefined>(undefined);
export const setSelection = (s: Selection[] | undefined) => {
  $selectionStore.set(s);
};

export const $highlightsStore = atom<Highlight[] | undefined>(undefined);
export const setHighlights = (h: Highlight[] | undefined) => {
  $highlightsStore.set(h);
};

export const $wordStore = atom<Word[] | undefined>(undefined);
export const setWords = (p: Word[] | undefined) => {
  $wordStore.set(p);
};

export const $chaptersStore = atom<Chapter[] | undefined>(undefined);
export const setChapters = (c: Chapter[] | undefined) => {
  $chaptersStore.set(c);
};

export const $sentencesStore = atom<Sentence[] | undefined>(undefined);
export const setSentences = (s: Sentence[] | undefined) => {
  $sentencesStore.set(s);
};

export const setDataToStore = (ct: ConvertedTranscript) => {
  if (ct) {
    setTranscript(ct.transcript);
    setWords(ct.words);
    setChapters(ct.chapters);
    setHighlights(ct.highlights);
    setParagraph(ct.paragraphs);
    setSelection(ct.selections);
    setSentences(ct.sentences);
  } else {
    setTranscript(undefined);
    setWords(undefined);
    setChapters(undefined);
    setHighlights(undefined);
    setParagraph(undefined);
    setSelection(undefined);
    setSentences(undefined);
  }
};

// Call overrideWord to override your words in transcribe store as it has to be updated in a few places
export const overrideWord = (wordIdx: number, chapterIdx: number, newWord: string) => {
  const chapters = $chaptersStore.get();
  if (!chapters) return;

  const chapter = (chapters || [])[chapterIdx];

  const wordCopy = { ...chapter.rawWords[wordIdx] };
  // make chapters copy so atomic value updates
  const chapterCopy = { ...chapter };
  chapterCopy.rawWords[wordIdx] = {
    ...wordCopy,
    overrideText: newWord || "",
  };

  // apply new chapter change
  const chaptersCopy = [...chapters];
  chaptersCopy[chapterIdx] = chapterCopy;
  $chaptersStore.set([...chaptersCopy]);

  // and update the same word reference in global words dictionary
  const allWords: Word[] = [...$wordStore.get() || []];
  allWords[wordCopy.globalIndex].overrideText = newWord || "";
  $wordStore.set([...allWords]);
};

export enum ChapterGistType {
  OVERRIDE = 0,
  STORY_OVERRIDE = 1,
}

// empty or undefined newGist removes the override
export const overrideChapterGist = (chapterIdx: number, newGist: string, type: ChapterGistType = ChapterGistType.OVERRIDE) => {
  const chapters = $chaptersStore.get();
  if (!chapters) return;

  const chapter = (chapters || [])[chapterIdx];
  const chapterCopy = { ...chapter };
  if (type === ChapterGistType.OVERRIDE) {
    chapterCopy.overrideGist = newGist;
  } else if (type === ChapterGistType.STORY_OVERRIDE) {
    chapterCopy.storyGist = newGist;
  }

  const chaptersCopy = [...chapters];
  chaptersCopy[chapterIdx] = chapterCopy;
  $chaptersStore.set([...chaptersCopy]);
};