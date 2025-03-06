import type { APIRoute } from "astro";
import type { APIContext } from "@/types";
import { withTenantContext } from "@/utils/api/middleware";
import { tursoClient } from "@/utils/db/client.ts";

export const GET: APIRoute = withTenantContext(async (context: APIContext): Promise<Response> => {
  const tenantId = context.locals.tenant?.id || "default";
  console.log(`Transcribe transcript_override GET for tenant: ${tenantId}`);

  const url = new URL(context.request.url);
  const transcriptId = url.searchParams.get("transcript_id");

  if (!transcriptId) {
    return new Response(JSON.stringify({ error: "Missing transcript_id parameter" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const db = await tursoClient.getClient(context);
    const res = await db.execute({
      sql: "SELECT * from transcript_overrides WHERE transcript_id = ?",
      args: [transcriptId],
    });

    console.log(
      `Successfully retrieved transcript overrides for tenant ${tenantId}, transcript ID: ${transcriptId}`
    );

    return new Response(JSON.stringify(res.rows || []), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error(`Transcript override GET error for tenant ${tenantId}: ${errorMessage}`);

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

export const PATCH: APIRoute = withTenantContext(async (context: APIContext): Promise<Response> => {
  const tenantId = context.locals.tenant?.id || "default";
  console.log(`Transcribe transcript_override PATCH for tenant: ${tenantId}`);

  try {
    const data = await context.request.json();
    const transcriptId = data.transcriptId;

    if (!transcriptId) {
      return new Response(JSON.stringify({ error: "Missing transcriptId in request body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const newDataJson = JSON.stringify(data.dataJson);

    const db = await tursoClient.getClient(context);
    const existingOverride = await db.execute({
      sql: "SELECT * from transcript_overrides WHERE transcript_id = ?",
      args: [transcriptId],
    });

    if (existingOverride.rows.length === 0) {
      await db.execute({
        sql: `INSERT INTO transcript_overrides (transcript_id, data) VALUES (?, ?)`,
        args: [transcriptId, newDataJson],
      });
      console.log(
        `Created new transcript override for tenant ${tenantId}, transcript ID: ${transcriptId}`
      );
    } else {
      await db.execute({
        sql: `UPDATE transcript_overrides SET data = ? WHERE transcript_id = ?`,
        args: [newDataJson, transcriptId],
      });
      console.log(
        `Updated existing transcript override for tenant ${tenantId}, transcript ID: ${transcriptId}`
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error processing request";
    console.error(`Transcript override PATCH error for tenant ${tenantId}: ${errorMessage}`);

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
});
