import {atom} from "nanostores";
import {$chaptersStore, overrideChapterGist, overrideWord} from "./transcribeStore";

// Types
// ================

export type WordOverride = {
    word: string;
    chapterIdx: number,
    inChapterIdx: number,
}

export type ChapterOverride = {
    gist: string;
    excluded: boolean;
}

export type TranscriptOverride = {
    transcriptId: string;
    wordOverrides: Map<number, WordOverride>;
    chapterOverrides: Map<number, ChapterOverride>;
}

// Atomics
// ================

export const $activeTranscriptOverride = atom<TranscriptOverride>();

// Helper methods
// ================

export const applyTranscriptOverrides = (overrides: TranscriptOverride) => {
    if(overrides) {
        setActiveTranscriptOverrideFromData(overrides);

        if(overrides?.wordOverrides?.size > 0) {
            for (const [key, value] of overrides.wordOverrides) {
                if(value.word) {
                    overrideWord(value.inChapterIdx, value.chapterIdx, value.word);
                }
            }
        }
        if(overrides?.chapterOverrides?.size > 0) {
            for (const [key, value] of overrides.chapterOverrides) {
                if(value.gist) {
                    overrideChapterGist(key, value.gist);
                }
            }
        }
    }
}

export const createEmptyTranscriptOverride = (transcriptId: string): TranscriptOverride => {
    return <TranscriptOverride>{
        wordOverrides: new Map<number, WordOverride>(),
        chapterOverrides: new Map<number, ChapterOverride>(),
        transcriptId: transcriptId,
    }
}

export const setActiveTranscriptOverrideFromData = (activeTranscriptOverride: TranscriptOverride) => {
    if(!activeTranscriptOverride) {
        $activeTranscriptOverride.set(createEmptyTranscriptOverride(""));
    } else {
        if(!(activeTranscriptOverride.wordOverrides instanceof Map)) {
            activeTranscriptOverride.wordOverrides = new Map<number, WordOverride>();
        }
        if(!(activeTranscriptOverride.chapterOverrides instanceof Map)) {
            activeTranscriptOverride.chapterOverrides = new Map<number, ChapterOverride>();
        }
        $activeTranscriptOverride.set(activeTranscriptOverride);
    }
}

export const recordWordOverride = (wordIdx: number, chapterIdx: number, newWord: string) => {
    const chapters = $chaptersStore.get();
    if(!chapters) return;

    const activeOverride = $activeTranscriptOverride.get();
    if(activeOverride) {
        const chapter = (chapters || [])[chapterIdx];
        const word = chapter.rawWords[wordIdx];
        if(word) {
            const tmpOverride = {...activeOverride};
            const existingData = tmpOverride.wordOverrides?.get(word.globalIndex) || {};
            tmpOverride.wordOverrides.set(word.globalIndex, {
                ...existingData,
                word: newWord,
                inChapterIdx: wordIdx,
                chapterIdx: chapterIdx,
            });
            $activeTranscriptOverride.set(tmpOverride);
        }
    }
    overrideWord(wordIdx, chapterIdx, newWord);
}

export const recordChapterOverride = (chapterIdx: number, newGist: string) => {
    const chapters = $chaptersStore.get();
    if (!chapters) return;

    const activeOverride = $activeTranscriptOverride.get();
    if (activeOverride) {
        const chapter = (chapters || [])[chapterIdx];

        if(chapter) {
            const tmpOverride = {...activeOverride};
            const existingData = tmpOverride.chapterOverrides?.get(chapterIdx) || {};
            tmpOverride.chapterOverrides.set(chapterIdx, {
                ...existingData,
                gist: newGist,
                excluded: chapter.excluded,
            });
            $activeTranscriptOverride.set(tmpOverride);
        }
    }
    overrideChapterGist(chapterIdx, newGist);
}