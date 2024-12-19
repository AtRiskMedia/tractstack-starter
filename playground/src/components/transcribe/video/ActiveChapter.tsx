import {memo} from "react";
import {useStore} from "@nanostores/react";
import type { Transcript } from "assemblyai";
import { $chaptersStore } from "@/store/transcribe/transcribeStore.ts";
import { $videoPlayer } from "@/store/transcribe/appState.ts";
import { convertMillisecondsToSeconds } from "@/utils/transcribe/utils.ts";

export type ActiveChapterProps = {
    activeChapterIdx: number;
    transcript: Transcript;
}

export const ActiveChapter = memo((props: ActiveChapterProps) => {
    const chapters = useStore($chaptersStore);
    const getCurrentChapterName = (): string => {
        if (props.activeChapterIdx !== -1 && chapters) {
            return chapters[props.activeChapterIdx].getGist();
        }
        return "";
    }

    const hasPreviousChapters = (): boolean => props.activeChapterIdx >= 1;
    const hasNextChapters = (): boolean => props.activeChapterIdx <= props.transcript.chapters.length - 1;

    const seekNextChapter = () => {
        if (hasNextChapters()) {
            const nextChapter = props.transcript.chapters[props.activeChapterIdx + 1];
            $videoPlayer.get().setCurrentTime(convertMillisecondsToSeconds(nextChapter.start));
        }
    }
    const seekPrevChapter = () => {
        if (hasPreviousChapters()) {
            const prevChapter = props.transcript.chapters[props.activeChapterIdx - 1];
            $videoPlayer.get().setCurrentTime(convertMillisecondsToSeconds(prevChapter.start));
        }
    }

    return (
        <div className="flex mx-auto items-center gap-x-4">
            {hasPreviousChapters() &&
                <button onClick={seekPrevChapter}>
                    <span className="text-4xl">&larr;</span>
                </button>
            }
            <span className="font-bold">{getCurrentChapterName()}</span>
            {hasNextChapters() &&
                <button onClick={seekNextChapter}>
                    <span className="text-4xl">&rarr;</span>
                </button>
            }
        </div>
    );
});