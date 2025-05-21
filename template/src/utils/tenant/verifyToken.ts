import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import type { TokenVerificationResult } from "@/types";

/**
 * Verifies an activation token and returns the associated tenant information
 * @param token - The activation token to verify
 * @returns Object with verification results and tenant information if valid
 */
export async function verifyActivationToken(token: string): Promise<TokenVerificationResult> {
  try {
    // Validate token format
    const tokenParts = token.split(".");
    if (tokenParts.length !== 5) {
      return { valid: false, message: "Invalid token format" };
    }

    const [tokenId, encodedTenantId, emailHash, timestampStr, signature] = tokenParts;

    // Extract tenant ID
    const tenantId = Buffer.from(encodedTenantId, "base64").toString();

    // Verify tenant exists
    const tenantConfigPath = path.join(process.cwd(), "tenants", tenantId, "config", "tenant.json");
    try {
      await fs.access(tenantConfigPath);
    } catch {
      return { valid: false, message: "Tenant not found" };
    }

    // Read tenant config
    const tenantConfigRaw = await fs.readFile(tenantConfigPath, "utf-8");
    const tenantConfig = JSON.parse(tenantConfigRaw);

    // Check if token matches stored token
    if (tenantConfig.activationToken !== tokenId) {
      return { valid: false, message: "Invalid activation token" };
    }

    // Get tenant secret from the tenant config
    const secretKey = tenantConfig.TENANT_SECRET;
    if (!secretKey) {
      return { valid: false, message: "Tenant secret not found" };
    }

    // Verify signature using the tenant's own secret
    const baseToken = tokenParts.slice(0, 4).join(".");
    const expectedSignature = crypto
      .createHmac("sha256", secretKey)
      .update(baseToken)
      .digest("hex");

    if (signature !== expectedSignature) {
      return { valid: false, message: "Invalid token signature" };
    }

    // Verify timestamp (token age)
    const timestamp = parseInt(timestampStr, 36);
    const tokenDate = new Date(timestamp);
    const now = new Date();
    const tokenAgeHours = (now.getTime() - tokenDate.getTime()) / (1000 * 60 * 60);

    // Token expiration check - using both stored expiration and token timestamp
    const isExpired = tokenAgeHours > 48; // 48-hour default expiration

    if (isExpired) {
      return { valid: false, expired: true, message: "Activation token has expired" };
    }

    if (tenantConfig.activationTokenExpires) {
      const expiresAt = new Date(tenantConfig.activationTokenExpires);
      if (expiresAt < now) {
        return { valid: false, expired: true, message: "Activation token has expired" };
      }
    }

    // Verify email hash if email is available
    if (tenantConfig.email) {
      const expectedEmailHash = crypto
        .createHash("sha256")
        .update(tenantConfig.email.toLowerCase())
        .digest("hex")
        .substring(0, 16);

      if (emailHash !== expectedEmailHash) {
        return { valid: false, message: "Token is not valid for this tenant" };
      }
    }

    return {
      valid: true,
      tenantId,
      email: tenantConfig.email,
      name: tenantConfig.name,
      message: "Token verified successfully",
    };
  } catch (error) {
    console.error("Error verifying activation token:", error);
    return { valid: false, message: "Token verification failed" };
  }
}
