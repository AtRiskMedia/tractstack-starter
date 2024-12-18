import { createNewv4UUID } from "@/utils/transcribe/utils.ts";

export const TranscribesDashboard = () => {
    return (
        <div className="flex flex-col gap-y-2 w-96 m-auto pt-7">
            <a className="btn btn-blue" href={"/transcribe/ingest"}>
                Ingest New Video
            </a>
            <a className="btn btn-blue" href={"/transcribe/transcriptsboard"}>
                Browse Transcripts
            </a>
            <a className="btn btn-blue" href={"/transcribe/storiesboard"}>
                Browse Stories
            </a>
            <a className="btn btn-blue" href={`/stories/b8139aa3-283c-4719-aab0-e868e885dbbe/${createNewv4UUID()}`}>
                New Interactive Story Page
            </a>
        </div>
    );
}