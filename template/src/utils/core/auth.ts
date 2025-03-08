import type { APIContext } from "astro";
import type { AuthValidationResult } from "../../types";

export function isAuthenticated(context: APIContext): boolean {
  const token = context.cookies.get("auth_token")?.value;
  console.log("[Auth Debug] isAuthenticated check, token:", token);
  return token === "authenticated" || token === "admin" || token === "open_demo";
}

export function isAdmin(context: APIContext): boolean {
  const token = context.cookies.get("auth_token")?.value;
  console.log("[Auth Debug] isAdmin check, token:", token);
  return token === "admin";
}

export function isOpenDemoMode(context: APIContext): boolean {
  const token = context.cookies.get("auth_token")?.value;
  console.log("[Auth Debug] isOpenDemoMode check, token:", token);
  return token === "open_demo";
}

interface Config {
  init?: { OPEN_DEMO?: boolean };
}

export async function validateAuth(config: Config | null): Promise<AuthValidationResult> {
  if (!config) {
    console.log("[Auth Debug] validateAuth - No configuration available");
    return { isValid: false, isOpenDemo: false, errors: ["No configuration available"] };
  }

  const initConfig = config.init;
  if (!initConfig) {
    console.log("[Auth Debug] validateAuth - Missing init configuration");
    return { isValid: false, isOpenDemo: false, errors: ["Missing init configuration"] };
  }

  const isOpenDemo = !!initConfig.OPEN_DEMO;
  console.log("[Auth Debug] validateAuth - Valid config, isOpenDemo:", isOpenDemo);
  return { isValid: true, isOpenDemo };
}

export function setAuthenticated(
  context: APIContext,
  value: boolean,
  isAdmin: boolean = false,
  isOpenDemo: boolean = false
) {
  console.log(
    "[Auth Debug] setAuthenticated called with value:",
    value,
    "isAdmin:",
    isAdmin,
    "isOpenDemo:",
    isOpenDemo
  );

  // Get environment information for debugging
  const isMultiTenant = import.meta.env.PUBLIC_ENABLE_MULTI_TENANT === "true";
  const isProd = import.meta.env.PROD;
  const hostname = context.request.headers.get("host") || "";

  console.log("[Auth Debug] Environment:", {
    isMultiTenant,
    isProd,
    host: hostname,
  });

  if (value) {
    let tokenValue = "authenticated";
    if (isAdmin) tokenValue = "admin";
    else if (isOpenDemo) tokenValue = "open_demo";

    // Set basic cookie options without domain - most compatible approach
    const cookieOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax" as const,
      path: "/",
      maxAge: 60 * 60 * 24,
    };

    console.log("[Auth Debug] Setting cookie with options:", JSON.stringify(cookieOptions));
    console.log("[Auth Debug] Token value:", tokenValue);

    context.cookies.set("auth_token", tokenValue, cookieOptions);
    console.log("[Auth Debug] Cookie set complete");
  } else {
    const deleteOptions = { path: "/" };
    console.log(
      "[Auth Debug] Deleting auth_token cookie with options:",
      JSON.stringify(deleteOptions)
    );
    context.cookies.delete("auth_token", deleteOptions);
    console.log("[Auth Debug] Cookie deletion complete");
  }
}
