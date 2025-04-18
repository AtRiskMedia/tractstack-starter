import type { APIRoute } from "astro";
import { withTenantContext } from "@/utils/api/middleware";
import fs from "fs/promises";
import path from "path";
import { verifyActivationToken } from "@/utils/tenant/verifyToken";
import crypto from "crypto";
import type { APIContext } from "@/types";

// Simplified password validation for sandboxes
function validatePassword(password: string): { valid: boolean; message?: string } {
  if (!password || password.trim() === "") {
    return { valid: false, message: "Password cannot be empty" };
  }
  return { valid: true };
}

// Hash password with salt
function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return { hash, salt };
}

export const POST: APIRoute = withTenantContext(async (context: APIContext) => {
  try {
    const body = await context.request.json();
    const { token, password, editorPassword } = body;

    if (!token) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Activation token is required",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (!password) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Password is required",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Simplified password validation
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: passwordValidation.message,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Verify token using the shared utility
    const tokenVerification = await verifyActivationToken(token);
    if (!tokenVerification.valid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: tokenVerification.message || "Invalid activation token",
          expired: tokenVerification.expired || false,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const tenantId = tokenVerification.tenantId!;
    const tenantConfigPath = path.join(process.cwd(), "tenants", tenantId, "config", "tenant.json");

    // Read tenant config
    const tenantConfigRaw = await fs.readFile(tenantConfigPath, "utf-8");
    const tenantConfig = JSON.parse(tenantConfigRaw);

    // Check if tenant is already claimed
    if (tenantConfig.status === "claimed" || tenantConfig.status === "activated") {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Tenant has already been ${tenantConfig.status}`,
          status: tenantConfig.status,
        }),
        {
          status: 409,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Hash passwords
    const adminPasswordDetails = hashPassword(password);
    // Use provided editor password or default to admin password
    const editorPasswordDetails = editorPassword
      ? hashPassword(editorPassword)
      : hashPassword(password);

    // Update tenant status to claimed
    tenantConfig.status = "claimed";
    tenantConfig.claimedAt = new Date().toISOString();

    // Do not store password in tenant.json, only in init.json

    // Clear activation token
    delete tenantConfig.activationToken;
    delete tenantConfig.activationTokenExpires;

    // Write updated config
    await fs.writeFile(tenantConfigPath, JSON.stringify(tenantConfig, null, 2));

    // Initialize the tenant's init.json with initial password
    const initJsonPath = path.join(process.cwd(), "tenants", tenantId, "config", "init.json");

    // Read existing init.json or create new one
    let initConfig = {};
    try {
      const initRaw = await fs.readFile(initJsonPath, "utf-8");
      initConfig = JSON.parse(initRaw);
    } catch {
      // File doesn't exist yet, use empty object
    }

    // Update with admin and editor passwords
    initConfig = {
      ...initConfig,
      ADMIN_PASSWORD: password, // Store actual password for login (will be hashed during login)
      EDITOR_PASSWORD: editorPassword || password,
      ADMIN_PASSWORD_HASH: adminPasswordDetails.hash,
      ADMIN_PASSWORD_SALT: adminPasswordDetails.salt,
      EDITOR_PASSWORD_HASH: editorPasswordDetails.hash,
      EDITOR_PASSWORD_SALT: editorPasswordDetails.salt,
      SITE_INIT: false, // Will be set to true during activation
    };

    // Write updated init.json
    await fs.writeFile(initJsonPath, JSON.stringify(initConfig, null, 2));

    return new Response(
      JSON.stringify({
        success: true,
        tenantId,
        message: "Tenant claimed successfully",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error claiming tenant:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "An error occurred claiming the tenant",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
