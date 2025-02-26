import { defineMiddleware } from "astro:middleware";
import fs from "node:fs/promises";
import path from "node:path";
import { isAuthenticated, isAdmin, isOpenDemoMode } from "@/utils/core/auth";
import { getConfig, validateConfig } from "@/utils/core/config";
import type { AuthStatus } from "@/types";
import { cssStore, updateCssStore } from "@/store/css";

// Add these directories to handle dynamically uploaded files
const DYNAMIC_DIRS = [
  '/images/og',
  '/images/thumbs',
  '/custom'
];

async function ensureCssStoreInitialized() {
  const store = cssStore.get();
  if (!store.content || !store.version) {
    try {
      await updateCssStore();
      // Double check initialization worked
      const updatedStore = cssStore.get();
      if (!updatedStore.content) {
        console.error("CSS store failed to initialize");
        // Fall back to reading directly if store update failed
        const filepath = path.join(process.cwd(), "public", "styles", "frontend.css");
        const content = await fs.readFile(filepath, "utf-8");
        const configPath = path.join(process.cwd(), "config", "init.json");
        const config = JSON.parse(await fs.readFile(configPath, "utf-8"));
        cssStore.set({
          content,
          version: config.STYLES_VER?.toString() || null,
        });
      }
    } catch (error) {
      console.error("Error initializing CSS store:", error);
    }
  }
}

export const onRequest = defineMiddleware(async (context, next) => {
  // Check if this is a request for a dynamic file first
  if (context.request.method === "GET") {
    const url = new URL(context.request.url);
    const pathname = url.pathname;
    
    // Check if this path is in one of our dynamic directories
    if (DYNAMIC_DIRS.some(dir => pathname.startsWith(dir))) {
      try {
        // Construct the file path
        const publicDir = path.join(process.cwd(), "public");
        const filePath = path.join(publicDir, pathname);
        
        // Check if the file exists
        await fs.access(filePath);
        
        // Determine content type based on file extension
        const ext = path.extname(filePath).toLowerCase();
        const contentTypeMap: Record<string, string> = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.gif': 'image/gif',
          '.webp': 'image/webp',
          '.svg': 'image/svg+xml',
          '.ico': 'image/x-icon',
          '.css': 'text/css',
          '.js': 'text/javascript',
        };
        
        const contentType = contentTypeMap[ext] || 'application/octet-stream';
        
        // Read and serve the file
        const fileContent = await fs.readFile(filePath);
        return new Response(fileContent, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=31536000' // Cache for 1 year
          }
        });
      } catch (error) {
        // If file doesn't exist or there's an error reading it, continue with normal processing
        // Don't log here as this is expected for files that don't exist
      }
    }
  }

  // Initialize CSS store if needed
  await ensureCssStoreInitialized();
  // Get auth status from cookies - this is our source of truth
  const auth = await isAuthenticated(context);
  const isAdminUser = await isAdmin(context);
  const isOpenDemo = await isOpenDemoMode(context);

  // Set auth status in context.locals
  context.locals.user = {
    isAuthenticated: auth,
    isAdmin: isAdminUser,
    isOpenDemo,
  } as AuthStatus;

  // Get config validation - note this is separate from auth
  const config = await getConfig();
  const validation = await validateConfig(config);
  const isInitialized =
    (config?.init as Record<string, unknown>)?.SITE_INIT === true &&
    typeof import.meta.env.PRIVATE_ADMIN_PASSWORD === `string` &&
    import.meta.env.PRIVATE_ADMIN_PASSWORD;

  const url = new URL(context.request.url);
  const forceLogin = url.searchParams.get("force") === "true";

  if (!isInitialized) return next();

  // Admin-only routes
  const adminProtectedRoutes = [
    "/storykeep/settings",
    ...(isInitialized ? ["/storykeep/init"] : []),
  ];

  // Editor and admin accessible routes
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

  // Routes that can be accessed in open demo mode
  const openProtectedRoutes = [
    "/*/edit",
    "/context/*/edit",
    "/storykeep",
    "/storykeep/create/*",
    "/api/turso/paneDesigns",
  ];

  // Always allow access to login/logout pages if we have password protection
  if (["/storykeep/login", "/storykeep/logout"].includes(context.url.pathname)) {
    return next();
  }

  // If config is invalid and we don't have password protection, redirect to init
  if (!validation.isValid && !validation.hasPassword) {
    return context.redirect("/storykeep/init");
  }

  // If config is invalid but we have password protection, require login first
  if (
    !validation.isValid &&
    validation.hasPassword &&
    !auth &&
    context.url.pathname !== "/storykeep/login"
  ) {
    return context.redirect(
      `/storykeep/login?redirect=${context.url.pathname}${forceLogin ? "&force=true" : ""}`
    );
  }

  const isProtectedRoute = protectedRoutes.some((route) => {
    if (route.includes("*")) {
      const regex = new RegExp("^" + route.replace("*", ".*"));
      return regex.test(context.url.pathname);
    }
    return context.url.pathname === route;
  });

  const isAdminRoute = adminProtectedRoutes.some((route) => {
    if (route.includes("*")) {
      const regex = new RegExp("^" + route.replace("*", ".*"));
      return regex.test(context.url.pathname);
    }
    return context.url.pathname === route;
  });

  const isOpenProtectedRoute = openProtectedRoutes.some((route) => {
    if (route.includes("*")) {
      const regex = new RegExp("^" + route.replace("*", ".*"));
      return regex.test(context.url.pathname);
    }
    return context.url.pathname === route;
  });

  // Check admin access
  if (isAdminRoute && !isAdminUser) {
    if (context.url.pathname.startsWith("/api/")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    return context.redirect("/");
  }

  // Handle protected routes
  if (!auth && isProtectedRoute) {
    if (isOpenDemo) {
      if (isOpenProtectedRoute) {
        return next();
      } else {
        if (context.url.pathname.startsWith("/api/")) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }
        return context.redirect("/");
      }
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

  // Redirect from login if already authenticated
  if (auth && !forceLogin && context.url.pathname === "/storykeep/login") {
    return context.redirect("/");
  }

  return next();
});
