/* eslint-disable @typescript-eslint/no-explicit-any */
import type { APIRoute } from "astro";
import { getConfig, validateConfig } from "../../../utils/core/config";

const BACKEND_URL = import.meta.env.PRIVATE_CONCIERGE_BASE_URL;
const CONCIERGE_SECRET = import.meta.env.PRIVATE_CONCIERGE_AUTH_SECRET;

export const POST: APIRoute = async ({ request, params }) => {
  const { conciergeOperation } = params;

  try {
    const config = await getConfig();
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
      case "status": {
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
      }

      case "publish": {
        const body = await request.json();
        const response = await fetch(`${BACKEND_URL}/storykeep/publish`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Concierge-Secret": CONCIERGE_SECRET,
          },
          body: JSON.stringify(body),
        });

        const data = await response.json();
        result = {
          success: true,
          message: data.message,
          receivedData: data.receivedData,
        };
        break;
      }

      //case "env": {
      //  const body = await request.json();
      //  const response = await fetch(`${BACKEND_URL}/storykeep/env`, {
      //    method: "POST",
      //    headers: {
      //      "Content-Type": "application/json",
      //      "X-Concierge-Secret": CONCIERGE_SECRET,
      //    },
      //    body: JSON.stringify(body),
      //  });

      //  const data = await response.json();
      //  result = {
      //    success: true,
      //    data: data.data,
      //  };
      //  break;
      //}

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
};

// Also support GET for status operation
export const GET: APIRoute = async ({ params }) => {
  if (params.conciergeOperation === "status") {
    return POST({
      request: new Request("http://dummy"),
      params,
      redirect: () => new Response(),
    } as any);
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
};
