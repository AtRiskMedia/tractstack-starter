import {EditableWord} from "./EditableWord";
import {memo, useEffect, useRef, useState} from "react";
import type { Chapter, Word } from "@/utils/transcribe/converters.ts";
import { SelectedWordType, TextSelectionOperation, TextSelectionType } from "@/types.ts";
import {
    $activeWordSelectionMap,
    $allWordsSelectionMap, $firstWordSelected, $secondWordSelected,
    clearActiveWordSelection,
    clearWordsClicked, isFirstWordClicked, isSecondWordClicked, removeWordSelectionAt,
    setAllWordSelection, setWordSelection, type WordSelection,
} from "@/store/transcribe/appState.ts";
import {
    firstAndSecondWordAreDifferent, getWordSelectionType,
    isTheSameChapterAsFirstWord,
    mergeSelections,
} from "@/utils/transcribe/utils.ts";
import { recordWordOverride } from "@/store/transcribe/transcriptOverridesStore.ts";
import { DOUBLE_CLICK_THRESHOLD } from "@/constants.ts";

export type ChapterWordsEditorProps = {
    chapter: Chapter,
    active: boolean,
    textSelectType: TextSelectionType,
    textSelectOp: TextSelectionOperation,
    searchWord?: string,
    searchWordLocations?: Set<number>,
}

function handleDoubleClick(word: Word, props: ChapterWordsEditorProps, wordIdx: number) {
    if(props.textSelectOp !== TextSelectionOperation.ADD) return;

    let sentenceToSelect = undefined;
    const wordStartTime = word.start;
    for (const sentence of props.chapter.rawSentences) {
        if (sentence.start <= wordStartTime && sentence.end >= wordStartTime) {
            sentenceToSelect = sentence;
            break;
        }
    }
    console.log("found sentence: " + sentenceToSelect);
    if (sentenceToSelect) {
        const values = $allWordsSelectionMap.get()[props.chapter.index] || [];
        const wordInSentenceIdx = sentenceToSelect.rawWords.findIndex(x => x.start === word.start);
        if (wordInSentenceIdx !== -1) {
            const firstWordIdx = wordIdx - wordInSentenceIdx;
            const lastWordIdx = wordIdx + (sentenceToSelect.rawWords.length - wordInSentenceIdx) - 1;
            values.push({
                type: props.textSelectType,
                startRange: firstWordIdx,
                endRange: lastWordIdx,
            });
        }

        const mergedValues = mergeSelections(values);
        setAllWordSelection(props.chapter.index, mergedValues);

        clearActiveWordSelection();
        clearWordsClicked();
    }
}

const handleWordEdit = (props: ChapterWordsEditorProps, wordIdx: number, changed: (newWord: string) => void) => {
    const newWord = prompt("Override word:", props.chapter.rawWords[wordIdx].getText()) || "";
    recordWordOverride(wordIdx, props.chapter.index, newWord);
    changed(newWord);
}

const handleTextAddition = (props: ChapterWordsEditorProps, wordIdx: number) => {
    if (!isFirstWordClicked()) {
        $firstWordSelected.set({chapterIdx: props.chapter.index, wordIdx});
        setWordSelection(props.chapter.index, {
            type: props.textSelectType,
            startRange: wordIdx,
            endRange: wordIdx,
        });
    } else if (!isSecondWordClicked()) {
        if(!isTheSameChapterAsFirstWord(props.chapter.index)) {
            return;
        }
        $secondWordSelected.set({chapterIdx: props.chapter.index, wordIdx});

        if (firstAndSecondWordAreDifferent()) {
            const values = $allWordsSelectionMap.get()[props.chapter.index] || [];
            const firstWordIdx = $firstWordSelected.get().wordIdx;
            const lastWordIdx = $secondWordSelected.get().wordIdx;
            // start range should be less than end range
            values.push({
                type: props.textSelectType,
                startRange: Math.min(firstWordIdx, lastWordIdx),
                endRange: Math.max(firstWordIdx, lastWordIdx),
            });

            const mergedValues = mergeSelections(values);
            setAllWordSelection(props.chapter.index, mergedValues);
        }
        clearActiveWordSelection();
        clearWordsClicked();
    }
}

