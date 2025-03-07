import { getConfig } from "./config";
import { resolvePaths } from "./pathResolver";

export async function getConfigFromRequest(request: Request) {
  const isMultiTenant = import.meta.env.PUBLIC_ENABLE_MULTI_TENANT === "true";
  let tenantId = "default";

  if (isMultiTenant) {
    const hostname = request.headers.get("host");
    if (hostname) {
      // Check for localhost explicitly for testing
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

  const resolved = await resolvePaths(tenantId);
  return getConfig(resolved.configPath);
}
