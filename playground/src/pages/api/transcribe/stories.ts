/* eslint-disable @typescript-eslint/no-explicit-any */
import type { APIRoute } from "astro";
import { createEmptyStory, createNewv4UUID } from "@/utils/transcribe/utils.ts";
import { tursoClient } from "@/utils/db/client.ts";
import type { ResultSet } from "@libsql/client";

export const GET: APIRoute = async ({ /* params, */ request }): Promise<any> => {
  const url = new URL(request.url);
  const storyId = url.searchParams.get("uuid") || ""; // Get the transcript ID from the query parameters

  try {
    const db = await tursoClient.getClient();
    let res: ResultSet;
    if (storyId?.length > 0)
      res = await db.execute({ sql: "SELECT * from stories WHERE uuid = ?", args: [storyId] });
    else res = await db.execute("SELECT * from stories");

    console.log(JSON.stringify(res, null, 2));
    return new Response(JSON.stringify(res.rows || []), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("/api/transcribe/transcript error: " + errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
};

export const POST: APIRoute = async ({ /* params, */ request }): Promise<any> => {
  try {
    const data = await request.json();
    const transcriptId = data.transcript_id;

    const db = await tursoClient.getClient();
    const uuid = createNewv4UUID();
    const emptyStoryDataJson = JSON.stringify(createEmptyStory(transcriptId, uuid));
    const res = await db.execute({
      sql: `INSERT INTO stories (transcript_id, uuid, data)
                  VALUES (?, ?, ?);`,
      args: [transcriptId, uuid, emptyStoryDataJson],
    });

    console.log("Add story, res: " + JSON.stringify(res));
    return new Response(emptyStoryDataJson, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error posting story in POST /api/transcribe/stories :", error);
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const DELETE: APIRoute = async ({ /* params, */ request }): Promise<any> => {
  try {
    const data = await request.json();
    const uuid = data.uuid;

    const db = await tursoClient.getClient();
    await db.execute({
      sql: `DELETE FROM  stories WHERE uuid = ?`,
      args: [uuid],
    });
    return new Response("ok", {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error deleting story in DELETE /api/transcribe/stories :", error);
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const PATCH: APIRoute = async ({ /* params, */ request }): Promise<any> => {
  try {
    const data = await request.json();
    const uuid = data.uuid;
    const newStoryJson = JSON.stringify(data.storyJson);

    console.log(newStoryJson);
    const db = await tursoClient.getClient();
    const res = await db.execute({
      sql: `UPDATE stories SET data = ? WHERE uuid = ?`,
      args: [newStoryJson, uuid],
    });

    console.log(JSON.stringify(res.rows));
    return new Response("ok", {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error parsing JSON in PATCH /api/transcribe/stories :", error);
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
};
