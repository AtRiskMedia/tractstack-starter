import type { APIRoute } from "astro";
import type { APIContext } from "@/types";
import { withTenantContext } from "@/utils/api/middleware";

export const GET: APIRoute = withTenantContext(async (context: APIContext): Promise<Response> => {
  const tenantId = context.locals.tenant?.id || "default";
  console.log(`Transcribe dashboard request for tenant: ${tenantId}`);

  const apiKey = import.meta.env.PRIVATE_ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    console.error(`Missing AssemblyAI API key for tenant ${tenantId}`);
    return new Response(JSON.stringify({ error: "AssemblyAI API key not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const transcriptsEndPoint = `https://api.assemblyai.com/v2/transcript`;

  try {
    const response = await fetch(transcriptsEndPoint, {
      headers: {
        Authorization: apiKey,
      },
    });

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
    console.error(`Transcribe dashboard error for tenant ${tenantId}: ${errorMessage}`);

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
