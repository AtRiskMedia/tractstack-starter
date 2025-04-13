import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { getTenantStatus } from "./getTenantStatus";

/**
 * Generates a secure activation token for a tenant
 * @param tenantId - The ID of the tenant
 * @param email - The email address of the tenant owner
 * @param expiresInHours - Token expiration time in hours (default: 48)
 * @returns The generated token or null if unsuccessful
 */
export async function generateActivationToken(
  tenantId: string,
  email: string,
  expiresInHours: number = 48
): Promise<string | null> {
  try {
    // Check if tenant exists
    const tenantStatus = await getTenantStatus(tenantId);
    if (!tenantStatus) {
      return null;
    }

    // Check for required environment variable
    const secretKey = process.env.PRIVATE_TENANT_SECRET;
    if (!secretKey) {
      throw new Error(
        "PRIVATE_TENANT_SECRET environment variable is required for token generation"
      );
    }

    // Generate token components
    const tokenId = crypto.randomBytes(16).toString("hex");
    const timestamp = Date.now();
    const expiresAt = new Date(timestamp + expiresInHours * 60 * 60 * 1000).toISOString();
    const emailHash = crypto
      .createHash("sha256")
      .update(email.toLowerCase())
      .digest("hex")
      .substring(0, 16);

    // Combine parts to create token
    const tokenParts = [
      tokenId,
      Buffer.from(tenantId).toString("base64"),
      emailHash,
      timestamp.toString(36),
    ];
    const token = tokenParts.join(".");

    // Generate signature for verification
    const signature = crypto.createHmac("sha256", secretKey).update(token).digest("hex");

    // Add signature to token
    const fullToken = `${token}.${signature}`;

    // Store token reference in tenant.json
    const tenantConfigPath = path.join(process.cwd(), "tenants", tenantId, "config", "tenant.json");
    const tenantConfigRaw = await fs.readFile(tenantConfigPath, "utf-8");
    const tenantConfig = JSON.parse(tenantConfigRaw);

    // Update token info
    tenantConfig.activationToken = tokenId; // Store only the ID part
    tenantConfig.activationTokenExpires = expiresAt;

    // Write updated config
    await fs.writeFile(tenantConfigPath, JSON.stringify(tenantConfig, null, 2));

    return fullToken;
  } catch (error) {
    console.error(`Error generating activation token for tenant ${tenantId}:`, error);
    return null;
  }
}
