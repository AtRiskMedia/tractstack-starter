/* eslint-disable @typescript-eslint/no-explicit-any */
import type { APIRoute } from "astro";
import { withTenantContext } from "@/utils/api/middleware";
import { getConfig, validateConfig } from "@/utils/core/config";
import type { APIContext, Config } from "@/types";

const BACKEND_URL = import.meta.env.PRIVATE_CONCIERGE_BASE_URL;
const CONCIERGE_SECRET = import.meta.env.PRIVATE_CONCIERGE_AUTH_SECRET;

export const POST: APIRoute = withTenantContext(async (context: APIContext) => {
  const { conciergeOperation } = context.params;

  try {
    const config = (context.locals.config ||
      (await getConfig(context.locals.tenant?.paths.configPath))) as Config | null;
    const validation = await validateConfig(config);

    if (!validation.capabilities.hasConcierge) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No concierge found.",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    let result;
    switch (conciergeOperation) {
      case "status":
        const response = await fetch(`${BACKEND_URL}/storykeep/status`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-Concierge-Secret": CONCIERGE_SECRET,
          },
        });
        const data = await response.json();
        result = {
          success: true,
          message: data.message,
          data: data.data,
        };
        break;
      case "publish":
        const body = await context.request.json();
        const publishResponse = await fetch(`${BACKEND_URL}/storykeep/publish`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Concierge-Secret": CONCIERGE_SECRET,
          },
          body: JSON.stringify(body),
        });
        const publishData = await publishResponse.json();
        result = {
          success: true,
          message: publishData.message,
          receivedData: publishData.receivedData,
        };
        break;
      default:
        throw new Error(`Unknown operation: ${conciergeOperation}`);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`Error in concierge ${conciergeOperation} route:`, error);
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
});

export const GET: APIRoute = withTenantContext(async (context: APIContext) => {
  if (context.params.conciergeOperation === "status") {
    return POST(context as any);
  }

  return new Response(
    JSON.stringify({
      success: false,
      error: "Method not allowed",
    }),
    {
      status: 405,
      headers: { "Content-Type": "application/json" },
    }
  );
});
