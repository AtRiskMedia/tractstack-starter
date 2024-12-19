import {atom} from "nanostores";
import {AssemblyAI} from "assemblyai";
import {$activeStoryUuid, $stories} from "./storiesStore";
import type { StoryData } from "@/types.ts";

export const $videoPlayer = atom(undefined);

export const $searchWord = atom<string>("");
export const setSearchWord = (word: string) => {
    $searchWord.set(word);
}

export type WordSelection = {
    startRange: number;
    endRange: number;
    type: string;
}

// Store a map-like structure inside an atom
export const $activeWordSelectionMap = atom<Record<number, WordSelection>>({});

export const clearActiveWordSelection = () => {
    $activeWordSelectionMap.set({});
}

export const setWordSelection = (chapterIdx: number, selection: WordSelection) => {
    const currentMap = $activeWordSelectionMap.get();
    $activeWordSelectionMap.set({
        ...currentMap,
        [chapterIdx]: selection
    });
}

// All words selections

export const $allWordsSelectionMap = atom<Record<number, WordSelection[]>>([]);

export const clearAllWordsSelection = () => {
    $allWordsSelectionMap.set([]);
}

export const setAllWordSelection = (chapterIdx: number, selections: WordSelection[]) => {
    const currentMap = $allWordsSelectionMap.get();
    $allWordsSelectionMap.set({
        ...currentMap,
        [chapterIdx]: selections
    });

    const activeStoryUuid = $activeStoryUuid.get() || "";
    if(activeStoryUuid.length > 0) {
        const stories = new Map($stories.get());
        const story = stories.get(activeStoryUuid);
        if (story) {
            story.wordsSelection = { ...$allWordsSelectionMap.get() };
            $stories.set(stories);
        }
    }
}

export const removeWordSelectionAt = (chapterIdx: number, removeAtIdx: number) => {
    const currentMap = $allWordsSelectionMap.get();
    const chapterMap = $allWordsSelectionMap.get()[chapterIdx];
    if(!chapterMap) return;

    chapterMap.splice(removeAtIdx, 1);
    $allWordsSelectionMap.set({
        ...currentMap,
        [chapterIdx]: [...chapterMap]
    });

    const activeStoryUuid = $activeStoryUuid.get() || "";
    if(activeStoryUuid.length > 0) {
        const stories = new Map($stories.get());
        const story = stories.get(activeStoryUuid);
        if(story) {
            story.wordsSelection = { ...$allWordsSelectionMap.get() };
            $stories.set(stories);
        }
    }
}

export const populateAllWordsSelection = (storyData: StoryData) => {
    if(storyData) {
        $allWordsSelectionMap.set(storyData?.wordsSelection || []);
    } else {
        clearAllWordsSelection();
    }
}

// clicked words
type SelectedWord = {chapterIdx: number, wordIdx: number};
const EmptyWordSelection: SelectedWord = {chapterIdx: -1, wordIdx: -1};

export const $firstWordSelected = atom<SelectedWord>({...EmptyWordSelection});
export const $secondWordSelected = atom<SelectedWord>({...EmptyWordSelection});

const isWordClicked = (word: SelectedWord): boolean => word.wordIdx >= 0 && word.chapterIdx >= 0;

export const isFirstWordClicked = (): boolean => isWordClicked($firstWordSelected.get());
export const isSecondWordClicked = (): boolean => isWordClicked($secondWordSelected.get());

export const clearWordsClicked = () => {
    $firstWordSelected.set({...EmptyWordSelection});
    $secondWordSelected.set({...EmptyWordSelection});
}

// assemblyai
export const $aaiClient = atom<AssemblyAI|undefined>(undefined);