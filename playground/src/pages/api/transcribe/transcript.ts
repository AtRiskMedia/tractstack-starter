import type { ParagraphsResponse, SentencesResponse, Transcript } from "assemblyai";
import type { APIRoute } from "astro";
import type { APIContext } from "@/types";
import { withTenantContext } from "@/utils/api/middleware";

export const prerender = false;

/**
 * Helper function to send API requests to AssemblyAI
 */
const sendRequest = async (apiKey: string, url: string): Promise<any> => {
  const response = await fetch(url, {
    headers: { Authorization: apiKey },
  });

  if (!response.ok) {
    throw new Error(`Error: ${response.statusText}`);
  }

  return await response.json();
};

export const GET: APIRoute = withTenantContext(async (context: APIContext): Promise<Response> => {
  const tenantId = context.locals.tenant?.id || "default";
  console.log(`Transcribe transcript GET for tenant: ${tenantId}`);

  const url = new URL(context.request.url);
  const transcriptId = url.searchParams.get("transcript_id");

  if (!transcriptId) {
    return new Response(JSON.stringify({ error: "Missing transcript_id parameter" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = import.meta.env.PRIVATE_ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    console.error(`Missing AssemblyAI API key for tenant ${tenantId}`);
    return new Response(JSON.stringify({ error: "AssemblyAI API key not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const transcriptEndPoint = `https://api.assemblyai.com/v2/transcript/${transcriptId}`;
  const transcriptSentencesEndPoint = `${transcriptEndPoint}/sentences`;
  const transcriptParagraphsEndPoint = `${transcriptEndPoint}/paragraphs`;

  try {
    console.log(`Fetching transcript data for tenant ${tenantId}, transcript ID: ${transcriptId}`);

    const data = await Promise.all([
      sendRequest(apiKey, transcriptEndPoint),
      sendRequest(apiKey, transcriptSentencesEndPoint),
      sendRequest(apiKey, transcriptParagraphsEndPoint),
    ]);

    const transcript = data[0] as Transcript;
    const sentences = data[1] as SentencesResponse;
    const paragraphs = data[2] as ParagraphsResponse;

    const returnData = JSON.stringify({ transcript, sentences, paragraphs });

    console.log(`Successfully retrieved transcript data for tenant ${tenantId}`);

    return new Response(returnData, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error(`Transcribe transcript error for tenant ${tenantId}: ${errorMessage}`);

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
