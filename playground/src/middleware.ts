import { defineMiddleware } from "astro:middleware";
import fs from "node:fs/promises";
import path from "node:path";
import { isAuthenticated, isAdmin, isOpenDemoMode } from "@/utils/core/auth";
import { getConfig, validateConfig } from "@/utils/core/config";
import type { AuthStatus } from "@/types";
import { loadHourlyAnalytics, refreshHourlyAnalytics } from "@/utils/events/hourlyAnalyticsLoader";
import { isAnalyticsCacheValid } from "@/store/analytics";
import { cssStore, updateCssStore } from "@/store/css";
import { updateTenantAccessTime } from "@/utils/tenant/updateAccess";
import { resolvePaths } from "@/utils/core/pathResolver";
import { type APIContext } from "@/types";
import {
  shouldUpdateTenantAccess,
  markTenantAccessUpdateComplete,
} from "@/store/tenantAccessManager";

const DYNAMIC_DIRS = ["/images", "/custom"];
const ANALYTICS_ROUTES = ["/api/turso/getLeadMetrics", "/api/turso/getStoryfragmentAnalytics"];

async function ensureCssStoreInitialized() {
  const store = cssStore.get();
  if (!store.content || !store.version) {
    try {
      await updateCssStore();
    } catch (error: unknown) {
      cssStore.set({
        content: null,
        version: null,
      });
    }
  }
}

