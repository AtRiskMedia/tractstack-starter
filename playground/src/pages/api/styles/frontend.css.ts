import type { APIRoute, APIContext } from "astro";
import { withTenantContext } from "@/utils/api/middleware";
import { cssStore } from "@/store/css";

export const GET: APIRoute = withTenantContext(async (context: APIContext) => {
  const tenantId = context.locals.tenant?.id || "default";
  const isMultiTenant =
    import.meta.env.PUBLIC_ENABLE_MULTI_TENANT === "true" && tenantId !== `default`;
  if (isMultiTenant) {
    return new Response("CSS generation disabled in multi-tenant mode", { status: 403 });
  }

  const store = cssStore.get();
  const url = new URL(context.request.url);
  const requestedVersion = url.searchParams.get("v");

  const headers = new Headers({
    "Content-Type": "text/css",
    "Cache-Control": "public, max-age=31536000",
  });

  if (store.version && requestedVersion === store.version && store.content) {
    if (store.version) {
      headers.set("ETag", `"${store.version}"`);
    }
    return new Response(store.content, { status: 200, headers });
  }

  return new Response("Not Found", { status: 404 });
});
