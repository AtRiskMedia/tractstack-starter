import type { APIRoute } from "astro";
import { dashboardAnalytics } from "../../../utils/db/api/dashboardAnalytics";
import { streamEvents } from "../../../utils/db/api/stream";
import { syncVisit } from "../../../utils/db/api/syncVisit";
import { unlockProfile } from "../../../utils/db/api/unlock";
import { createProfile } from "../../../utils/db/api/create";
import { updateProfile } from "../../../utils/db/api/update";

const PUBLIC_CONCIERGE_AUTH_SECRET = import.meta.env.PUBLIC_CONCIERGE_AUTH_SECRET;

export const POST: APIRoute = async ({ request, params }) => {
  try {
    const { operation } = params;
    const body = await request.json();

    let result;
    switch (operation) {
      case "stream":
        result = await streamEvents(body);
        break;
      case "dashboardAnalytics":
        result = await dashboardAnalytics(body);
        break;
      case "syncVisit":
        result = await syncVisit(body);
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
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`Error in turso ${params.operation} route:`, error);
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
