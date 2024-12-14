import { createClient } from "@libsql/client";
import path from "path";
import fs from "fs/promises";
import type { Client } from "@libsql/client";
import schema from "../../../config/schema.json";

export class TursoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TursoError";
  }
}

class TursoClientManager {
  private static instance: TursoClientManager;
  private client: Client | null = null;
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private readonly configPath = path.join(process.cwd(), "config");
  private readonly dbDir = path.join(process.cwd(), ".tractstack");

  private constructor() {}

  static getInstance(): TursoClientManager {
    if (!TursoClientManager.instance) {
      TursoClientManager.instance = new TursoClientManager();
    }
    return TursoClientManager.instance;
  }

  async getClient(): Promise<Client> {
    if (this.initPromise) {
      await this.initPromise;
      if (this.client) return this.client;
    }

    if (!this.initialized || !this.client) {
      this.initPromise = this.initialize();
      await this.initPromise;
      this.initPromise = null;
    }

    if (!this.client) {
      throw new TursoError("Failed to initialize database client");
    }

    return this.client;
  }

  private async getLocalDbPath(): Promise<string> {
    await fs.mkdir(this.dbDir, { recursive: true });
    const dbPath = path.join(this.dbDir, "local.db");
    try {
      await fs.access(dbPath);
    } catch {
      await fs.writeFile(dbPath, "");
    }
    return dbPath;
  }

  private hasTursoCredentials(): boolean {
    const url = import.meta.env.PRIVATE_TURSO_DATABASE_URL;
    const authToken = import.meta.env.PRIVATE_TURSO_AUTH_TOKEN;
    return !!(url && authToken && url.startsWith("libsql:") && authToken.startsWith("ey"));
  }

  private async tableExists(tableName: string): Promise<boolean> {
    if (!this.client) return false;
    const { rows } = await this.client.execute({
      sql: "SELECT name FROM sqlite_master WHERE type='table' AND name = ?",
      args: [tableName],
    });
    return rows.length > 0;
  }

  private async updateSchemaStatus(isCloud: boolean): Promise<void> {
    const tursoPath = path.join(this.configPath, "turso.json");
    const tursoConfig = {
      LOCAL_DB_INIT: !isCloud,
      TURSO_DB_INIT: isCloud,
    };
    await fs.writeFile(tursoPath, JSON.stringify(tursoConfig, null, 2));
  }

  private async initializeSchema(): Promise<void> {
    if (!this.client) return;

    // Create tables
    for (const [tableName, tableInfo] of Object.entries(schema.tables)) {
      const exists = await this.tableExists(tableName);
      if (!exists) {
        await this.client.execute(tableInfo.sql);
      }
    }

    // Create indexes
    for (const indexSql of schema.indexes) {
      await this.client.execute(indexSql);
    }

    // Update status
    await this.updateSchemaStatus(this.hasTursoCredentials());
  }

  private async initialize(): Promise<void> {
    try {
      if (this.hasTursoCredentials()) {
        // Use Turso cloud database
        const url = import.meta.env.PRIVATE_TURSO_DATABASE_URL;
        const authToken = import.meta.env.PRIVATE_TURSO_AUTH_TOKEN;
        this.client = createClient({ url, authToken });
      } else {
        // Use local database
        const localPath = await this.getLocalDbPath();
        this.client = createClient({ url: `file:${localPath}` });
      }

      // Test connection
      await this.client.execute("SELECT 1");

      // Initialize schema if needed
      const tursoPath = path.join(this.configPath, "turso.json");
      let needsInit = true;

      try {
        const tursoConfig = JSON.parse(await fs.readFile(tursoPath, "utf-8"));
        const isCloud = this.hasTursoCredentials();
        needsInit = isCloud ? !tursoConfig.TURSO_DB_INIT : !tursoConfig.LOCAL_DB_INIT;
      } catch {
        needsInit = true;
      }

      if (needsInit) {
        await this.initializeSchema();
      }

      this.initialized = true;
    } catch (error) {
      this.client = null;
      this.initialized = false;
      throw error;
    }
  }

  async reset(): Promise<void> {
    if (this.client) {
      this.client.close();
    }
    this.client = null;
    this.initialized = false;
    this.initPromise = null;
  }
}

export const tursoClient = {
  getClient: () => TursoClientManager.getInstance().getClient(),
  reset: () => TursoClientManager.getInstance().reset(),
};