export const ChapterWordsEditor = memo((props: ChapterWordsEditorProps) => {
    const [words, setWords] = useState<Word[]>(props.chapter.rawWords);
    const val = $activeWordSelectionMap.get()[props.chapter.index];
    const [activeSelection, setActiveSelection] = useState<WordSelection | null>(val);

    const allEntries = $allWordsSelectionMap.get()[props.chapter.index] || [];
    const [allSelections, setAllSelections] = useState<WordSelection[]>(allEntries);
    const clickTime = useRef<number>(0);

    useEffect(() => {
        const activeSelectionChange = $activeWordSelectionMap.subscribe((newVal) => {
            if (Object.keys(newVal).length === 0) {
                setActiveSelection(null);
            } else {
                const chapterIdx = Number.parseInt(Object.keys(newVal)[0], 10);
                if (chapterIdx === props.chapter.index) {
                    const data = Object.values(newVal)[0] as WordSelection;
                    setActiveSelection({...data});
                }
            }
        });
        const allSelectionChange = $allWordsSelectionMap.subscribe((newVal) => {
            if (Object.keys(newVal).length === 0) {
                setAllSelections([]);
            } else if (newVal[props.chapter.index]) {
                const data = newVal[props.chapter.index] as WordSelection[];
                setAllSelections([...data]);
            }
        })
        return () => {
            activeSelectionChange();
            allSelectionChange();
        }
    }, []);

    const getSelectMode = (word: Word, wordIdx: number): SelectedWordType => {
        const getSelection = (s: WordSelection): SelectedWordType => {
            if (s.type !== props.textSelectType)
                return SelectedWordType.NOT_SELECTED;

            return getWordSelectionType(wordIdx, s);
        }

        if (props.searchWordLocations?.has(word.start)) {
            return SelectedWordType.MIDDLE;
        }

        if (activeSelection) {
            const selectionType = getSelection(activeSelection);
            if (selectionType !== SelectedWordType.NOT_SELECTED)
                return selectionType;
        }
        for (let i = 0; i < allSelections.length; ++i) {
            const selectionType = getSelection(allSelections[i]);
            if (selectionType !== SelectedWordType.NOT_SELECTED)
                return selectionType;
        }
        return SelectedWordType.NOT_SELECTED;
    }

    function handleSingleClick(props: ChapterWordsEditorProps, wordIdx: number) {
        if(props.textSelectOp === TextSelectionOperation.ADD) {
            handleTextAddition(props, wordIdx);
        } else if(props.textSelectOp === TextSelectionOperation.EDIT) {
            handleWordEdit(props, wordIdx, newWord => {
                const data = {...words[wordIdx]};
                data.overrideText = newWord;
                words[wordIdx] = data;
                setWords([...words]);
            });
        }
    }

    const onWordClicked = (wordIdx: number, word: Word) => {
        if(props.textSelectOp !== TextSelectionOperation.EDIT) {
            if (props.textSelectType === TextSelectionType.NONE) return;
        }
        
        const curTime = new Date().getTime();
        const isDoubleClick = curTime - clickTime.current <= DOUBLE_CLICK_THRESHOLD;
        clickTime.current = curTime;

        if (isDoubleClick) {
            handleDoubleClick(word, props, wordIdx);
        } else {
            handleSingleClick(props, wordIdx);
        }
    }

    const onDeleteSentence = (wordIdx: number) => {
        const chapterSelections = $allWordsSelectionMap.get()[props.chapter.index] || [];
        const idx = chapterSelections.findIndex(x => x.type === props.textSelectType && x.endRange === wordIdx);
        if(idx !== -1) {
            removeWordSelectionAt(props.chapter.index, idx);
        }
    }

    return (
        <div className="selectable-container px-5 py-5">
            <div id="drag-container" className="flex flex-wrap">
                {words &&
                    words.map(((w, idx) => <EditableWord selected={getSelectMode(w, idx)}
                                                         chapterIdx={props.chapter.index}
                                                         wordIdx={idx}
                                                         mode={props.textSelectType}
                                                         selectable={props.active}
                                                         key={idx}
                                                         onClick={onWordClicked}
                                                         onRequestDelete={onDeleteSentence}
                                                         operation={props.textSelectOp}
                                                         word={w}/>
                    ))
                }
            </div>
        </div>
    );
});