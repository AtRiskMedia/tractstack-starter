import fs from "fs/promises";
import path from "path";

/**
 * Checks if a tenant ID is available for creation
 * @param tenantId - The ID to check for availability
 * @returns Object with availability status and reason if unavailable
 */
export async function checkTenantAvailability(tenantId: string): Promise<{
  available: boolean;
  reason?: string;
}> {
  // Validate tenant ID format (alphanumeric and hyphens only)
  const validTenantIdRegex = /^[a-zA-Z0-9-]+$/;
  if (!validTenantIdRegex.test(tenantId)) {
    return {
      available: false,
      reason: "Tenant ID can only contain letters, numbers, and hyphens",
    };
  }

  // Check for reserved words or system tenant IDs
  const reservedIds = ["default", "admin", "system", "api", "www", "app", "test"];
  if (reservedIds.includes(tenantId.toLowerCase())) {
    return {
      available: false,
      reason: "This tenant ID is reserved and cannot be used",
    };
  }

  // Check minimum and maximum length
  if (tenantId.length < 3) {
    return {
      available: false,
      reason: "Tenant ID must be at least 3 characters long",
    };
  }

  if (tenantId.length > 12) {
    return {
      available: false,
      reason: "Tenant ID must be less than 12 characters long",
    };
  }

  try {
    // Check if tenant directory already exists
    const tenantPath = path.join(process.cwd(), "tenants", tenantId);
    await fs.access(tenantPath);

    // If we get here, the directory exists
    return {
      available: false,
      reason: "This tenant ID is already in use",
    };
  } catch (error) {
    // Directory doesn't exist, tenant ID is available
    return { available: true };
  }
}
