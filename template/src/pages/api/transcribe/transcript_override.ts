import type { APIRoute } from "astro";
import type { ResultSet } from "@libsql/client";
import { tursoClient } from "@/utils/db/client.ts";

export const GET: APIRoute = async ({params, request}): Promise<any> => {
    const url = new URL(request.url);
    const transcriptId = url.searchParams.get("transcript_id"); // Get the transcript ID from the query parameters

    try {
        const db = await tursoClient.getClient();
        const res = await db.execute({sql: "SELECT * from transcript_overrides WHERE transcript_id = ?", args: [transcriptId]});

        console.log(JSON.stringify(res, null, 2));
        return new Response(JSON.stringify(res.rows || []), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    } catch (error: unknown) {
        console.error("Error getting transcript_override in GET /api/transcript_override :", error);

        return new Response(JSON.stringify({error: error.message}), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }
}

export const PATCH: APIRoute = async ({params, request}): Promise<any> => {
    try {
        const data = await request.json();
        const transcriptId = data.transcriptId;
        const newDataJson = JSON.stringify(data.dataJson);

        const db = await tursoClient.getClient();
        const existingOverride = await db.execute({sql: "SELECT * from transcript_overrides WHERE transcript_id = ?", args: [transcriptId]});
        let res: ResultSet;
        if(existingOverride.rows.length === 0) {
            res = await db.execute({
                sql: `INSERT INTO transcript_overrides (transcript_id, data)
                  VALUES (?, ?);`,
                args: [transcriptId, newDataJson]
            });
        } else {
            res = await db.execute({
                sql: `UPDATE transcript_overrides
                      SET data = ?
                      WHERE transcript_id = ?`,
                args: [newDataJson, transcriptId]
            });
        }
        console.log(JSON.stringify(res.rows));

        return new Response("ok", {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error: unknown) {
        console.error("Error parsing JSON in PATCH /api/transcript_override :", error);
        return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}