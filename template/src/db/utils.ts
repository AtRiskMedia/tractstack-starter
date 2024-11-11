import { createClient } from "@libsql/client";
import { createClient as createWebClient } from "@libsql/client/web";
import type { Client } from "@libsql/client";
import path from "path";
import fs from "fs";

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

export const createTursoClient = (config?: {
  url?: string;
  authToken?: string;
  previewMode?: boolean;
  isWeb?: boolean;
}): Client => {
  // Set up database directory
  const dbDir = path.join(process.cwd(), ".tractstack");
  if (!fs.existsSync(dbDir)) {
    console.log("Creating database directory:", dbDir);
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Preview mode or no credentials - use embedded replica with demo data
  if (config?.previewMode || (!config?.url && !config?.authToken)) {
    const replicaPath = path.join(dbDir, "tractstack.db");
    console.log("Using replica database:", replicaPath);

    if (config?.isWeb) {
      return createWebClient({
        url: "file:tractstack.db",
      });
    }
    return createClient({
      url: `file:${replicaPath}`,
    });
  }

  // Production mode with credentials - use remote Turso
  if (config?.url && config?.authToken) {
    console.log("Creating remote Turso client with URL:", config.url);
    if (config?.isWeb) {
      return createWebClient({
        url: config.url,
        authToken: config.authToken,
      });
    }
    return createClient({
      url: config.url,
      authToken: config.authToken,
    });
  }

  // Development mode - use local database
  const dbPath = path.join(dbDir, "local.db");
  console.log("Creating local development database:", dbPath);
  return createClient({
    url: `file:${dbPath}`,
  });
};
