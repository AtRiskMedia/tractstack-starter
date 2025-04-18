import fs from "fs/promises";
import path from "path";
import type { TenantConfig } from "@/types";

/**
 * Finds a tenant by email address
 * @param email - The email address to search for
 * @returns Object with tenant ID and details if found, null otherwise
 */
export async function getTenantByEmail(email: string): Promise<{
  tenantId: string;
  config: TenantConfig;
} | null> {
  if (!email) return null;

  const normalizedEmail = email.trim().toLowerCase();

  try {
    // Get tenant base directory
    const tenantsDir = path.join(process.cwd(), "tenants");

    // Check if tenants directory exists
    try {
      await fs.access(tenantsDir);
    } catch {
      return null; // No tenants directory means no tenants
    }

    // List all tenant directories
    const tenantDirs = await fs.readdir(tenantsDir);

    // Search each tenant directory for matching email
    for (const tenantId of tenantDirs) {
      try {
        const tenantConfigPath = path.join(tenantsDir, tenantId, "config", "tenant.json");

        // Check if tenant.json exists
        try {
          await fs.access(tenantConfigPath);
        } catch {
          continue; // Skip if no tenant.json
        }

        // Read and parse tenant config
        const configRaw = await fs.readFile(tenantConfigPath, "utf-8");
        const config = JSON.parse(configRaw) as TenantConfig;

        // Check if email matches
        if (config.email && config.email.toLowerCase() === normalizedEmail) {
          return {
            tenantId,
            config,
          };
        }
      } catch (err) {
        console.error(`Error checking tenant ${tenantId}:`, err);
        continue; // Continue checking other tenants
      }
    }

    // No match found
    return null;
  } catch (error) {
    console.error(`Error searching for tenant by email:`, error);
    return null;
  }
}
