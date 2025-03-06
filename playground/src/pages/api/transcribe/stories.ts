import type { APIRoute } from "astro";
import type { APIContext } from "@/types";
import { withTenantContext } from "@/utils/api/middleware";
import { createEmptyStory, createNewv4UUID } from "@/utils/transcribe/utils.ts";
import { tursoClient } from "@/utils/db/client.ts";
import type { ResultSet } from "@libsql/client";

export const GET: APIRoute = withTenantContext(async (context: APIContext): Promise<Response> => {
  const tenantId = context.locals.tenant?.id || "default";
  console.log(`Transcribe stories GET for tenant: ${tenantId}`);

  const url = new URL(context.request.url);
  const storyId = url.searchParams.get("uuid") || "";

  try {
    const db = await tursoClient.getClient(context); // Pass context for tenant-specific DB
    let res: ResultSet;

    if (storyId.length > 0) {
      res = await db.execute({
        sql: "SELECT * from stories WHERE uuid = ?",
        args: [storyId],
      });
    } else {
      res = await db.execute("SELECT * from stories");
    }

    console.log(`Successfully retrieved stories for tenant: ${tenantId}`);
    return new Response(JSON.stringify(res.rows || []), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error(`Transcribe stories GET error for tenant ${tenantId}: ${errorMessage}`);

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

export const POST: APIRoute = withTenantContext(async (context: APIContext): Promise<Response> => {
  const tenantId = context.locals.tenant?.id || "default";
  console.log(`Transcribe stories POST for tenant: ${tenantId}`);

  try {
    const data = await context.request.json();
    const transcriptId = data.transcript_id;

    const db = await tursoClient.getClient(context);
    const uuid = createNewv4UUID();
    const emptyStoryDataJson = JSON.stringify(createEmptyStory(transcriptId, uuid));

    await db.execute({
      sql: `INSERT INTO stories (transcript_id, uuid, data) VALUES (?, ?, ?)`,
      args: [transcriptId, uuid, emptyStoryDataJson],
    });

    console.log(
      `Successfully created story for tenant ${tenantId}, transcript ID: ${transcriptId}`
    );

    return new Response(emptyStoryDataJson, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error processing request";
    console.error(`Transcribe stories POST error for tenant ${tenantId}: ${errorMessage}`);

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
});

export const DELETE: APIRoute = withTenantContext(
  async (context: APIContext): Promise<Response> => {
    const tenantId = context.locals.tenant?.id || "default";
    console.log(`Transcribe stories DELETE for tenant: ${tenantId}`);

    try {
      const data = await context.request.json();
      const uuid = data.uuid;

      const db = await tursoClient.getClient(context);
      await db.execute({
        sql: `DELETE FROM stories WHERE uuid = ?`,
        args: [uuid],
      });

      console.log(`Successfully deleted story for tenant ${tenantId}, UUID: ${uuid}`);

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error processing request";
      console.error(`Transcribe stories DELETE error for tenant ${tenantId}: ${errorMessage}`);

      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  }
);

export const PATCH: APIRoute = withTenantContext(async (context: APIContext): Promise<Response> => {
  const tenantId = context.locals.tenant?.id || "default";
  console.log(`Transcribe stories PATCH for tenant: ${tenantId}`);

  try {
    const data = await context.request.json();
    const uuid = data.uuid;
    const newStoryJson = JSON.stringify(data.storyJson);

    const db = await tursoClient.getClient(context);
    await db.execute({
      sql: `UPDATE stories SET data = ? WHERE uuid = ?`,
      args: [newStoryJson, uuid],
    });

    console.log(`Successfully updated story for tenant ${tenantId}, UUID: ${uuid}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error processing request";
    console.error(`Transcribe stories PATCH error for tenant ${tenantId}: ${errorMessage}`);

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
});
