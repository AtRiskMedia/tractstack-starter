import { defineMiddleware } from "astro:middleware";
import fs from "node:fs/promises";
import path from "node:path";
import { isAuthenticated, isAdmin, isOpenDemoMode } from "@/utils/core/auth";
import { getConfig, validateConfig } from "@/utils/core/config";
import type { AuthStatus } from "@/types";
import { cssStore, updateCssStore } from "@/store/css";
import { resolvePaths } from "@/utils/core/pathResolver";

// Dynamic directories for serving tenant-specific files
const DYNAMIC_DIRS = ["/images/og", "/images/thumbs", "/custom"];

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
  const isMultiTenant = import.meta.env.PUBLIC_ENABLE_MULTI_TENANT === "true";
  let tenantId = "default";

  if (isMultiTenant) {
    const hostname = context.request.headers.get("host");
    if (hostname) {
      if (hostname.includes("localhost") || hostname.includes("127.0.0.1")) {
        tenantId = "localhost";
      } else {
        const parts = hostname.split(".");
        if (parts.length >= 3 && parts[1] === "sandbox" && parts[2] === "tractstack.com") {
          tenantId = parts[0];
        }
      }
    }
  }

  // **Step 2: Resolve tenant-specific paths**
  const resolved = await resolvePaths(tenantId);

  // **For multi-tenant mode: If tenant doesn't exist, return 404 immediately**
  if (isMultiTenant && (!resolved.exists || resolved.configPath === "")) {
    return new Response(null, {
      status: 404,
      statusText: "Tenant Not Found",
    });
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
        return new Response(fileContent, {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=31536000", // 1-year cache
          },
        });
      } catch (error) {
        // File not found, proceed with normal request handling
      }
    }
  }

  // Initialize CSS store
  if (import.meta.env.PUBLIC_ENABLE_MULTI_TENANT !== "true") {
    await ensureCssStoreInitialized();
  }

  // **Step 5: Authentication and authorization with tenant context**
  const auth = isAuthenticated(context);
  const isAdminUser = isAdmin(context);
  const isOpenDemo = isOpenDemoMode(context);

  context.locals.user = {
    isAuthenticated: auth,
    isAdmin: isAdminUser,
    isOpenDemo,
  } as AuthStatus;

  // **Step 6: Config validation with tenant-specific config path**
  const config = await getConfig(context.locals.tenant.paths.configPath);

  const tenantValidation = await validateConfig(config);

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
    ...(isInitialized ? ["/storykeep/init"] : []),
  ];

  const protectedRoutes = [
    "/*/edit",
    "/context/*/edit",
    "/storykeep",
    "/storykeep/*",
    "/api/fs/update",
    "/api/fs/saveImage",
    "/api/fs/saveBrandImage",
    "/api/fs/updateCss",
    "/api/fs/generateTailwindWhitelist",
    "/api/fs/generateTailwind",
    "/api/turso/initializeContent",
    "/api/concierge/status",
    "/api/concierge/publish",
    "/api/turso/paneDesigns",
    "/api/turso/execute",
    "/api/turso/uniqueTailwindClasses",
  ];

  const openProtectedRoutes = [
    "/*/edit",
    "/context/*/edit",
    "/storykeep",
    "/storykeep/create/*",
    "/api/turso/paneDesigns",
  ];

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
    return context.redirect("/");
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
