import type { APIRoute } from "astro";
import { proxyRequestToConcierge } from "../../../../api/authService";

const BACKEND_URL = import.meta.env.PRIVATE_CONCIERGE_BASE_URL;

export const GET: APIRoute = async (context) => {
  const id = context.url.searchParams.get("id");
  const type = context.url.searchParams.get("type");
  const duration = context.url.searchParams.get("duration");

  if (!id || !type || !duration)
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
      `${BACKEND_URL}/storykeep/analytics?id=${id}&type=${type}&duration=${duration}`,
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
