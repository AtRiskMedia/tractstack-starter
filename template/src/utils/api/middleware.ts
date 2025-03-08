import type { APIContext } from "@/types";
import type { APIRoute, APIContext as AstroAPIContext } from "astro";

export const withTenantContext = (
  handler: (context: APIContext) => Promise<Response>
): APIRoute => {
  const middleware: APIRoute = async (context: AstroAPIContext) => {
    const customContext = context as APIContext;
    return handler(customContext);
  };
  return middleware;
};
