export const TranscribesDashboard = () => {
  console.log("dashboard");
    return (
        <div className="flex flex-col gap-y-2 w-96 m-auto pt-7">
            <a className="px-4 py-2 rounded-md text-lg shadow-sm transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-myorange bg-myorange text-white hover:bg-myblue"
               href={"/transcribe/ingest"}>
                Ingest New Video
            </a>
            <a className="px-4 py-2 rounded-md text-lg shadow-sm transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-myorange bg-myorange text-white hover:bg-myblue"
               href={"/transcribe/transcriptsboard"}>
                Browse Transcripts
            </a>
            <a className="px-4 py-2 rounded-md text-lg shadow-sm transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-myorange bg-myorange text-white hover:bg-myblue"
               href={"/transcribe/storiesboard"}>
                Browse Stories
            </a>
            {/*<a className="px-4 py-2 rounded-md text-lg shadow-sm transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-myorange bg-myorange text-white hover:bg-myblue" */}
            {/*   href={`/stories/b8139aa3-283c-4719-aab0-e868e885dbbe/${createNewv4UUID()}`}>*/}
            {/*    New Interactive Story Page*/}
            {/*</a>*/}
        </div>
    );
}