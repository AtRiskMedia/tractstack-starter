import {useRef} from "react";
import { $aaiClient } from "@/store/transcribe/appState.ts";
import { transcribeParams } from "@/constants.ts";

export const IngestVideoPage = () => {
    const titleRef = useRef<HTMLInputElement>(null);
    const mp4UrlRef = useRef<HTMLInputElement>(null);

    const submitTranscript = () => {
      const submit = async () => {
        if (titleRef.current && mp4UrlRef.current && client) {
          if (titleRef.current.value.length > 0 && mp4UrlRef.current.value.length > 0) {
            const res = await client.transcripts.submit({
              ...transcribeParams,
              audio: mp4UrlRef.current.value,
            });
            if (res.status === "error") {
              alert("Error processing your video: " + res.error);
            } else {
              window.location.href = "/";
            }
          }
        } else {
          alert("Either title or mp4 url are empty!");
        }
      };

      const client = $aaiClient.get();
      if (client) {
        submit();
      } else {
        console.warn("Cannot submit transcript because client is undefined");
        return;
      }
    }

    return (
        <div className="flex flex-col bg-amber-500 w-1/3 px-4 pt-2 pb-6 mt-6 mx-auto">
            <button className="btn btn-green w-32"
                    onClick={() => window.location.href = '/'}>
                Back
            </button>
            <h2 className="mx-auto font-bold text-2xl">Submit your file</h2>

            <div className="flex flex-col gap-3 m-auto">
                <label htmlFor="transcribe-title">Enter Title:</label>
                <input ref={titleRef} id="transcribe-title" className="w-96"/>
                <label htmlFor="transcribe-url">Enter MP4 URL:</label>
                <input ref={mp4UrlRef} id="transcribe-url" className="w-96"/>
                <button className="btn btn-green drop-shadow-2xl border-2 border-black"
                        onClick={submitTranscript}>
                    Submit
                </button>
            </div>
        </div>
    );
}