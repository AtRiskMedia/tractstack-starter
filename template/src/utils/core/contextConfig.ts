import { getConfig } from "./config";
import { resolvePaths } from "./pathResolver";

export async function getConfigFromRequest(request: Request) {
  const isMultiTenant = import.meta.env.PUBLIC_ENABLE_MULTI_TENANT === "true";
  let tenantId = "default";

  if (isMultiTenant) {
    // Prefer X-Forwarded-Host, fall back to Host
    const hostname = request.headers.get("x-forwarded-host") || request.headers.get("host");

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

  const resolved = await resolvePaths(tenantId);
  return getConfig(resolved.configPath);
}
