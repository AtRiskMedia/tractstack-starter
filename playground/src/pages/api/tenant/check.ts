import type { APIRoute } from "astro";
import { withTenantContext } from "@/utils/api/middleware";
import { checkTenantAvailability } from "@/utils/tenant/checkTenantAvailability";
import type { APIContext } from "@/types";

export const GET: APIRoute = withTenantContext(async (context: APIContext) => {
  try {
    const url = new URL(context.request.url);
    const tenantId = url.searchParams.get("id");

    if (!tenantId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Tenant ID is required",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const result = await checkTenantAvailability(tenantId);

    return new Response(
      JSON.stringify({
        success: true,
        available: result.available,
        reason: result.reason,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error checking tenant availability:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error ? error.message : "An error occurred checking tenant availability",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
