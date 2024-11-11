import { createClient } from "@libsql/client";
import path from "path";
import fs from "fs";
import type { Client } from "@libsql/client";

const DB_DIR = ".tractstack";
const DB_FILE = "database.db";

let tursoClient: Client | null = null;

export function createTursoClient(config?: { url?: string; authToken?: string }): Client {
  if (tursoClient) return tursoClient;

  // Ensure database directory exists
  const dbDir = path.join(process.cwd(), DB_DIR);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // If we have valid Turso credentials, use remote DB
  if (config?.url?.startsWith("libsql://") && config?.authToken?.startsWith("ey")) {
    tursoClient = createClient({
      url: config.url,
      authToken: config.authToken,
    });
    return tursoClient;
  }

  // Otherwise use local embedded replica
  const dbPath = path.join(dbDir, DB_FILE);

  console.log("Creating Turso client:", {
    hasUrl: !!config?.url,
    isRemote: config?.url?.startsWith("libsql://"),
    usingLocalDB: !config?.url?.startsWith("libsql://"),
    dbPath: dbPath, // in the local DB case
  });

  tursoClient = createClient({
    url: `file:${dbPath}`,
  });

  return tursoClient;
}

// Helper to check if we have valid Turso credentials
export function hasTursoCredentials(): boolean {
  const url = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;
  return !!(url?.startsWith("libsql://") && token?.startsWith("ey"));
}
