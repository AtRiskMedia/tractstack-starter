import { getSetupChecks } from "../../../../utils/setupChecks";
import { proxyRequestToConcierge } from "../../../../api/authService";
import type { APIRoute } from "astro";

const BACKEND_URL = import.meta.env.PRIVATE_CONCIERGE_BASE_URL;

export const GET: APIRoute = async (context) => {
  const { hasConcierge } = getSetupChecks();
  const duration = context.url.searchParams.get("duration");

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

  if (!duration)
    return new Response(
      JSON.stringify({
        success: false,
        error: "Incorrect params.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );

  try {
    const { response } = await proxyRequestToConcierge(
      `${BACKEND_URL}/storykeep/dashboardAnalytics?duration=${duration}`,
      {
        method: "GET",
      }
    );
    const data = await response.json();

    const processedData = {
      success: true,
      message: data.message,
      data: data.data,
    };

    return new Response(JSON.stringify(processedData), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in example GET route:", error);
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
