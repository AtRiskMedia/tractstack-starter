import type { APIContext } from "@/types";
import type { APIRoute, APIContext as AstroAPIContext } from "astro";

export const withTenantContext = (
  handler: (context: APIContext) => Promise<Response>
): APIRoute => {
  const middleware: APIRoute = async (context: AstroAPIContext) => {
    const customContext = context as APIContext;
    const tenantId = customContext.locals.tenant?.id || "default";
    const isMultiTenant = import.meta.env.ENABLE_MULTI_TENANT === "true";
    console.log(
      `API: Operation=${customContext.params.someOperation || "unknown"}, Tenant=${tenantId}, Multi-tenant=${isMultiTenant}`
    );

    return handler(customContext);
  };
  return middleware;
};
