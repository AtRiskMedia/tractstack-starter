import { getSetupChecks } from "../../../../utils/setupChecks";
import { proxyRequestToConcierge } from "../../../../api/authService";
import type { APIRoute } from "astro";

const BACKEND_URL = import.meta.env.PRIVATE_CONCIERGE_BASE_URL;

export const POST: APIRoute = async (context) => {
  const { hasConcierge } = getSetupChecks();
  if (!hasConcierge)
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
  try {
    const body = await context.request.json();
    const { response } = await proxyRequestToConcierge(`${BACKEND_URL}/storykeep/files`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    const processedData = {
      success: true,
      message: data.message,
      receivedData: data.receivedData,
    };

    return new Response(JSON.stringify(processedData), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in example POST route:", error);
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