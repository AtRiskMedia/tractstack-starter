import { getSetupChecks } from "../../../../utils/setupChecks";
import { proxyRequestToConcierge } from "../../../../api/authService";
import type { APIRoute } from "astro";

const BACKEND_URL = import.meta.env.PRIVATE_CONCIERGE_BASE_URL;

export const GET: APIRoute = async (context) => {
  const { hasConcierge } = getSetupChecks();
  const slug = context.url.searchParams.get("slug") || "no-slug-provided";
  const otherParam = context.url.searchParams.get("otherParam") || "no-other-param-provided";

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
    const { response } = await proxyRequestToConcierge(
      `${BACKEND_URL}/storykeep/example?slug=${slug}&otherParam=${otherParam}`,
      {
        method: "GET",
      }
    );
    const data = await response.json();

    const processedData = {
      success: true,
      message: data.message,
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

    const { response } = await proxyRequestToConcierge(`${BACKEND_URL}/storykeep/example`, {
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
