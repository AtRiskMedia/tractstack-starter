import type { APIRoute } from "astro";
import { withTenantContext } from "@/utils/api/middleware";
import { verifyActivationToken } from "@/utils/tenant/verifyToken";
import type { APIContext } from "@/types";

export const GET: APIRoute = withTenantContext(async (context: APIContext) => {
  try {
    const url = new URL(context.request.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Activation token is required",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const verification = await verifyActivationToken(token);

    if (!verification.valid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: verification.message || "Invalid activation token",
          expired: verification.expired || false,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        tenant: {
          id: verification.tenantId,
          email: verification.email,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error verifying token:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "An error occurred verifying the token",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
