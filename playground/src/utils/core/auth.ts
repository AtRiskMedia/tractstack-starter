import type { APIContext } from "astro";
import type { AuthValidationResult } from "../../types";

export function isAuthenticated(context: APIContext): boolean {
  const token = context.cookies.get("auth_token")?.value;
  return token === "authenticated" || token === "admin" || token === "open_demo";
}

export function isAdmin(context: APIContext): boolean {
  const token = context.cookies.get("auth_token")?.value;
  return token === "admin";
}

export function isOpenDemoMode(context: APIContext, config?: Config | null): boolean {
  // First check if we have a cookie indicating a specific auth state
  const token = context.cookies.get("auth_token")?.value;
  if (token === "admin" || token === "authenticated") {
    // If authenticated via cookie, demo mode is off
    return false;
  }

  // Check config for OPEN_DEMO setting
  return config?.init?.OPEN_DEMO === true;
}

interface Config {
  init?: { OPEN_DEMO?: boolean };
}

export async function validateAuth(config: Config | null): Promise<AuthValidationResult> {
  if (!config) {
    return { isValid: false, isOpenDemo: false, errors: ["No configuration available"] };
  }

  const initConfig = config.init;
  if (!initConfig) {
    return { isValid: false, isOpenDemo: false, errors: ["Missing init configuration"] };
  }

  const isOpenDemo = !!initConfig.OPEN_DEMO;
  return { isValid: true, isOpenDemo };
}

export function setAuthenticated(context: APIContext, value: boolean, isAdmin: boolean = false) {
  const isProd = import.meta.env.PROD;

  if (value) {
    // Only set cookies for actual authentication (admin or editor)
    // No cookie needed for open demo mode since it's config-based
    let tokenValue = isAdmin ? "admin" : "authenticated";

    // Simple cookie options without domain specification
    const cookieOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax" as const,
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    };

    context.cookies.set("auth_token", tokenValue, cookieOptions);
  } else {
    context.cookies.delete("auth_token", { path: "/" });
  }
}
