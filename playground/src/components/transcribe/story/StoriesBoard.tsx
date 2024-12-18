import {memo, useEffect, useState} from "react";
import type { StoryData } from "@/types.ts";
import { deleteStory } from "@/store/transcribe/storiesStore.ts";
import { StoryEntry } from "@/components/transcribe/story/StoryEntry.tsx";

type StoryResponse = {
    id: number,
    transcript_id: string,
    uuid: string,
    data: string,
}

export const StoriesBoard = memo(() => {
    const [stories, setStories] = useState<StoryData[]>([]);

    useEffect(() => {
        const getEntries = async () => {
            try {
                const req = await fetch("/api/transcribe/stories");
                const storiesJson = await req.json() as StoryResponse[];
                setStories(storiesJson.map(x => JSON.parse(x.data)));

            } catch (error) {
                console.error("getEntries error: " + error);
            }
        }
        getEntries().catch();
    }, []);

    const doDeleteStory = async (uuid: string) => {
        try {
            const res = await fetch("/api/transcribe/stories", {
                method: "DELETE",
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({uuid})
            });
            console.log("delete response: " + res.status);
            setStories(stories.filter(x => x.uuid !== uuid));
            deleteStory(uuid);
        } catch (error) {
            console.error("delete story error: " + error);
        }
    }

    return (
        <main className="flex flex-col w-dvw h-dvh bg-accent-400">
            <h1 className="mx-auto text-4xl py-4">Stories</h1>
            <div className="flex flex-col w-full max-w-screen-md mx-auto gap-3">
                <button className="px-4 py-2 rounded-md text-lg shadow-sm transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-myorange bg-myorange text-white hover:bg-myblue"
                        onClick={() => window.location.href = '/transcribe'}>
                    Back
                </button>
                {
                    stories.map(entry => (
                        <StoryEntry transcriptId={entry.transcriptId}
                                    uuid={entry.uuid}
                                    title={entry.title}
                                    status={entry.status}
                                    onDelete={doDeleteStory}
                        />
                    ))
                }
            </div>
        </main>
    );
})