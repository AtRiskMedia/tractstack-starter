import type { APIRoute } from "astro";
import { withTenantContext } from "@/utils/api/middleware";

export const GET: APIRoute = withTenantContext(async (_: any): Promise<any> => {
  const apiKey = import.meta.env.PRIVATE_ASSEMBLYAI_API_KEY;
  console.log("dashboard get");

  const transcriptsEndPoint = `https://api.assemblyai.com/v2/transcript`;
  const response = await fetch(transcriptsEndPoint, {
    headers: {
      Authorization: apiKey,
    },
  });

  try {
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }
    const json = await response.json();
    return new Response(JSON.stringify(json), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("/api/transcribe/dashboard error: " + errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
