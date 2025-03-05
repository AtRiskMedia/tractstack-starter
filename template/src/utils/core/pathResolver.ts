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
    console.log(`Cache hit for tenant: ${tenantId}`);
    // Update lastAccessed timestamp and return cached data
    registry[tenantId].lastAccessed = Date.now();
    tenantRegistry.set(registry);
    return registry[tenantId];
  }
  console.log(`Cache miss, resolving paths for tenant: ${tenantId}`);

  // If not cached or doesn’t exist, resolve paths
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
      await fs.access(tenantBaseDir); // Check if tenant directory exists
      resolvedPaths = {
        id: tenantId,
        dbPath: path.join(tenantBaseDir, `db`),
        configPath: path.join(tenantBaseDir, `config`),
        publicPath: path.join(tenantBaseDir, `public`),
        lastAccessed: Date.now(),
        exists: true,
      };
    } catch {
      console.warn(`Tenant ${tenantId} directory not found`);
      resolvedPaths = {
        id: tenantId,
        dbPath: "",
        configPath: "",
        publicPath: "",
        lastAccessed: Date.now(),
        exists: false,
      };
    }
  } else {
    // Default tenant paths
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
