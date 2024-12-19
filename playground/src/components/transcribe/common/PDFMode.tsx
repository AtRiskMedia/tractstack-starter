import React, {memo, useState} from "react";
import {PDFModeChapter} from "./PDFModeChapter";
import {ToggleButton} from "./ToggleButton";
import {SelectionStats} from "../story/SelectionStats";
import {useStore} from "@nanostores/react";
import { TextSelectionOperation, TextSelectionType } from "@/types.ts";
import type { Chapter } from "@/utils/transcribe/converters.ts";
import { $chaptersStore } from "@/store/transcribe/transcribeStore.ts";

export type PDFModeProps = {
    availableTextOperations: TextSelectionOperation[];
    defaultTextOperation: TextSelectionOperation;
    showTextSelectionOperations: boolean;
    showStats: boolean;

    availableTextModes: TextSelectionType[];
    defaultTextMode: TextSelectionType;

    onChapterEdit?: (chapter: Chapter) => void;
}

export const PDFMode = memo((props: PDFModeProps) => {
    const allChapters = useStore($chaptersStore);
    const [activeTextMode, setActiveTextMode] = useState<TextSelectionType>(props.defaultTextMode);
    const [activeTextOp, setActiveTextOp] = useState<TextSelectionOperation>(props.defaultTextOperation);

    const isTextModeAvailable = (mode: TextSelectionType) => props.availableTextModes.includes(mode);
    const isTextOpAvailable = (op: TextSelectionOperation) => props.availableTextOperations.includes(op);

    const onChapterEdit = (chapter: Chapter) => {
        if(props.onChapterEdit) {
            props.onChapterEdit(chapter);
        }
    }

    return (
        <div className="flex flex-col">
            <aside className="flex flex-col h-fit bg-gray-200 sticky top-0 py-2 px-5">
                <div className="flex gap-x-2">
                    {isTextModeAvailable(TextSelectionType.ANECDOTE) &&
                        <ToggleButton checkActive={() => activeTextMode === TextSelectionType.ANECDOTE}
                                      activeClassName="px-4 py-2 rounded-md text-lg shadow-sm transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-myorange bg-green-500 text-white hover:bg-green-500"
                                      inactiveClassName="px-4 py-2 rounded-md text-lg shadow-sm transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-myorange bg-green-900 text-white hover:bg-green-500"
                                      onClick={() => setActiveTextMode(TextSelectionType.ANECDOTE)}
                                      text="ANECDOTE"/>
                    }
                    {isTextModeAvailable(TextSelectionType.HEADLINE) &&
                        <ToggleButton checkActive={() => activeTextMode === TextSelectionType.HEADLINE}
                                      activeClassName="px-4 py-2 rounded-md text-lg shadow-sm transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-myorange bg-orange-500 text-white hover:bg-orange-500"
                                      inactiveClassName="px-4 py-2 rounded-md text-lg shadow-sm transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-myorange bg-orange-900 text-white hover:bg-orange-500"
                                      onClick={() => setActiveTextMode(TextSelectionType.HEADLINE)}
                                      text="HEADLINE"/>
                    }
                    {isTextModeAvailable(TextSelectionType.KEY_POINT) &&
                        <ToggleButton checkActive={() => activeTextMode === TextSelectionType.KEY_POINT}
                                      activeClassName="px-4 py-2 rounded-md text-lg shadow-sm transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-myorange bg-blue-500 text-white hover:bg-blue-500"
                                      inactiveClassName="px-4 py-2 rounded-md text-lg shadow-sm transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-myorange bg-blue-900 text-white hover:bg-blue-500"
                                      onClick={() => setActiveTextMode(TextSelectionType.KEY_POINT)}
                                      text="KEY POINT"/>
                    }
                </div>
                {props.showTextSelectionOperations &&
                    <div className="flex mt-4 gap-x-2 items-center">
                        <span className="font-bold">Text Operation:</span>
                        {isTextOpAvailable(TextSelectionOperation.ADD) &&
                            <ToggleButton checkActive={() => activeTextOp === TextSelectionOperation.ADD}
                                          activeClassName="px-4 py-2 rounded-md text-lg shadow-sm transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-myorange bg-green-500 text-white hover:bg-green-500"
                                          inactiveClassName="px-4 py-2 rounded-md text-lg shadow-sm transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-myorange bg-green-900 text-white hover:bg-green-500"
                                          onClick={() => setActiveTextOp(TextSelectionOperation.ADD)}
                                          text="Add"/>
                        }
                        {isTextOpAvailable(TextSelectionOperation.EDIT) &&
                            <ToggleButton checkActive={() => activeTextOp === TextSelectionOperation.EDIT}
                                          activeClassName="px-4 py-2 rounded-md text-lg shadow-sm transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-myorange bg-blue-500 text-white hover:bg-blue-500"
                                          inactiveClassName="px-4 py-2 rounded-md text-lg shadow-sm transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-myorange bg-blue-900 text-white hover:bg-blue-500"
                                          onClick={() => setActiveTextOp(TextSelectionOperation.EDIT)}
                                          text="Edit"/>
                        }
                        {isTextOpAvailable(TextSelectionOperation.REMOVE) &&
                            <ToggleButton checkActive={() => activeTextOp === TextSelectionOperation.REMOVE}
                                          activeClassName="px-4 py-2 rounded-md text-lg shadow-sm transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-myorange bg-red-500 text-white hover:bg-red-500"
                                          inactiveClassName="px-4 py-2 rounded-md text-lg shadow-sm transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-myorange bg-red-900 text-white hover:bg-red-500"
                                          onClick={() => setActiveTextOp(TextSelectionOperation.REMOVE)}
                                          text="Remove"/>
                        }
                    </div>
                }
            </aside>
            {props.showStats &&
                <SelectionStats/>
            }
            <div className="flex flex-col m-5">
                {
                    allChapters &&
                    allChapters
                        .filter(x => !x.excluded) // check chapter is not turned off
                        .map(x => <PDFModeChapter chapter={x}
                                                  textSelectMode={activeTextMode}
                                                  textSelectOp={activeTextOp}
                                                  onChapterEdit={onChapterEdit}/>)
                }
            </div>
            {/*commenting it out for now until we get basic selection up and running well*/}
        </div>
    );
});