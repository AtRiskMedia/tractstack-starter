import type { APIRoute } from "astro";
import { withTenantContext } from "@/utils/api/middleware";
import fs from "fs/promises";
import path from "path";
import { initializeContent } from "@/utils/db/turso.ts";
import { setAuthenticated } from "@/utils/core/auth";
import type { APIContext } from "@/types";

export const POST: APIRoute = withTenantContext(async (context: APIContext) => {
  try {
    const body = await context.request.json();
    const { tenantId, initConfig } = body;

    if (!tenantId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Tenant ID is required",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Verify tenant exists
    const tenantConfigPath = path.join(process.cwd(), "tenants", tenantId, "config", "tenant.json");
    try {
      await fs.access(tenantConfigPath);
    } catch {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Tenant not found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Read tenant config
    const tenantConfigRaw = await fs.readFile(tenantConfigPath, "utf-8");
    const tenantConfig = JSON.parse(tenantConfigRaw);

    // Check if tenant is in claimed status
    if (tenantConfig.status !== "claimed") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Tenant must be claimed before activation",
          status: tenantConfig.status,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Update tenant status to activated
    tenantConfig.status = "activated";
    tenantConfig.activatedAt = new Date().toISOString();

    // Write updated tenant config
    await fs.writeFile(tenantConfigPath, JSON.stringify(tenantConfig, null, 2));

    // Update init.json with provided config
    if (initConfig) {
      const initJsonPath = path.join(process.cwd(), "tenants", tenantId, "config", "init.json");

      // Read existing init.json
      let existingInitConfig = {};
      try {
        const initRaw = await fs.readFile(initJsonPath, "utf-8");
        existingInitConfig = JSON.parse(initRaw);
      } catch {
        // File doesn't exist yet, use empty object
      }

      // Merge with provided config and ensure SITE_INIT is false
      const updatedInitConfig = {
        ...existingInitConfig,
        ...initConfig,
        SITE_INIT: false,
      };

      // Write updated init.json
      await fs.writeFile(initJsonPath, JSON.stringify(updatedInitConfig, null, 2));
    }

    // Initialize database content for the tenant
    // Create a fake API context with tenant information
    const dbContext: APIContext = {
      ...context,
      locals: {
        ...context.locals,
        tenant: {
          id: tenantId,
          paths: {
            dbPath: path.join(process.cwd(), "tenants", tenantId, "db"),
            configPath: path.join(process.cwd(), "tenants", tenantId, "config"),
            publicPath: path.join(process.cwd(), "tenants", tenantId, "public"),
          },
        },
      },
    };

    try {
      await initializeContent(dbContext);
    } catch (dbError) {
      console.error(`Error initializing content for tenant ${tenantId}:`, dbError);
      // Continue activation even if database initialization fails
    }

    // Authenticate the user as admin for this tenant
    setAuthenticated(context, true, true);

    return new Response(
      JSON.stringify({
        success: true,
        tenantId,
        message: "Tenant activated successfully",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error activating tenant:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "An error occurred activating the tenant",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

// GET endpoint to verify and decode activation token
export const GET: APIRoute = withTenantContext(async (context: APIContext) => {
  try {
    const url = new URL(context.request.url);
    const token = url.searchParams.get("token");

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

    // Parse token to extract tenant ID
    const tokenParts = token.split(".");
    if (tokenParts.length !== 5) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid token format",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Extract tenant ID from token
    const encodedTenantId = tokenParts[1];
    const tenantId = Buffer.from(encodedTenantId, "base64").toString();

    // Verify tenant exists
    const tenantConfigPath = path.join(process.cwd(), "tenants", tenantId, "config", "tenant.json");
    try {
      await fs.access(tenantConfigPath);
    } catch {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Tenant not found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Read tenant config to get basic information
    const tenantConfigRaw = await fs.readFile(tenantConfigPath, "utf-8");
    const tenantConfig = JSON.parse(tenantConfigRaw);

    return new Response(
      JSON.stringify({
        success: true,
        tenantId,
        tenantDetails: {
          name: tenantConfig.name,
          email: tenantConfig.email,
          status: tenantConfig.status,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error verifying activation token:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "An error occurred verifying the token",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
