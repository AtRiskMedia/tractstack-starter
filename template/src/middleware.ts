import { defineMiddleware } from "astro:middleware";
import fs from "node:fs/promises";
import path from "node:path";
import { isAuthenticated, isAdmin, isOpenDemoMode } from "@/utils/core/auth";
import { getConfig, validateConfig } from "@/utils/core/config";
import type { AuthStatus } from "@/types";
import { loadHourlyAnalytics, refreshHourlyAnalytics } from "@/utils/events/hourlyAnalyticsLoader"; // Added import
import { isAnalyticsCacheValid } from "@/store/analytics";
import { cssStore, updateCssStore } from "@/store/css";
import { updateTenantAccessTime } from "@/utils/tenant/updateAccess";
import { resolvePaths } from "@/utils/core/pathResolver";
import { type APIContext } from "@/types";

// Dynamic directories for serving tenant-specific files
const DYNAMIC_DIRS = ["/images", "/custom"];

// Ensure CSS store is initialized
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
  // **Step 1: Determine tenant ID based on environment and hostname**
  const isMultiTenantEnabled = import.meta.env.PUBLIC_ENABLE_MULTI_TENANT === "true";
  let tenantId = "default";

  if (isMultiTenantEnabled) {
    // Prefer X-Forwarded-Host, fall back to Host
    const hostname =
      context.request.headers.get("x-forwarded-host") || context.request.headers.get("host");

    if (hostname) {
      if (import.meta.env.DEV) {
        tenantId = "localhost";
      } else {
        const parts = hostname.split(".");

        // Handle domains like x.sandbox.freewebpress.com
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

  // **Step 2: Resolve tenant-specific paths**
  const resolved = await resolvePaths(tenantId);

  // **For multi-tenant mode: If tenant doesn't exist, return 404 immediately**
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
      // Redirect based on tenant status
      if (tenantConfig.status === "reserved") {
        // Tenant is reserved but not claimed yet
        return context.redirect(`/sandbox/claimed?tenant=${tenantId}`);
      } else if (tenantConfig.status === "archived") {
        // Tenant has been archived
        return context.redirect(`/sandbox/archived?tenant=${tenantId}`);
      }
      // For "claimed" or "activated" statuses, continue normal flow
    } catch (error) {
      console.error(`Error reading tenant status for ${tenantId}:`, error);
      // If we can't read the status, proceed with normal tenant existence check
    }
  }

  // **Step 3: Set tenant info in local context**
  context.locals.tenant = {
    id: tenantId,
    paths: resolved,
  };

  // **Step 4: Handle dynamic file serving with tenant-specific public path**
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
      } catch (error) {
        // File not found, proceed with normal request handling
      }
    }
  }

  // Initialize CSS store
  if (!isMultiTenant) {
    await ensureCssStoreInitialized();
  }

  if (!isAnalyticsCacheValid()) {
    await loadHourlyAnalytics(672, context as APIContext);
  } else {
    await refreshHourlyAnalytics(context as APIContext);
  }

  // **Step 5: Authentication and authorization with tenant context**
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

  if (tenantId !== "default") {
    updateTenantAccessTime(tenantId, isAdminUser).catch((error) => {
      console.warn(`Failed to update tenant access time for ${tenantId}:`, error);
    });
  }

  // **Step 6: Config validation with tenant-specific config path**
  const hasPassword = isMultiTenant
    ? !!(config?.init?.ADMIN_PASSWORD && config?.init?.EDITOR_PASSWORD)
    : !!(import.meta.env.PRIVATE_ADMIN_PASSWORD && import.meta.env.PRIVATE_EDITOR_PASSWORD);

  const isInitialized =
    (config?.init as Record<string, unknown>)?.SITE_INIT === true && hasPassword;

  const url = new URL(context.request.url);
  const forceLogin = url.searchParams.get("force") === "true";

  if (!isInitialized) return next();

  // Define protected routes (unchanged)
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

  // Allow login/logout routes
  if (["/storykeep/login", "/storykeep/logout"].includes(context.url.pathname)) {
    return next();
  }

  // Handle uninitialized or invalid config
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

  // **Step 7: Route protection logic** (unchanged)
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
