import fs from "fs/promises";
import path from "path";

/**
 * Updates the last accessed timestamp for a tenant
 * @param tenantId - The ID of the tenant to update
 * @param isAdmin - Whether the access is from an admin user
 * @returns Promise resolving to success status and message
 */
export async function updateTenantAccessTime(
  tenantId: string,
  isAdmin: boolean = false
): Promise<{ success: boolean; message?: string }> {
  // Skip updates for the default tenant
  if (tenantId === "default") {
    return { success: true };
  }

  try {
    const tenantConfigPath = path.join(process.cwd(), "tenants", tenantId, "config", "tenant.json");

    // Check if tenant.json exists
    try {
      await fs.access(tenantConfigPath);
    } catch (error) {
      return {
        success: false,
        message: `Tenant configuration not found for ${tenantId}`,
      };
    }

    // Read the current tenant configuration
    const tenantConfigRaw = await fs.readFile(tenantConfigPath, "utf-8");
    const tenantConfig = JSON.parse(tenantConfigRaw);

    // Update the timestamps
    const now = new Date().toISOString();
    tenantConfig.lastAccessed = now;

    if (isAdmin) {
      tenantConfig.lastAdminAccess = now;
    }

    // Write the updated configuration back to the file
    await fs.writeFile(tenantConfigPath, JSON.stringify(tenantConfig, null, 2));

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Failed to update access time for tenant ${tenantId}:`, errorMessage);
    return {
      success: false,
      message: `Failed to update access time: ${errorMessage}`,
    };
  }
}
