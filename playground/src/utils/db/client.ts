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
    const tenantId = context?.locals?.tenant?.id || "default";
    const tenantPaths = context?.locals?.tenant?.paths || {
      configPath: this.defaultConfigPath,
      dbPath: this.defaultDbDir,
    };

    if (this.initPromises.has(tenantId)) {
      await this.initPromises.get(tenantId);
      const client = this.clients.get(tenantId);
      if (!client) throw new TursoError("Client not found after initialization");
      return client;
    }

    if (!this.initialized.get(tenantId)) {
      this.initPromises.set(tenantId, this.initialize(tenantId, tenantPaths));
      await this.initPromises.get(tenantId);
      this.initPromises.delete(tenantId);
    }

    const client = this.clients.get(tenantId);
    if (!client) {
      throw new TursoError(`Failed to initialize database client for tenant ${tenantId}`);
    }
    return client;
  }

  private async getLocalDbPath(dbPath: string, tenantId: string): Promise<string> {
    const tenantDbDir = path.join(dbPath, tenantId);
    await fs.mkdir(tenantDbDir, { recursive: true });
    const dbFilePath = path.join(tenantDbDir, "tractstack.db");
    try {
      await fs.access(dbFilePath);
    } catch {
      await fs.writeFile(dbFilePath, "");
    }
    return dbFilePath;
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
      const isMultiTenant = import.meta.env.ENABLE_MULTI_TENANT === "true";

      if (isMultiTenant) {
        // In multi-tenant mode, always use local database regardless of credentials
        const localPath = await this.getLocalDbPath(tenantPaths.dbPath, tenantId);
        console.log(
          `Multi-tenant mode: Using local database for tenant ${tenantId} at ${localPath}`
        );
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
          console.log(`Single-tenant mode: Using Turso cloud database for tenant ${tenantId}`);
          client = createClient({ url, authToken });
        } else {
          const localPath = await this.getLocalDbPath(tenantPaths.dbPath, tenantId);
          console.log(
            `Single-tenant mode: Using local database for tenant ${tenantId} at ${localPath}`
          );
          client = createClient({ url: `file:${localPath}` });
        }
      }

      await client.execute("SELECT 1");
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
        await this.initializeSchema(client, tenantId, tenantPaths.configPath);
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
