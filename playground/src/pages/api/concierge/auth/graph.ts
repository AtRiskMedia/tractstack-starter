import { getSetupChecks } from "../../../../utils/setupChecks";
import { proxyRequestWithRefresh } from "../../../../api/authService";
import type { APIRoute } from "astro";

const BACKEND_URL = import.meta.env.PRIVATE_CONCIERGE_BASE_URL;

export const GET: APIRoute = async (context) => {
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
  const token = request.headers.get("Authorization");
  try {
    const { response, newAccessToken } = await proxyRequestWithRefresh(
      `${BACKEND_URL}/users/graph`,
      {
        headers: {
          Authorization: token || "",
        },
      },
      context
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.refreshToken) {
      context.cookies.set("refreshToken", data.refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24 * 14,
      });
      delete data.refreshToken;
    }

    return new Response(
      JSON.stringify({
        data,
        newAccessToken,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in graph route:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to get graph",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
};
