import type { Word } from "@/utils/transcribe/converters.ts";
import { SelectedWordType, TextSelectionOperation, TextSelectionType } from "@/types.ts";
import { getTextBorderColor, getTextSelectionColor } from "@/utils/transcribe/utils.ts";

export interface EditableWordProps {
    chapterIdx: number,
    word: Word,
    wordIdx: number,
    selected: SelectedWordType,
    selectable: boolean,
    mode: TextSelectionType,
    operation: TextSelectionOperation,
    onClick: (idx: number, word: Word) => void,
    onRequestDelete: (idx: number, word: Word) => void,
}

export const EditableWord = (props: EditableWordProps) => {
    const getClass = () => {
        if(!props.selectable) {
            return "mr-3 mt-1 select-none";
        }
        if(props.selected !== SelectedWordType.NOT_SELECTED) {
            if(props.selected === SelectedWordType.FIRST_WORD) {
                return `pr-3 mt-1 selectable select-none border-l-4 rounded-l-lg ${getTextBorderColor(props.mode)} ${getTextSelectionColor(props.mode)}`;
            } else if(props.selected === SelectedWordType.LAST_WORD) {
                return `mr-3 mt-1 selectable select-none border-r-4 rounded-r-lg ${getTextBorderColor(props.mode)} ${getTextSelectionColor(props.mode)}`;
            } else {
                return "pr-3 mt-1 selectable select-none " + getTextSelectionColor(props.mode);
            }
        }
        return "mr-3 mt-1 selectable select-none";
    }

    const canDrawDeleteIcon = () => {
        if(!props.selectable)
            return false;
        return props.operation === TextSelectionOperation.REMOVE
            && props.selected === SelectedWordType.LAST_WORD;
    }

    const drawWord = () => {
        return (
            <span data-chapteridx={props.chapterIdx}
                  data-wordidx={props.wordIdx}
                  className={getClass()}
                  onClick={() => props.onClick(props.wordIdx, props.word)}
            >
            {props.word.getText()}
        </span>
        );
    }

    return canDrawDeleteIcon() ?
            <div className="flex">
                {drawWord()}
                <button className="small-btn btn-red px-1 relative right-[10px] bottom-[8px]"
                        onClick={() => props.onRequestDelete(props.wordIdx, props.word)}>
                    X
                </button>
            </div>
            : drawWord();
};