import { createClient } from "@libsql/client";
import path from "path";
import fs from "fs";
import { initializeSchema } from "./schema";
import { DB_DIR, DEMO_DB, PROD_DB } from "../constants";
import type { Client } from "@libsql/client";

let tursoClient: Client | null = null;
let currentMode: "demo" | "prod" = "demo";
let isInitialized = false;
let initPromise: Promise<void> | null = null;

function getDbPath(type: "demo" | "prod"): string {
  const dbDir = path.join(process.cwd(), DB_DIR);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbFile = type === "demo" ? DEMO_DB : PROD_DB;
  const dbPath = path.join(dbDir, dbFile);

  // Only create empty file if it doesn't exist
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, "");
  }
  return dbPath;
}

function validateTursoCredentials(url?: string, authToken?: string): boolean {
  if (!url || !authToken) return false;
  // Validate URL format
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === "libsql:" && authToken.startsWith("ey") && authToken.length > 32;
  } catch {
    return false;
  }
}

export async function createTursoClient(config?: {
  url?: string;
  authToken?: string;
}): Promise<Client> {
  // If initialization is in progress, wait for it
  if (initPromise) {
    await initPromise;
    if (tursoClient) return tursoClient;
  }
  const url = config?.url || import.meta.env.TURSO_DATABASE_URL;
  const authToken = config?.authToken || import.meta.env.TURSO_AUTH_TOKEN;

  console.log("[DEBUG] Creating Turso client:", {
    hasConfig: !!config,
    hasUrl: !!url,
    hasAuthToken: !!authToken,
    currentMode,
    isInitialized,
  });

  const hasValidCredentials = validateTursoCredentials(url, authToken);
  const targetMode = hasValidCredentials ? "prod" : "demo";

  console.log("[DEBUG] Validation results:", {
    hasValidCredentials,
    targetMode,
    hasExistingClient: !!tursoClient,
  });

  // Start initialization
  initPromise = (async () => {
    try {
      // Close existing clients if mode is changing
      if (tursoClient && currentMode !== targetMode) {
        console.log("Closing existing clients due to mode change");
        await Promise.all([tursoClient.close()]);
        tursoClient = null;
      }

      if (!tursoClient) {
        if (hasValidCredentials && url && authToken) {
          console.log("Connecting to production Turso (no replica yet)");
          //console.log("Creating production Turso client with local replica");
          // Production mode: Turso primary with local replica
          //const primary = createClient({
          //  url: `file:${getDbPath("prod")}`,
          //  syncUrl: url,
          //  authToken: authToken,
          //});
          const primary = createClient({
            url: url,
            authToken: authToken,
          });

          //try {
          //  await primary.sync();
          //  console.log("Sync completed successfully");
          //} catch (error) {
          //  console.error("Sync error:", error);
          //}

          // Initialize schema for local replica
          //await initializeSchema({ client: primary });

          tursoClient = primary;
          currentMode = "prod";
        } else {
          console.log("Creating local demo database client");
          // Demo mode: Single local database
          const demoClient = createClient({
            url: `file:${getDbPath("demo")}`,
          });
          console.log(`attempting to initialize on demoClient`, demoClient);
          // Initialize schema for demo database
          await initializeSchema({ client: demoClient });
          (tursoClient = demoClient), (currentMode = "demo");
        }
      }

      isInitialized = true;
    } catch (error) {
      console.error("Error initializing Turso clients:", error);
      throw error;
    } finally {
      initPromise = null;
    }
  })();

  await initPromise;
  return tursoClient!;
}

export function getReadClient(): Client {
  if (!tursoClient) {
    throw new Error("Turso clients not initialized. Call createTursoClient first.");
  }
  return tursoClient;
}
export function getWriteClient(): Client {
  if (!tursoClient) {
    throw new Error("Turso clients not initialized. Call createTursoClient first.");
  }
  return tursoClient;
}

export function getCurrentMode(): "demo" | "prod" {
  return currentMode;
}

export function hasTursoCredentials(): boolean {
  return validateTursoCredentials(
    import.meta.env.TURSO_DATABASE_URL,
    import.meta.env.TURSO_AUTH_TOKEN
  );
}

export function resetTursoClient(): void {
  if (tursoClient) {
    tursoClient.close();
    tursoClient = null;
  }
  isInitialized = false;
  currentMode = "demo";
  initPromise = null;
}
