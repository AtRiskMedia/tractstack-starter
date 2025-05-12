import type { APIRoute } from "astro";
import type { APIContext } from "@/types";
import { withTenantContext } from "@/utils/api/middleware";
import { AUTH_COOKIE_NAME, AUTH_COOKIE_MAX_AGE } from "@/constants";
import { getConfig } from "@/utils/core/config";

export const POST: APIRoute = withTenantContext(async (context: APIContext) => {
  try {
    const { request, cookies, locals } = context;
    const body = await request.json();
    const { password, redirect: redirectPath = "/storykeep" } = body;

    if (!password) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Password required",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Check if multi-tenant is enabled
    const tenantId = locals.tenant?.id || "default";
    const isMultiTenant =
      import.meta.env.PUBLIC_ENABLE_MULTI_TENANT === "true" && tenantId !== "default";

    // Load config with fallback if not present in locals
    const config = locals.config || (await getConfig(locals.tenant?.paths.configPath, tenantId));
    const initConfig = config?.init;

    let authSuccess = false;
    let isAdmin = false;

    if (isMultiTenant && initConfig) {
      if (password === initConfig.ADMIN_PASSWORD) {
        const tokenValue = `admin:${tenantId}`;
        cookies.set(AUTH_COOKIE_NAME, tokenValue, {
          httpOnly: true,
          secure: import.meta.env.PROD,
          sameSite: "lax",
          path: "/",
          maxAge: AUTH_COOKIE_MAX_AGE,
        });
        authSuccess = true;
        isAdmin = true;
      } else if (password === initConfig.EDITOR_PASSWORD) {
        const tokenValue = `authenticated:${tenantId}`;
        cookies.set(AUTH_COOKIE_NAME, tokenValue, {
          httpOnly: true,
          secure: import.meta.env.PROD,
          sameSite: "lax",
          path: "/",
          maxAge: AUTH_COOKIE_MAX_AGE,
        });
        authSuccess = true;
      }
    } else {
      if (password === import.meta.env.PRIVATE_ADMIN_PASSWORD) {
        cookies.set(AUTH_COOKIE_NAME, "admin", {
          httpOnly: true,
          secure: import.meta.env.PROD,
          sameSite: "lax",
          path: "/",
          maxAge: AUTH_COOKIE_MAX_AGE,
        });
        authSuccess = true;
        isAdmin = true;
      } else if (password === import.meta.env.PRIVATE_EDITOR_PASSWORD) {
        cookies.set(AUTH_COOKIE_NAME, "authenticated", {
          httpOnly: true,
          secure: import.meta.env.PROD,
          sameSite: "lax",
          path: "/",
          maxAge: AUTH_COOKIE_MAX_AGE,
        });
        authSuccess = true;
      }
    }

    if (authSuccess) {
      return new Response(
        JSON.stringify({
          success: true,
          redirect: redirectPath,
          isAdmin,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid credentials",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }
  } catch (error) {
    console.error("Login API error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Server error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
});
