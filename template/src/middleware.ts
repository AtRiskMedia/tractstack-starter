import { defineMiddleware } from "astro:middleware";
import { isAuthenticated, isAdmin, isOpenDemoMode } from "./utils/core/auth";
import { getConfig, validateConfig } from "./utils/core/config";
import type { AuthStatus } from "./types";

export const onRequest = defineMiddleware(async (context, next) => {
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
  const isInitialized = (config?.init as Record<string, unknown>)?.SITE_INIT === true;

  const url = new URL(context.request.url);
  const forceLogin = url.searchParams.get("force") === "true";

  // Admin-only routes
  const adminProtectedRoutes = [
    "/storykeep/settings",
    "/api/fs/update",
    "/api/concierge/status",
    "/api/concierge/publish",
    ...(isInitialized ? ["/storykeep/init"] : []),
  ];

  // Editor and admin accessible routes
  const protectedRoutes = [
    "/*/edit",
    "/context/*/edit",
    "/storykeep",
    "/storykeep/create/*",
    "/api/turso/paneDesigns",
    "/api/turso/executeQueries",
    "/api/turso/analytics",
    "/api/turso/dashboardAnalytics",
    "/api/turso/uniqueTailwindClasses",
    "/api/turso/paneDesigns",
  ];

  // Routes that can be accessed in open demo mode
  const openProtectedRoutes = [
    "/*/edit",
    "/context/*/edit",
    "/storykeep",
    "/storykeep/create/*",
    "/api/turso/analytics",
    "/api/turso/dashboardAnalytics",
    "/api/turso/paneDesigns",
  ];

  // Always allow access to login/logout pages if we have password protection
  if (
    validation.hasPassword &&
    ["/storykeep/login", "/storykeep/logout"].includes(context.url.pathname)
  ) {
    return next();
  }

  // If config is invalid and we don't have password protection, redirect to init
  if (
    !validation.isValid &&
    !validation.hasPassword &&
    !(context.url.pathname === "/storykeep/init" || context.url.pathname === "/api/fs/update")
  ) {
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
