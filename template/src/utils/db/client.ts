import { createClient } from "@libsql/client";
import path from "path";
import fs from "fs/promises";
import type { Client } from "@libsql/client";
import schema from "../../../config/schema.json";
import type { APIContext } from "@/types";

export class TursoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TursoError";
  }
}

class TursoClientManager {
  private static instance: TursoClientManager;
  private clients: Map<string, Client> = new Map();
  private initialized: Map<string, boolean> = new Map();
  private initPromises: Map<string, Promise<void>> = new Map();
  private readonly defaultConfigPath = path.join(process.cwd(), "config");
  private readonly defaultDbDir = path.join(process.cwd(), ".tractstack");

  private constructor() {}

  static getInstance(): TursoClientManager {
    if (!TursoClientManager.instance) {
      TursoClientManager.instance = new TursoClientManager();
    }
    return TursoClientManager.instance;
  }

  async getClient(context?: APIContext): Promise<Client> {
    // Important: We must preserve the tenant ID from the context
    const tenantId = context?.locals?.tenant?.id || "default";
    const tenantPaths = context?.locals?.tenant?.paths || {
      configPath: this.defaultConfigPath,
      dbPath: this.defaultDbDir,
    };
    console.warn(`TursoClientManager.getClient called for tenant: ${tenantId}`);
    console.warn(
      `Using paths: ${JSON.stringify(context?.locals?.tenant?.paths || "default paths")}`
    );

    if (this.initPromises.has(tenantId)) {
      await this.initPromises.get(tenantId);
      const client = this.clients.get(tenantId);
      if (!client)
        throw new TursoError(`Client not found after initialization for tenant ${tenantId}`);
      return client;
    }

    if (!this.initialized.get(tenantId)) {
      this.initPromises.set(tenantId, this.initialize(tenantId, tenantPaths));
      try {
        await this.initPromises.get(tenantId);
      } catch (error) {
        this.initPromises.delete(tenantId);
        throw error;
      }
      this.initPromises.delete(tenantId);
    }

    const client = this.clients.get(tenantId);
    if (!client) {
      throw new TursoError(`Failed to initialize database client for tenant ${tenantId}`);
    }
    return client;
  }

  private async getLocalDbPath(dbPath: string, tenantId: string): Promise<string> {
    try {
      // Ensure the directory exists
      await fs.mkdir(dbPath, { recursive: true });

      // Create the database file directly in the tenant's db directory
      const dbFilePath = path.join(dbPath, "tractstack.db");

      try {
        await fs.access(dbFilePath);
      } catch {
        await fs.writeFile(dbFilePath, "");
      }
      return dbFilePath;
    } catch (error) {
      console.error(`Failed to create or access database path for tenant ${tenantId}:`, error);
      throw new TursoError(`Database path error for tenant ${tenantId}`);
    }
  }

  private hasTursoCredentials(tenantId: string): boolean {
    const urlKey =
      tenantId === "default"
        ? "PRIVATE_TURSO_DATABASE_URL"
        : `PRIVATE_TURSO_DATABASE_URL_${tenantId}`;
    const tokenKey =
      tenantId === "default" ? "PRIVATE_TURSO_AUTH_TOKEN" : `PRIVATE_TURSO_AUTH_TOKEN_${tenantId}`;
    const url = import.meta.env[urlKey];
    const authToken = import.meta.env[tokenKey];
    return !!(url && authToken && url.startsWith("libsql:") && authToken.startsWith("ey"));
  }

  private async tableExists(client: Client, tableName: string): Promise<boolean> {
    const { rows } = await client.execute({
      sql: "SELECT name FROM sqlite_master WHERE type='table' AND name = ?",
      args: [tableName],
    });
    return rows.length > 0;
  }

  private async updateSchemaStatus(configPath: string, isCloud: boolean): Promise<void> {
    const tursoPath = path.join(configPath, "turso.json");
    const tursoConfig = {
      LOCAL_DB_INIT: !isCloud,
      TURSO_DB_INIT: isCloud,
    };
    await fs.writeFile(tursoPath, JSON.stringify(tursoConfig, null, 2));
  }

  private async initializeSchema(
    client: Client,
    tenantId: string,
    configPath: string
  ): Promise<void> {
    for (const [tableName, tableInfo] of Object.entries(schema.tables)) {
      const exists = await this.tableExists(client, tableName);
      if (!exists) {
        await client.execute(tableInfo.sql);
      }
    }
    for (const indexSql of schema.indexes) {
      await client.execute(indexSql);
    }
    await this.updateSchemaStatus(configPath, this.hasTursoCredentials(tenantId));
  }

  private async initialize(
    tenantId: string,
    tenantPaths: { configPath: string; dbPath: string }
  ): Promise<void> {
    try {
      let client: Client;
      // First check if multi-tenant mode is enabled
      const isMultiTenant = import.meta.env.PUBLIC_ENABLE_MULTI_TENANT === "true";

      if (isMultiTenant) {
        // In multi-tenant mode, always use local database regardless of credentials
        const localPath = await this.getLocalDbPath(tenantPaths.dbPath, tenantId);
        client = createClient({ url: `file:${localPath}` });
      } else {
        // In single-tenant mode, check for Turso credentials
        if (this.hasTursoCredentials(tenantId)) {
          const urlKey =
            tenantId === "default"
              ? "PRIVATE_TURSO_DATABASE_URL"
              : `PRIVATE_TURSO_DATABASE_URL_${tenantId}`;
          const tokenKey =
            tenantId === "default"
              ? "PRIVATE_TURSO_AUTH_TOKEN"
              : `PRIVATE_TURSO_AUTH_TOKEN_${tenantId}`;
          const url = import.meta.env[urlKey];
          const authToken = import.meta.env[tokenKey];
          client = createClient({ url, authToken });
        } else {
          const localPath = await this.getLocalDbPath(tenantPaths.dbPath, tenantId);
          client = createClient({ url: `file:${localPath}` });
        }
      }

      // Test database connection
      try {
        await client.execute("SELECT 1");
      } catch (error) {
        console.error(`Database connection test failed for tenant ${tenantId}:`, error);
        throw new TursoError(`Database connection failed for tenant ${tenantId}`);
      }

      const tursoPath = path.join(tenantPaths.configPath, "turso.json");
      let needsInit = true;

      try {
        const tursoConfig = JSON.parse(await fs.readFile(tursoPath, "utf-8"));
        // For schema status, check if we're using cloud DB (only possible in single-tenant mode)
        const isCloud = !isMultiTenant && this.hasTursoCredentials(tenantId);
        needsInit = isCloud ? !tursoConfig.TURSO_DB_INIT : true;
      } catch {
        needsInit = true;
      }

      if (needsInit) {
        try {
          await this.initializeSchema(client, tenantId, tenantPaths.configPath);
        } catch (error) {
          console.error(`Schema initialization failed for tenant ${tenantId}:`, error);
          throw new TursoError(`Schema initialization failed for tenant ${tenantId}`);
        }
      }

      this.clients.set(tenantId, client);
      this.initialized.set(tenantId, true);
    } catch (error) {
      this.initialized.set(tenantId, false);
      throw error;
    }
  }

  async reset(): Promise<void> {
    for (const [tenantId, client] of this.clients) {
      client.close();
      this.clients.delete(tenantId);
      this.initialized.delete(tenantId);
    }
    this.initPromises.clear();
  }
}

export const tursoClient = {
  getClient: (context?: APIContext) => TursoClientManager.getInstance().getClient(context),
  reset: () => TursoClientManager.getInstance().reset(),
};
