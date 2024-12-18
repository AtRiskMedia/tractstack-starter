import {memo, useEffect, useState} from "react";
import type {TranscriptList} from "assemblyai";
import { getProcessState, type TranscriptionEntry } from "@/types.ts";
import { TranscribeEntry } from "@/components/transcribe/dashboard/TranscribeEntry.tsx";

export const TranscriptsBoard = memo(() => {
    const [transcripts, setTranscripts] = useState<TranscriptionEntry[]>([]);

    useEffect(() => {
        const getEntries = async () => {
            try {
                console.log("fetch dashboard");
                const req = await fetch("/api/transcribe/dashboard");
                const transcripts = await req.json() as TranscriptList;

                const returnTranscripts: TranscriptionEntry[] = [];
                //console.log(transcripts);
                for (let i = 0; i < transcripts.transcripts.length; i++) {
                    const detail = transcripts.transcripts[i];
                    returnTranscripts.push({
                        uuid: detail.id,
                        title: detail.id,
                        state: getProcessState(detail.status),
                    });
                }
                setTranscripts(returnTranscripts);
            } catch (error) {
                console.error("getEntries error: " + error);
            }
        }
        getEntries().catch();
    }, []);

    const onCreateStory = async (transcriptUuid: string) => {
        const res = await fetch("/api/transcribe/stories", {
            method: "POST",
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({transcript_id: transcriptUuid})
        });
        if(res.status === 200) {
            const data = await res.json();
            console.log("Created new story: " + JSON.stringify(data));
            window.location.href = `/stories/${transcriptUuid}/${data.uuid}`;
        }
    }

    const onEditTranscript = async (transcriptUuid: string) => {
        window.location.href = `/transcribes/${transcriptUuid}`;
    }

    return (
        <main className="flex flex-col w-dvw h-dvh bg-accent-400">
            <h1 className="mx-auto text-4xl py-4">Transcripts</h1>
            <div className="flex flex-col w-full max-w-screen-md mx-auto gap-3">
                <button className="btn btn-green w-32"
                        onClick={() => window.location.href = '/transcribe'}>
                    Back
                </button>
                {
                    transcripts.map(entry => (
                        <TranscribeEntry onCreateStory={onCreateStory}
                                         onEditTranscript={onEditTranscript}
                                         uuid={entry.uuid}
                                         title={entry.title}
                                         state={entry.state}/>
                    ))
                }
            </div>
        </main>
    );
});