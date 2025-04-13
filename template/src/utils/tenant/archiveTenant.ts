import fs from "fs/promises";
import path from "path";
import type { TenantOperationResponse } from "@/types";
import { getTenantStatus } from "./getTenantStatus";

/**
 * Archives a tenant by setting its status to "archived"
 * @param tenantId - The ID of the tenant to archive
 * @returns Object with operation status and message
 */
export async function archiveTenant(tenantId: string): Promise<TenantOperationResponse> {
  // Prevent archiving the default tenant
  if (tenantId === "default") {
    return {
      success: false,
      message: "Cannot archive the default tenant",
    };
  }

  try {
    // Check if tenant exists
    const tenantStatus = await getTenantStatus(tenantId);
    if (!tenantStatus) {
      return {
        success: false,
        message: `Tenant ${tenantId} not found`,
      };
    }

    // Already archived
    if (tenantStatus.status === "archived") {
      return {
        success: true,
        tenantId,
        message: `Tenant ${tenantId} is already archived`,
      };
    }

    const tenantConfigPath = path.join(process.cwd(), "tenants", tenantId, "config", "tenant.json");

    // Read existing config
    const tenantConfigRaw = await fs.readFile(tenantConfigPath, "utf-8");
    const tenantConfig = JSON.parse(tenantConfigRaw);

    // Update status to archived
    tenantConfig.status = "archived";
    tenantConfig.archivedAt = new Date().toISOString();

    // Write updated config
    await fs.writeFile(tenantConfigPath, JSON.stringify(tenantConfig, null, 2));

    return {
      success: true,
      tenantId,
      message: `Tenant ${tenantId} has been archived successfully`,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error archiving tenant ${tenantId}:`, errorMessage);

    return {
      success: false,
      tenantId,
      error: `Failed to archive tenant: ${errorMessage}`,
    };
  }
}
