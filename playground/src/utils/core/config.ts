import fs from "node:fs/promises";
import path from "node:path";
import { validateEnv } from "./env";
import type {
  InitConfig,
  SystemCapabilities,
  ConfigFile,
  Config,
  ValidationResult,
} from "../../types";

const CONFIG_FILES = ["init.json", "turso.json"];

/**
 * Reads and parses a single config file
 */
async function readConfigFile(filename: string): Promise<ConfigFile | null> {
  try {
    const configPath = path.join(process.cwd(), "config", filename);
    const fileContents = await fs.readFile(configPath, "utf-8");

    return {
      name: filename,
      content: JSON.parse(fileContents),
    };
  } catch (error) {
    console.error(`Error reading ${filename}:`, error);
    return null;
  }
}

/**
 * Detects system capabilities based on environment configuration
 */
function detectCapabilities(): SystemCapabilities {
  const hasTursoCredentials =
    !!import.meta.env.PRIVATE_TURSO_DATABASE_URL && !!import.meta.env.PRIVATE_TURSO_AUTH_TOKEN;

  const hasPassword =
    !!import.meta.env.PRIVATE_ADMIN_PASSWORD && !!import.meta.env.PRIVATE_EDITOR_PASSWORD;

  const hasConcierge =
    !!import.meta.env.PRIVATE_CONCIERGE_BASE_URL && !!import.meta.env.PRIVATE_CONCIERGE_AUTH_SECRET;

  return {
    hasTurso: hasTursoCredentials,
    hasAssemblyAI: !!import.meta.env.PRIVATE_ASSEMBLYAI_API_KEY,
    hasConcierge: hasConcierge,
    hasPassword: hasPassword,
  };
}

/**
 * Gets configuration from all specified config files
 */
export async function getConfig(): Promise<Config | null> {
  try {
    const configFiles = await Promise.all(CONFIG_FILES.map((filename) => readConfigFile(filename)));
    const validConfigs = configFiles.filter((config): config is ConfigFile => config !== null);

    if (validConfigs.length === 0) {
      console.error("No valid config files found");
      return null;
    }

    // Ensure we have proper typing for the merged config
    const mergedConfig = validConfigs.reduce<Config>(
      (acc, curr) => ({
        ...acc,
        [curr.name.replace(".json", "")]: curr.content,
      }),
      { init: {} as InitConfig } // Initialize with empty InitConfig
    );

    return mergedConfig;
  } catch (error) {
    console.error("Error processing config files:", error);
    return null;
  }
}

/**
 * Validates configuration files and detects system capabilities
 */
export async function validateConfig(config: Config | null): Promise<ValidationResult> {
  const envValidation = validateEnv();
  const capabilities = detectCapabilities();
  const hasPassword = capabilities.hasPassword;

  if (!envValidation.isValid) {
    return {
      isValid: false,
      config: config,
      capabilities,
      hasPassword,
      errors: envValidation.errors,
    };
  }

  if (!config) {
    return {
      isValid: false,
      config: null,
      capabilities,
      hasPassword,
      errors: ["No valid config files found"],
    };
  }

  const loadedConfigs = Object.keys(config);
  const requiredConfigs = CONFIG_FILES.map((file) => file.replace(".json", ""));
  const missingConfigs = requiredConfigs.filter((required) => !loadedConfigs.includes(required));

  if (missingConfigs.length > 0) {
    return {
      isValid: false,
      config,
      capabilities,
      hasPassword,
      errors:
        missingConfigs.length > 0
          ? [`Missing required config files: ${missingConfigs.join(", ")}`]
          : undefined,
    };
  }

  const initConfig = config.init as Record<string, unknown>;
  const isInitialized = initConfig.SITE_INIT === true;
  const hasValidHomeSlug = typeof initConfig.HOME_SLUG === "string";

  if (!isInitialized || !hasValidHomeSlug) {
    return {
      isValid: false,
      config,
      capabilities,
      hasPassword,
      errors: ["Invalid initialization configuration"],
    };
  }

  return {
    isValid: true,
    config,
    capabilities,
    hasPassword,
  };
}
