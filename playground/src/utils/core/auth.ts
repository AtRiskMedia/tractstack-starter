/* eslint-disable @typescript-eslint/no-explicit-any */
import type { APIContext } from "astro";
import type { AuthValidationResult } from "../../types";

export async function isAuthenticated(context: APIContext): Promise<boolean> {
  const token = context.cookies.get("auth_token")?.value;
  return token === "authenticated" || token === "admin" || token === "open_demo";
}

export async function isAdmin(context: APIContext): Promise<boolean> {
  const token = context.cookies.get("auth_token")?.value;
  return token === "admin";
}

export async function isOpenDemoMode(context: APIContext): Promise<boolean> {
  const token = context.cookies.get("auth_token")?.value;
  return token === "open_demo";
}

export async function validateAuth(
  config: Record<string, any> | null
): Promise<AuthValidationResult> {
  if (!config) {
    return {
      isValid: false,
      isOpenDemo: false,
      errors: ["No configuration available"],
    };
  }

  const initConfig = config.init;
  if (!initConfig) {
    return {
      isValid: false,
      isOpenDemo: false,
      errors: ["Missing init configuration"],
    };
  }

  const isOpenDemo = !!initConfig.OPEN_DEMO;

  return {
    isValid: true,
    isOpenDemo,
  };
}

export function setAuthenticated(
  context: {
    cookies: {
      set: (name: string, value: string, options: Record<string, any>) => void;
      delete: (name: string, options?: Record<string, any>) => void;
    };
  },
  value: boolean,
  isAdmin: boolean = false,
  isOpenDemo: boolean = false
) {
  if (value) {
    let tokenValue = "authenticated";
    if (isAdmin) {
      tokenValue = "admin";
    } else if (isOpenDemo) {
      tokenValue = "open_demo";
    }

    context.cookies.set("auth_token", tokenValue, {
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });
  } else {
    context.cookies.delete("auth_token", { path: "/" });
  }
}
