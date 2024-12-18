import React, {memo, useEffect, useState} from "react";
import { setDataToStore } from "@/store/transcribe/transcribeStore.ts";
import { type StoryData, TextSelectionOperation, TextSelectionType, type TranscriptServerResponse } from "@/types.ts";
import { JSONBetterParser, JSONBetterStringify } from "@/utils/common/helpers.ts";
import {
    $activeTranscriptOverride,
    applyTranscriptOverrides,
    createEmptyTranscriptOverride,
} from "@/store/transcribe/transcriptOverridesStore.ts";
import {
    $activeStoryUuid,
    $stories,
    applyStoryData,
    getActiveStory,
    overrideStoryChapterGist,
} from "@/store/transcribe/storiesStore.ts";
import { clearActiveWordSelection, clearAllWordsSelection } from "@/store/transcribe/appState.ts";
import { buildTranscript, type Chapter, type ConvertedTranscript } from "@/utils/transcribe/converters.ts";
import { StoryTitle } from "@/components/transcribe/story/StoryTitle.tsx";
import { PDFMode } from "@/components/transcribe/common/PDFMode.tsx";
import { LoadSpinner } from "@/components/transcribe/helpers/LoadSpinner.tsx";

export type StoryEditorProps = {
    uuid: string|undefined;
    storyuuid: string|undefined;
}

export const StoryEditor = memo((props: StoryEditorProps) => {
    const [transcript, setTranscript] = useState<ConvertedTranscript | undefined>(undefined);
    const [storyData, setStoryData] = useState<StoryData>();
    const uuid = props?.uuid || "";
    const storyuuid = props?.storyuuid || "";

    useEffect(() => {
        const run = async () => {
            try {
                console.log("retrieving data... " + uuid);
                if (uuid) {
                    const transcriptUrl = `/api/transcribe/transcript?` + new URLSearchParams({transcript_id: uuid}).toString();
                    const transcriptOverrideUrl = `/api/transcribe/transcript_override?` + new URLSearchParams({transcript_id: uuid}).toString();
                    const storyUrl = `/api/transcribe/stories?` + new URLSearchParams({uuid: storyuuid}).toString();
                    const data = await Promise.all([
                        await fetch(transcriptUrl),
                        await fetch(transcriptOverrideUrl),
                        await fetch(storyUrl),
                    ]);

                    const transcriptResponse = await data[0].json() as TranscriptServerResponse;
                    const convertedData = buildTranscript(transcriptResponse.transcript, transcriptResponse.sentences, transcriptResponse.paragraphs);

                    setDataToStore(convertedData);
                    setTranscript(convertedData);

                    const transcriptOverrides = await data[1].json();
                    if(transcriptOverrides?.length > 0) {
                        const data = JSONBetterParser(transcriptOverrides[0].data);
                        applyTranscriptOverrides(data);
                    } else {
                        $activeTranscriptOverride.set(createEmptyTranscriptOverride(uuid));
                    }

                    const storyResponse = await data[2].json();
                    let storyData: StoryData|undefined = undefined;
                    if(storyResponse?.length > 0) {
                        storyData = JSONBetterParser(storyResponse[0].data);
                    }
                    if(storyData) {
                        applyStoryData(uuid, storyuuid, storyData);
                        setStoryData(storyData);
                    }
                }
            } catch (ex) {
                console.error("error retrieving transcript: " + ex);
            }
        };
        run();

        clearActiveWordSelection();
        clearAllWordsSelection();
        $activeStoryUuid.set(storyuuid);

        const changesListenerSub = $stories.listen((newVal) => {
            const data = newVal.get(storyuuid);
            console.log("recorded a new change in words selection: " + JSONBetterStringify(data));

            fetch("/api/stories", {
               method: "PATCH",
               body: JSONBetterStringify({
                   uuid: storyuuid,
                   storyJson: data
               })
            })
            .then(res => console.log("patch story, status: " + res.status));
        });
        return () => {
            changesListenerSub();
        }
    }, []);

    const onChapterEdit = (chapter: Chapter) => {
        const activeStory = getActiveStory();
        const storyChapters = activeStory?.chaptersOverrides;
        let gist: string | undefined = chapter.getGist();
        if(storyChapters)
            gist = storyChapters?.get(chapter.index)?.gist;
        const newGist = prompt("Override story chapter gist:", gist || "") || "";
        if(activeStory) {
            overrideStoryChapterGist(chapter.index, newGist);
        }
    }

    return (
        <div>
            {
                transcript ?
                    <div className="flex flex-col">
                        <button className="btn btn-green w-40"
                                onClick={() => window.location.href = ("/transcribe/stories")}>
                            Back
                        </button>
                        {storyData && <StoryTitle value={storyData.title}/>}
                        <PDFMode
                            availableTextModes={[TextSelectionType.ANECDOTE, TextSelectionType.HEADLINE, TextSelectionType.KEY_POINT]}
                            availableTextOperations={[TextSelectionOperation.ADD, TextSelectionOperation.REMOVE]}
                            defaultTextMode={TextSelectionType.ANECDOTE}
                            defaultTextOperation={TextSelectionOperation.ADD}
                            showTextSelectionOperations={true}
                            showStats={true}
                            onChapterEdit={onChapterEdit}
                        />
                    </div>
                    :
                    <div className="mx-auto">
                        <LoadSpinner/>
                    </div>
            }
        </div>
    );
})