export const onRequest = defineMiddleware(async (context, next) => {
  const isMultiTenantEnabled = import.meta.env.PUBLIC_ENABLE_MULTI_TENANT === "true";
  let tenantId = "default";

  if (isMultiTenantEnabled) {
    const hostname =
      context.request.headers.get("x-forwarded-host") || context.request.headers.get("host");

    if (hostname) {
      if (import.meta.env.DEV) {
        tenantId = "localhost";
      } else {
        const parts = hostname.split(".");
        if (
          parts.length >= 4 &&
          parts[1] === "sandbox" &&
          [`freewebpress`, `tractstack`].includes(parts[2]) &&
          parts[3] === "com"
        ) {
          tenantId = parts[0];
        }
      }
    }
  }
  const isMultiTenant =
    import.meta.env.PUBLIC_ENABLE_MULTI_TENANT === "true" && tenantId !== `default`;

  const resolved = await resolvePaths(tenantId);

  if (isMultiTenant && (!resolved.exists || resolved.configPath === "")) {
    return new Response(null, {
      status: 404,
      statusText: "Tenant Not Found",
    });
  }

  if (isMultiTenant && resolved.exists) {
    try {
      const tenantConfigPath = path.join(resolved.configPath, "tenant.json");
      const tenantConfigRaw = await fs.readFile(tenantConfigPath, "utf-8");
      const tenantConfig = JSON.parse(tenantConfigRaw);
      if (tenantConfig.status === "reserved") {
        return context.redirect(`/sandbox/claimed?tenant=${tenantId}`);
      } else if (tenantConfig.status === "archived") {
        return context.redirect(`/sandbox/archived?tenant=${tenantId}`);
      }
    } catch (error) {
      console.error(`Error reading tenant status for ${tenantId}:`, error);
    }
  }

  context.locals.tenant = {
    id: tenantId,
    paths: resolved,
  };

  if (context.request.method === "GET") {
    const url = new URL(context.request.url);
    const pathname = url.pathname;

    if (DYNAMIC_DIRS.some((dir) => pathname.startsWith(dir))) {
      try {
        const publicDir = context.locals.tenant.paths.publicPath;
        const filePath = path.join(publicDir, pathname);

        await fs.access(filePath);

        const ext = path.extname(filePath).toLowerCase();
        const contentTypeMap: Record<string, string> = {
          ".jpg": "image/jpeg",
          ".jpeg": "image/jpeg",
          ".png": "image/png",
          ".gif": "image/gif",
          ".webp": "image/webp",
          ".svg": "image/svg+xml",
          ".ico": "image/x-icon",
          ".css": "text/css",
          ".js": "text/javascript",
        };

        const contentType = contentTypeMap[ext] || "application/octet-stream";
        const fileContent = await fs.readFile(filePath);
        let cacheControl = "public, max-age=31536000";
        if (pathname.startsWith("/images/og/") || pathname.startsWith("/images/thumbs/")) {
          cacheControl = "no-cache, must-revalidate";
        }
        return new Response(fileContent, {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Cache-Control": cacheControl,
          },
        });
      } catch (error) {}
    }
  }

  if (!isMultiTenant) {
    await ensureCssStoreInitialized();
  }

  if (ANALYTICS_ROUTES.some((route) => context.url.pathname.startsWith(route))) {
    if (!isAnalyticsCacheValid(tenantId)) {
      await loadHourlyAnalytics(672, context as APIContext);
    } else {
      await refreshHourlyAnalytics(context as APIContext);
    }
  }

  const config = await getConfig(context.locals.tenant.paths.configPath, tenantId);
  const tenantValidation = await validateConfig(config);

  const auth = isAuthenticated(context);
  const isAdminUser = isAdmin(context);
  const isOpenDemo = isOpenDemoMode(context, config);

  context.locals.user = {
    isAuthenticated: auth,
    isAdmin: isAdminUser,
    isOpenDemo,
  } as AuthStatus;

  // Check if we should update tenant access time using the store manager
  if (tenantId !== "default" && shouldUpdateTenantAccess(tenantId, isAdminUser)) {
    updateTenantAccessTime(tenantId, isAdminUser)
      .then((result) => {
        markTenantAccessUpdateComplete(tenantId, result.success);
      })
      .catch((error) => {
        console.error(`Failed to update tenant access time: ${error}`);
        markTenantAccessUpdateComplete(tenantId, false);
      });
  }

  const hasPassword = isMultiTenant
    ? !!(config?.init?.ADMIN_PASSWORD && config?.init?.EDITOR_PASSWORD)
    : !!(import.meta.env.PRIVATE_ADMIN_PASSWORD && import.meta.env.PRIVATE_EDITOR_PASSWORD);

  const isInitialized =
    (config?.init as Record<string, unknown>)?.SITE_INIT === true && hasPassword;

  const url = new URL(context.request.url);
  const forceLogin = url.searchParams.get("force") === "true";

  if (!isInitialized) return next();

  const adminProtectedRoutes = [
    "/storykeep/settings",
    "/storykeep/templates",
    ...(isInitialized ? ["/storykeep/init"] : []),
    "/api/concierge/publish",
    "/api/concierge/status",
    "/api/tenant/archive",
  ];

  const protectedRoutes = [
    "/*/edit",
    "/context/*/edit",
    "/storykeep",
    "/api/aai/askLemur",
    "/api/fs/writeAppWhitelist",
    "/api/fs/deleteImage",
    "/api/fs/saveImage",
    "/api/fs/saveOgImage",
    "/api/fs/deleteOgImage",
    "/api/fs/saveBrandImage",
    "/api/fs/storykeepWhitelist",
    "/api/fs/generateTailwindWhitelist",
    "/api/fs/update",
    "/api/fs/updateCss",
    "/api/tailwind/generate",
    "/api/transcribe/dashboard",
    "/api/transcribe/stories",
    "/api/transcribe/transcript",
    "/api/transcribe/transcript_override",
    "/api/turso/executeQueries",
    "/api/turso/upsertFile",
    "/api/turso/upsertPane",
    "/api/turso/upsertStoryFragment",
    "/api/turso/upsertMenu",
    "/api/turso/upsertResource",
    "/api/turso/upsertTractStack",
    "/api/turso/upsertBelief",
    "/api/turso/upsertFileNode",
    "/api/turso/upsertPaneNode",
    "/api/turso/upsertStoryFragmentNode",
    "/api/turso/upsertMenuNode",
    "/api/turso/upsertResourceNode",
    "/api/turso/upsertTractStackNode",
    "/api/turso/upsertBeliefNode",
    "/api/turso/upsertTopic",
    "/api/turso/linkTopicToStoryFragment",
    "/api/turso/unlinkTopicFromStoryFragment",
  ];

  const openProtectedRoutes = ["/*/edit", "/context/*/edit", "/storykeep", "/api/aai/askLemur"];

  if (["/storykeep/login", "/storykeep/logout"].includes(context.url.pathname)) {
    return next();
  }

  if (!tenantValidation.isValid && !tenantValidation.hasPassword) {
    return context.redirect("/storykeep/init");
  }

  if (
    !tenantValidation.isValid &&
    tenantValidation.hasPassword &&
    !auth &&
    context.url.pathname !== "/storykeep/login"
  ) {
    return context.redirect(
      `/storykeep/login?redirect=${context.url.pathname}${forceLogin ? "&force=true" : ""}`
    );
  }

  const isProtectedRoute = protectedRoutes.some((route) =>
    route.includes("*")
      ? new RegExp("^" + route.replace("*", ".*")).test(context.url.pathname)
      : context.url.pathname === route
  );

  const isAdminRoute = adminProtectedRoutes.some((route) =>
    route.includes("*")
      ? new RegExp("^" + route.replace("*", ".*")).test(context.url.pathname)
      : context.url.pathname === route
  );

  const isOpenProtectedRoute = openProtectedRoutes.some((route) =>
    route.includes("*")
      ? new RegExp("^" + route.replace("*", ".*")).test(context.url.pathname)
      : context.url.pathname === route
  );

  if (isAdminRoute && !isAdminUser) {
    if (context.url.pathname.startsWith("/api/")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    return context.redirect(
      `/storykeep/login?redirect=${context.url.pathname}${forceLogin ? "&force=true" : ""}`
    );
  }

  if (!auth && isProtectedRoute) {
    if (isOpenDemo && isOpenProtectedRoute) {
      return next();
    }
    if (context.url.pathname.startsWith("/api/")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    return context.redirect(
      `/storykeep/login?redirect=${context.url.pathname}${forceLogin ? "&force=true" : ""}`
    );
  }

  if (auth && !forceLogin && context.url.pathname === "/storykeep/login") {
    return context.redirect("/");
  }

  return next();
});
