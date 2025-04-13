import type { APIRoute } from "astro";
import { withTenantContext } from "@/utils/api/middleware";
import { archiveTenant } from "@/utils/tenant/archiveTenant";
import { isAdmin } from "@/utils/core/auth";
import type { APIContext } from "@/types";

export const POST: APIRoute = withTenantContext(async (context: APIContext) => {
  try {
    // Check if user is admin
    if (!isAdmin(context)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Admin access required to archive tenants",
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const body = await context.request.json();
    const { tenantId } = body;

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

    // Prevent archiving the current tenant
    if (tenantId === context.locals.tenant?.id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Cannot archive the current tenant",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const result = await archiveTenant(tenantId);

    if (!result.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error || result.message || "Failed to archive tenant",
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
        message: result.message || "Tenant archived successfully",
        tenantId,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error archiving tenant:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "An error occurred archiving the tenant",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
