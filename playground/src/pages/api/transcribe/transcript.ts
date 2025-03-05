/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ParagraphsResponse, SentencesResponse, Transcript } from "assemblyai";
import type { APIRoute } from "astro";
import type { APIContext } from "@/types";
import { withTenantContext } from "@/utils/api/middleware";

export const prerender = false;

const sendRequest = async (apiKey: string, url: string): Promise<any> => {
  const response = await fetch(url, {
    headers: { Authorization: apiKey },
  });
  if (!response.ok) throw new Error(`Error: ${response.statusText}`);
  return await response.json();
};

export const GET: APIRoute = withTenantContext(async (context: APIContext): Promise<any> => {
  const url = new URL(context.request.url);
  const transcriptId = url.searchParams.get("transcript_id");
  const apiKey = import.meta.env.PRIVATE_ASSEMBLYAI_API_KEY;

  const transcriptEndPoint = `https://api.assemblyai.com/v2/transcript/${transcriptId}`;
  const transcriptSentencesEndPoint = `${transcriptEndPoint}/sentences`;
  const transcriptParagraphsEndPoint = `${transcriptEndPoint}/paragraphs`;

  try {
    const data = await Promise.all([
      sendRequest(apiKey, transcriptEndPoint),
      sendRequest(apiKey, transcriptSentencesEndPoint),
      sendRequest(apiKey, transcriptParagraphsEndPoint),
    ]);

    const transcript = data[0] as Transcript;
    const sentences = data[1] as SentencesResponse;
    const paragraphs = data[2] as ParagraphsResponse;

    const returnData = JSON.stringify({ transcript, sentences, paragraphs });
    return new Response(returnData, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("/api/transcript error: " + errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
