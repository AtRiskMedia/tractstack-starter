import { getSetupChecks } from "../../../../utils/setupChecks";
import { proxyRequestWithRefresh } from "../../../../api/authService";
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
  const { request } = context;
  let body;
  try {
    body = await request.json();
    const { ...restBody } = body;
    const token = request.headers.get("Authorization");
    const { response, newAccessToken } = await proxyRequestWithRefresh(
      `${BACKEND_URL}/users/eventStream`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token || "",
        },
        body: JSON.stringify(restBody),
      },
      context
    );

    let responseData;
    try {
      responseData = await response.json();
    } catch (error) {
      responseData = { error: "Failed to parse response" };
    }

    if (responseData.refreshToken) {
      context.cookies.set("refreshToken", responseData.refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24 * 14,
      });
      delete responseData.refreshToken;
    }

    return new Response(
      JSON.stringify({
        ...responseData,
        newAccessToken: newAccessToken,
      }),
      {
        status: response.status,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in event stream route:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to push events",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
