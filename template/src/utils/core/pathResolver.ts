import { tenantRegistry } from "@/store/tenantRegistry";
import path from "path";
import fs from "fs/promises";

export async function resolvePaths(tenantId: string = `default`): Promise<{
  id: string;
  dbPath: string;
  configPath: string;
  publicPath: string;
  lastAccessed: number;
  exists: boolean;
}> {
  const registry = tenantRegistry.get();

  // Check if tenant paths are cached and exist
  if (registry[tenantId] && registry[tenantId].exists) {
    // Update lastAccessed timestamp and return cached data
    registry[tenantId].lastAccessed = Date.now();
    tenantRegistry.set(registry);
    return registry[tenantId];
  }

  // If not cached or doesn't exist, resolve paths
  let resolvedPaths: {
    id: string;
    dbPath: string;
    configPath: string;
    publicPath: string;
    lastAccessed: number;
    exists: boolean;
  };

  if (tenantId !== `default`) {
    const tenantBaseDir = path.join(process.cwd(), `tenants`, tenantId);

    try {
      // First check if the tenant directory exists
      await fs.access(tenantBaseDir);

      // Then check if required subdirectories exist
      const configPathFull = path.join(tenantBaseDir, `config`);
      const dbPathFull = path.join(tenantBaseDir, `db`);
      const publicPathFull = path.join(tenantBaseDir, `public`);

      try {
        await fs.access(configPathFull);
        await fs.access(dbPathFull);
        await fs.access(publicPathFull);

        // All paths exist, set up tenant
        resolvedPaths = {
          id: tenantId,
          dbPath: dbPathFull,
          configPath: configPathFull,
          publicPath: publicPathFull,
          lastAccessed: Date.now(),
          exists: true,
        };
      } catch (error) {
        // Some required subdirectories are missing
        console.warn(`Tenant ${tenantId} has incomplete directory structure`);
        resolvedPaths = {
          id: tenantId,
          dbPath: "", // Empty path to signal invalid config
          configPath: "", // Empty path to signal invalid config
          publicPath: "", // Empty path to signal invalid config
          lastAccessed: Date.now(),
          exists: false,
        };
      }
    } catch {
      // Tenant directory doesn't exist
      console.warn(`Tenant ${tenantId} directory not found`);
      resolvedPaths = {
        id: tenantId,
        dbPath: "", // Empty path to signal invalid config
        configPath: "", // Empty path to signal invalid config
        publicPath: "", // Empty path to signal invalid config
        lastAccessed: Date.now(),
        exists: false,
      };
    }
  } else {
    // Default tenant paths - always considered to exist
    resolvedPaths = {
      id: "default",
      dbPath: path.join(process.cwd(), `.tractstack`),
      configPath: path.join(process.cwd(), `config`),
      publicPath: path.join(process.cwd(), `public`),
      lastAccessed: Date.now(),
      exists: true,
    };
  }

  // Cache the resolved paths in tenantRegistry
  registry[tenantId] = resolvedPaths;
  tenantRegistry.set(registry);

  return resolvedPaths;
}
