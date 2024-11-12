import { createClient } from "@libsql/client";
import path from "path";
import fs from "fs";
import { initializeSchema } from "./schema";
import { DB_DIR, DEMO_DB } from "../constants";
import type { Client } from "@libsql/client";

let tursoClient: Client | null = null;
let currentMode: "demo" | "prod" = "demo";
let isInitialized = false;
let initPromise: Promise<void> | null = null;

function getDbPath(): string {
  const dbDir = path.join(process.cwd(), DB_DIR);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = path.join(dbDir, DEMO_DB);

  // Only create empty file if it doesn't exist
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, "");
  }
  return dbPath;
}

function validateTursoCredentials(url?: string, authToken?: string): boolean {
  if (!url || !authToken) return false;
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

  initPromise = (async () => {
    try {
      if (tursoClient && currentMode !== targetMode) {
        console.log("Closing existing client due to mode change");
        await tursoClient.close();
        tursoClient = null;
      }

      if (!tursoClient) {
        if (hasValidCredentials && url && authToken) {
          console.log("Creating production Turso client");
          tursoClient = createClient({
            url: url,
            authToken: authToken,
          });
          currentMode = "prod";
        } else {
          console.log("Creating local demo database client");
          const demoClient = createClient({
            url: `file:${getDbPath()}`,
          });
          await initializeSchema({ client: demoClient });
          tursoClient = demoClient;
          currentMode = "demo";
        }

        // Test the connection
        await tursoClient.execute("SELECT 1");
        console.log(`${currentMode.toUpperCase()} connection successful`);
      }

      isInitialized = true;
    } catch (error) {
      console.error("Error initializing Turso client:", error);
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
    throw new Error("Turso client not initialized. Call createTursoClient first.");
  }
  return tursoClient;
}

export function getWriteClient(): Client {
  if (!tursoClient) {
    throw new Error("Turso client not initialized. Call createTursoClient first.");
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
