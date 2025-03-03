import { atom } from "nanostores";
import fs from "node:fs/promises";
import path from "node:path";

interface CSSStore {
  content: string | null;
  version: string | null;
}

// Initialize store with null values
export const cssStore = atom<CSSStore>({
  content: null,
  version: null,
});

// Read CSS file content
async function readFrontendCss(): Promise<string | null> {
  try {
    const filepath = path.join(process.cwd(), "public", "styles", "frontend.css");
    const content = await fs.readFile(filepath, "utf-8");
    return content;
  } catch (error: unknown) {
    // Log a more user-friendly message for expected first-run conditions
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      console.log("frontend.css not found - this is normal for first run");
    } else {
      console.error("Error reading frontend.css:", error);
    }
    return null;
  }
}

// Update store with new CSS content
export async function updateCssStore() {
  const frontendCss = await readFrontendCss();

  // Read current version from init.json
  let version = null;
  try {
    const configPath = path.join(process.cwd(), "config", "init.json");
    const config = JSON.parse(await fs.readFile(configPath, "utf-8"));
    version = config.STYLES_VER?.toString() || null;
  } catch (error: unknown) {
    // Log a more user-friendly message for expected first-run conditions
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      console.log("init.json not found - this is normal for first run");
    } else {
      console.error("Error reading STYLES_VER:", error);
    }
  }

  // Always set the store even if values are null
  // This prevents repeated attempts to read missing files
  cssStore.set({
    content: frontendCss,
    version,
  });
}
