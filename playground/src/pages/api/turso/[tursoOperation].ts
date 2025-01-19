// [tursoOperation].ts
import type { APIRoute } from "astro";
import { dashboardAnalytics } from "@/utils/db/api/dashboardAnalytics.ts";
import { streamEvents } from "@/utils/db/api/stream.ts";
import { syncVisit } from "@/utils/db/api/syncVisit.ts";
import { unlockProfile } from "@/utils/db/api/unlock.ts";
import { createProfile } from "@/utils/db/api/create.ts";
import { updateProfile } from "@/utils/db/api/update.ts";
import { executeQueries } from "@/utils/db/api/executeQueries.ts";
import { getPaneDesigns } from "@/utils/db/api/paneDesigns.ts";
import { getAnalytics } from "@/utils/db/api/getAnalytics.ts";
import { getAllBeliefNodes } from "@/utils/db/api/getAllBeliefNodes.ts";
import { getUniqueTailwindClasses } from "@/utils/db/api/uniqueTailwindClasses.ts";
import { initializeContent } from "@/utils/db/utils.ts";

const PUBLIC_CONCIERGE_AUTH_SECRET = import.meta.env.PUBLIC_CONCIERGE_AUTH_SECRET;

// Operations that don't require a request body
const NO_BODY_OPERATIONS = ["initializeContent", "getAllBeliefNodes", "getPaneDesigns"] as const;

export const POST: APIRoute = async ({ request, params }) => {
  try {
    const { tursoOperation } = params;

    const body = NO_BODY_OPERATIONS.includes(tursoOperation as (typeof NO_BODY_OPERATIONS)[number])
      ? undefined
      : await request.json();

    let result;
    switch (tursoOperation) {
      case "stream":
        result = await streamEvents(body);
        break;
      case "syncVisit":
        result = await syncVisit(body);
        break;
      case "executeQueries":
        result = await executeQueries(body);
        break;
      case "analytics":
        result = await getAnalytics(body.id, body.type, body.duration);
        break;
      case "dashboardAnalytics":
        result = await dashboardAnalytics(body);
        break;
      case "uniqueTailwindClasses":
        result = await getUniqueTailwindClasses(body);
        break;
      case "getAllBeliefNodes":
        result = await getAllBeliefNodes();
        break;
      case "paneDesigns":
        result = await getPaneDesigns();
        break;
      case "unlock":
        result = await unlockProfile(body, PUBLIC_CONCIERGE_AUTH_SECRET);
        break;
      case "create":
        result = await createProfile(body, PUBLIC_CONCIERGE_AUTH_SECRET);
        break;
      case "update":
        result = await updateProfile(body, PUBLIC_CONCIERGE_AUTH_SECRET);
        break;
      case "initializeContent":
        await initializeContent();
        result = true;
        break;
      default:
        throw new Error(`Unknown operation: ${tursoOperation}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`Error in turso ${params.tursoOperation} route:`, error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "An error occurred",
      }),
      {
        status: error instanceof Error && error.message.includes("not found") ? 404 : 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
