import fs from "fs/promises";
import path from "path";
import type { TenantStatus } from "@/types";

/**
 * Gets the current status and details of a tenant
 * @param tenantId - The ID of the tenant to check
 * @returns Object with tenant status information or null if tenant not found
 */
export async function getTenantStatus(tenantId: string): Promise<{
  status: TenantStatus;
  email: string;
  name: string;
  createdAt: string;
  lastAccessed: string;
  lastAdminAccess?: string;
} | null> {
  try {
    // Validate tenant ID
    if (!tenantId || typeof tenantId !== "string") {
      return null;
    }

    // Skip checks for the default tenant which may not have a tenant.json
    if (tenantId === "default") {
      // Still need to check if the default tenant exists
      const defaultConfigPath = path.join(process.cwd(), "config");
      try {
        await fs.access(defaultConfigPath);
      } catch {
        return null; // Default tenant doesn't exist
      }

      // Return basic status for default tenant
      return {
        status: "activated" as TenantStatus,
        email: "system@tractstack.com",
        name: "Default Tenant",
        createdAt: new Date().toISOString(),
        lastAccessed: new Date().toISOString(),
      };
    }

    const tenantConfigPath = path.join(process.cwd(), "tenants", tenantId, "config", "tenant.json");

    // Check if tenant.json exists
    try {
      await fs.access(tenantConfigPath);
    } catch (error) {
      return null; // Tenant doesn't exist or config is missing
    }

    // Read tenant configuration
    const tenantConfigRaw = await fs.readFile(tenantConfigPath, "utf-8");
    const tenantConfig = JSON.parse(tenantConfigRaw);

    // Validate required fields
    if (!tenantConfig.email || !tenantConfig.status) {
      console.warn(`Tenant ${tenantId} has invalid configuration`);
      return null;
    }

    return {
      status: tenantConfig.status || "reserved",
      email: tenantConfig.email || "",
      name: tenantConfig.name || "",
      createdAt: tenantConfig.createdAt || new Date().toISOString(),
      lastAccessed: tenantConfig.lastAccessed || new Date().toISOString(),
      lastAdminAccess: tenantConfig.lastAdminAccess,
    };
  } catch (error) {
    console.error(`Error retrieving status for tenant ${tenantId}:`, error);
    return null;
  }
}
