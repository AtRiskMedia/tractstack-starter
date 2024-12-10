import type { APIRoute } from "astro";
import { tursoClient } from "../../../utils/db/client";
import { processEventStream } from "../../../utils/visit/processEventStream";
import { getCurrentVisit } from "../../../utils/visit/getCurrentVisit";
import type { EventPayload } from "../../../types";

export const POST: APIRoute = async ({ request, params }) => {
  const { operation } = params;

  try {
    const client = await tursoClient.getClient();
    if (!client) {
      return new Response(JSON.stringify({ success: false, error: "No database connection" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    let result;
    switch (operation) {
      case "stream": {
        const payload = await request.json();

        // Validate payload structure
        if (!payload || !payload.events || !Array.isArray(payload.events)) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Invalid event payload structure",
            }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        // Get or create visit context
        const visitContext = await getCurrentVisit(client);

        const eventPayload: EventPayload = {
          events: payload.events,
          referrer: payload.referrer,
          visit: visitContext,
        };

        await processEventStream(client, eventPayload);

        result = {
          success: true,
          message: "Events processed successfully",
        };
        break;
      }

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`Error in turso ${operation} route:`, error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "An error occurred",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
