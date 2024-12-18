import type { ParagraphsResponse, SentencesResponse, Transcript } from "assemblyai";
import type { APIRoute } from "astro";

// do not remove, otherwise it causes a bug with empty GET params
export const prerender = false;

const sendRequest = async (apiKey: string, url: string): Promise<any> => {
  const response = await fetch(url, {
    headers: {
      Authorization: apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`Error: ${response.statusText}`);
  }
  return await response.json();
};

export const GET: APIRoute = async ({ params, request }): Promise<any> => {
  const url = new URL(request.url);
  const transcriptId = url.searchParams.get("transcript_id"); // Get the transcript ID from the query parameters
  const apiKey = import.meta.env.PRIVATE_ASSEMBLYAI_API_KEY; // Your AssemblyAI API key

  // AssemblyAI endpoint for fetching transcripts
  const transcriptEndPoint = `https://api.assemblyai.com/v2/transcript/${transcriptId}`;
  const transcriptSentencesEndPoint = `${transcriptEndPoint}/sentences`;
  const transcriptParagraphsEndPoint = `${transcriptEndPoint}/paragraphs`;

  try {
    // Fetch the transcript data
    const data = await Promise.all([
      sendRequest(apiKey, transcriptEndPoint),
      sendRequest(apiKey, transcriptSentencesEndPoint),
      sendRequest(apiKey, transcriptParagraphsEndPoint),
    ]);

    const transcript = data[0] as Transcript;
    const sentences = data[1] as SentencesResponse;
    const paragraphs = data[2] as ParagraphsResponse;

    const returnData = JSON.stringify({
      transcript: transcript,
      sentences: sentences,
      paragraphs: paragraphs,
    });

    return new Response(returnData, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error: unknown) {
    console.error("/api/transcript error: " + error);

    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
};