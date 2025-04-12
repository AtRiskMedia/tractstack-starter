import type { APIContext } from "astro";
import type { AuthValidationResult } from "@/types";

export function isAuthenticated(context: APIContext): boolean {
  const token = context.cookies.get("auth_token")?.value;
  if (!token) return false;

  const isMultiTenant = import.meta.env.PUBLIC_ENABLE_MULTI_TENANT === "true";

  // If multi-tenant is disabled, use old logic
  if (!isMultiTenant) {
    return token === "authenticated" || token === "admin" || token === "open_demo";
  }

  // If it's the old format without tenant ID, fall back to previous behavior
  if (token === "authenticated" || token === "admin" || token === "open_demo") {
    return true;
  }

  // For new format, verify tenant matches
  const [authType, tokenTenantId] = token.split(":");
  const requestTenantId = context.locals.tenant?.id || "default";

  return (
    (authType === "authenticated" || authType === "admin" || authType === "open_demo") &&
    tokenTenantId === requestTenantId
  );
}

export function isAdmin(context: APIContext): boolean {
  const token = context.cookies.get("auth_token")?.value;
  if (!token) return false;

  const isMultiTenant = import.meta.env.PUBLIC_ENABLE_MULTI_TENANT === "true";

  // If multi-tenant is disabled, use old logic
  if (!isMultiTenant) {
    return token === "admin";
  }

  // If it's the old format without tenant ID
  if (token === "admin") return true;

  // For new format, verify tenant matches
  const [authType, tokenTenantId] = token.split(":");
  const requestTenantId = context.locals.tenant?.id || "default";

  return authType === "admin" && tokenTenantId === requestTenantId;
}

export function isOpenDemoMode(context: APIContext, config?: Config | null): boolean {
  // First check if we have a cookie indicating a specific auth state
  const token = context.cookies.get("auth_token")?.value;

  // If it's the old format without tenant ID
  if (token === "admin" || token === "authenticated") {
    // If authenticated via cookie, demo mode is off
    return false;
  }

  // For new format with tenant ID
  if (token && token.includes(":")) {
    const [authType] = token.split(":");
    if (authType === "admin" || authType === "authenticated") {
      return false;
    }
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
  const isMultiTenant = import.meta.env.PUBLIC_ENABLE_MULTI_TENANT === "true";

  if (value) {
    // Only include tenant ID if multi-tenant is enabled
    let tokenValue;
    if (isMultiTenant) {
      const tenantId = context.locals.tenant?.id || "default";
      tokenValue = isAdmin ? `admin:${tenantId}` : `authenticated:${tenantId}`;
    } else {
      tokenValue = isAdmin ? "admin" : "authenticated";
    }

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
