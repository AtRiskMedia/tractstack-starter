import React, {memo, useEffect, useState} from "react";
import {LoadSpinner} from "../helpers/LoadSpinner";
import {WordsSearcher} from "./WordsSearcher";
import {WordSearchResultsContainer} from "./WordSearchResultsContainer";
import {PDFMode} from "../common/PDFMode";
import { buildTranscript, type Chapter, type ConvertedTranscript, type Word } from "@/utils/transcribe/converters.ts";
import { $wordStore, setDataToStore } from "@/store/transcribe/transcribeStore.ts";
import {
  ActiveView,
  TextSelectionOperation,
  TextSelectionType,
  type TranscriptServerResponse,
} from "@/types.ts";
import { getSearchParameters } from "@/utils/transcribe/utils.ts";
import { JSONBetterParser, JSONBetterStringify } from "@/utils/common/helpers.ts";
import {
    $activeTranscriptOverride,
    applyTranscriptOverrides,
    createEmptyTranscriptOverride, recordChapterOverride,
} from "@/store/transcribe/transcriptOverridesStore.ts";

export const TranscribedVideo = memo(() => {
    const [transcript, setTranscript] = useState<ConvertedTranscript | undefined>(undefined);
    const [allWords, setAllWords] = useState<Word[]>($wordStore.get() || []);
    const [view, setView] = useState<ActiveView>(ActiveView.CHAPTERS);
    const {uuid} = getSearchParameters();

    useEffect(() => {
        let dataReady = false;
        const run = async () => {
            try {
                console.log("retrieving transcript... " + uuid);
                if (uuid) {
                    const transcriptUrl = `/api/transcript?` + new URLSearchParams({transcript_id: uuid}).toString();
                    const transcriptOverrideUrl = `/api/transcript_override?` + new URLSearchParams({transcript_id: uuid}).toString();
                    const data = await Promise.all([
                        await fetch(transcriptUrl),
                        await fetch(transcriptOverrideUrl),
                    ]);

                    const response = await data[0].json() as TranscriptServerResponse;
                    const convertedData = buildTranscript(response.transcript, response.sentences, response.paragraphs);

                    setDataToStore(convertedData);
                    setTranscript(convertedData);
                    setAllWords(convertedData.words);

                    const transcriptOverrides = await data[1].json();
                    if(transcriptOverrides?.length > 0) {
                        const data = JSONBetterParser(transcriptOverrides[0].data);
                        applyTranscriptOverrides(data);
                    } else {
                        $activeTranscriptOverride.set(createEmptyTranscriptOverride(uuid));
                    }
                    dataReady = true;
                }
            } catch (ex) {
                console.error("error retrieving transcript: " + ex);
            }
        };
        run();

        const transcriptOverrideListener = $activeTranscriptOverride.listen((newVal) => {
            if(!dataReady) return;
            const jsonData = JSONBetterStringify(newVal);
            console.log("recorded a new change in transcript override: " + jsonData);

            fetch("/api/transcript_override", {
                method: "PATCH",
                body: JSONBetterStringify({
                    transcriptId: uuid,
                    dataJson: newVal
                })
            }).then(res => console.log("patch transcript, status: " + res.status));
        });

        return () => {
            // can be null if there was never a successful request
           if(transcriptOverrideListener) transcriptOverrideListener();
        }
    }, []);

    const onChapterEdit = (chapter: Chapter) => {
        const newGist = prompt("Override story chapter gist:", chapter.getGist() || "") || "";
        recordChapterOverride(chapter.index, newGist);
    }

    const getView = () => {
        switch (view) {
            case ActiveView.CHAPTERS:
                return (
                    <div className="flex flex-col">
                        <WordsSearcher words={allWords}/>
                        <WordSearchResultsContainer/>
                    </div>
                );
            case ActiveView.PDF_MODE:
                return (
                    <div className="flex flex-col">
                        <PDFMode availableTextModes={[]}
                                 availableTextOperations={[TextSelectionOperation.EDIT]}
                                 defaultTextMode={TextSelectionType.NONE}
                                 defaultTextOperation={TextSelectionOperation.EDIT}
                                 showTextSelectionOperations={false}
                                 showStats={false}
                                 onChapterEdit={onChapterEdit}
                        />
                    </div>
                );
            default:
                return <></>
        }
    }

    return (
        <div>
            {
                transcript ?
                    <div className="flex flex-col">
                        <div className="flex gap-2 font-bold mb-5">
                            <button className="btn btn-green w-40 mr-12"
                                    onClick={() => window.location.href = "/transcribe/transcribes"}>
                                Back
                            </button>

                            <button className="btn btn-blue"
                                    onClick={() => setView(ActiveView.CHAPTERS)}>
                                Transcript Mode
                            </button>
                            <button className="btn btn-blue"
                                    onClick={() => setView(ActiveView.PDF_MODE)}>
                                PDF Mode
                            </button>
                        </div>
                        <div className="flex flex-col">
                            {getView()}
                        </div>
                    </div>
                    :
                    <div className="mx-auto">
                        <LoadSpinner/>
                    </div>
            }
        </div>
    );
});