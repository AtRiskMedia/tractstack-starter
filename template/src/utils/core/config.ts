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
 * Reads and parses a single config file from a specified config path
 * @param configPath - The directory path containing the config file
 * @param filename - The name of the config file to read
 */
async function readConfigFile(configPath: string, filename: string): Promise<ConfigFile | null> {
  try {
    const filePath = path.join(configPath, filename);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      // If file doesn't exist and it's init.json, return default structure
      if (filename === "init.json") {
        return {
          name: filename,
          content: {},
        };
      }
      // For other files, return null
      return null;
    }

    const fileContents = await fs.readFile(filePath, "utf-8");

    return {
      name: filename,
      content: JSON.parse(fileContents),
    };
  } catch (error) {
    console.error(`Error reading ${filename} from ${configPath}:`, error);
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
 * Gets configuration from all specified config files in the given or default config path
 * @param configPath - Optional path to the config directory; defaults to "./config"
 */
export async function getConfig(configPath?: string): Promise<Config | null> {
  const defaultConfigPath = path.join(process.cwd(), "config");
  const actualConfigPath = configPath || defaultConfigPath;

  try {
    const configFiles = await Promise.all(
      CONFIG_FILES.map((filename) => readConfigFile(actualConfigPath, filename))
    );
    const validConfigs = configFiles.filter((config): config is ConfigFile => config !== null);

    if (validConfigs.length === 0) {
      console.error("No valid config files found in", actualConfigPath);
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
    console.error("Error processing config files from", actualConfigPath, ":", error);
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
  const isInitialized =
    initConfig.SITE_INIT === true && initConfig.HOME_SLUG && initConfig.TRACTSTACK_HOME_SLUG;
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
