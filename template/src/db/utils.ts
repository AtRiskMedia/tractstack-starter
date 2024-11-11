import { createClient } from "@libsql/client";
import type { Client } from "@libsql/client";
import path from "path";
import fs from "fs";

// Table names array for easy reference
export const REQUIRED_TABLES = [
  "tractstack",
  "menu",
  "resource",
  "file",
  "markdown",
  "storyfragment",
  "pane",
  "storyfragment_pane",
  "file_pane",
  "file_markdown",
] as const;

export const createTursoClient = (config?: { url?: string; authToken?: string }): Client => {
  if (config?.url && config?.authToken) {
    console.log("Creating remote Turso client with URL:", config.url);
    return createClient({
      url: config.url,
      authToken: config.authToken,
    });
  }

  // For local development/testing, use .tractstack in project root
  const dbDir = path.join(process.cwd(), ".tractstack");
  if (!fs.existsSync(dbDir)) {
    console.log("Creating database directory:", dbDir);
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = path.join(dbDir, "local.db");
  console.log("Creating local Turso client with path:", dbPath);

  return createClient({
    url: `file:${dbPath}`,
  });
};

export const hasDbInit = async (client: Client): Promise<boolean> => {
  try {
    // Check if tables exist by querying sqlite_master
    const result = await client.execute(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      AND name NOT LIKE 'sqlite_%'
    `);

    const existingTables = new Set(result.rows.map((row) => row.name));

    // Verify all required tables exist
    return REQUIRED_TABLES.every((table) => existingTables.has(table));
  } catch (error) {
    console.error("Error checking database initialization:", error);
    return false;
  }
};
