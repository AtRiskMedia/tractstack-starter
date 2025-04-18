import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

/**
 * Creates a new tenant with the required directory structure and initial configuration
 * @param tenantId - The ID of the tenant to create
 * @param email - Optional email for the tenant owner
 * @param name - Optional name for the tenant owner
 * @returns Object with success status and paths if successful
 */
export async function createTenant(
  tenantId: string,
  email: string = "dev@localhost",
  name: string = "Local Development"
): Promise<{
  success: boolean;
  id: string;
  dbPath: string;
  configPath: string;
  publicPath: string;
  message?: string;
}> {
  if (tenantId === "default") {
    return {
      success: false,
      id: tenantId,
      dbPath: "",
      configPath: "",
      publicPath: "",
      message: "Cannot create the default tenant",
    };
  }

  try {
    const tenantBaseDir = path.join(process.cwd(), "tenants", tenantId);
    const configPathFull = path.join(tenantBaseDir, "config");
    const dbPathFull = path.join(tenantBaseDir, "db");
    const publicPathFull = path.join(tenantBaseDir, "public");
    const stylesPathFull = path.join(publicPathFull, "styles");

    // Create base directories
    await fs.mkdir(tenantBaseDir, { recursive: true });
    await fs.mkdir(configPathFull, { recursive: true });
    await fs.mkdir(dbPathFull, { recursive: true });
    await fs.mkdir(publicPathFull, { recursive: true });
    await fs.mkdir(stylesPathFull, { recursive: true });

    // Copy CSS files from global public directory
    const globalCustomCssPath = path.join(process.cwd(), "public", "styles", "custom.css");
    const tenantCustomCssPath = path.join(stylesPathFull, "custom.css");

    try {
      // Copy custom.css for tenant-specific brand colors
      const customCssContent = await fs.readFile(globalCustomCssPath, "utf-8");
      await fs.writeFile(tenantCustomCssPath, customCssContent);
    } catch (cssError) {
      console.warn(`Failed to copy custom.css for tenant ${tenantId}:`, cssError);
      // Create empty custom.css if source doesn't exist
      await fs.writeFile(
        tenantCustomCssPath,
        ":root {\n  /* Brand Colors */\n  --brand-1: #10120d;\n  --brand-2: #fcfcfc;\n  --brand-3: #f58333;\n  --brand-4: #c8df8c;\n  --brand-5: #293f58;\n  --brand-6: #a7b1b7;\n  --brand-7: #393d34;\n  --brand-8: #e3e3e3;\n}\n"
      );
    }

    // Create empty configuration files
    await fs.writeFile(path.join(configPathFull, "init.json"), JSON.stringify({}, null, 2));

    await fs.writeFile(path.join(configPathFull, "turso.json"), JSON.stringify({}, null, 2));

    // Create tenant.json with TENANT_SECRET
    const tenantSecret = crypto.randomBytes(32).toString("hex");
    const isLocalhost = tenantId === "localhost";

    await fs.writeFile(
      path.join(configPathFull, "tenant.json"),
      JSON.stringify(
        {
          status: isLocalhost ? "activated" : "reserved",
          email,
          name,
          TENANT_SECRET: tenantSecret,
          createdAt: new Date().toISOString(),
          lastAccessed: new Date().toISOString(),
        },
        null,
        2
      )
    );

    return {
      success: true,
      id: tenantId,
      dbPath: dbPathFull,
      configPath: configPathFull,
      publicPath: publicPathFull,
    };
  } catch (error) {
    console.error(`Failed to create tenant ${tenantId}:`, error);
    return {
      success: false,
      id: tenantId,
      dbPath: "",
      configPath: "",
      publicPath: "",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
