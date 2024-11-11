import type { APIRoute } from "astro";
import { proxyRequestWithRefresh } from "../../../../api/authService";

const BACKEND_URL = import.meta.env.PRIVATE_CONCIERGE_BASE_URL;

export const POST: APIRoute = async (context) => {
  const { request } = context;
  const body = await request.json();
  const token = request.headers.get("Authorization");

  try {
    const { response, newAccessToken } = await proxyRequestWithRefresh(
      `${BACKEND_URL}/auth/sync`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token || "",
        },
        body: JSON.stringify(body),
      },
      context
    );

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
        ...data,
        newAccessToken: newAccessToken,
      }),
      {
        status: response.status,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in auth sync route:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to sync auth",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
