import fs from "node:fs/promises";
import path from "node:path";
import { validateEnv } from "./env";
import type { InitConfig, SystemCapabilities, ConfigFile, Config, ValidationResult } from "@/types";

const CONFIG_FILES = ["init.json", "turso.json"];

/**
 * Reads all JSON files from the artpacks directory
 * @param configPath - The base directory path containing the config folder
 */
async function readArtpacks(configPath: string): Promise<Record<string, string[]> | null> {
  try {
    const artpacksPath = path.join(configPath, "artpacks");
    const files = await fs.readdir(artpacksPath);
    const jsonFiles = files.filter((file) => file.endsWith(".json"));

    const artpacks: Record<string, string[]> = {};

    for (const file of jsonFiles) {
      const filePath = path.join(artpacksPath, file);
      const content = await fs.readFile(filePath, "utf-8");
      const parsedContent = JSON.parse(content);

      // Validate that content is string[]
      if (Array.isArray(parsedContent) && parsedContent.every((item) => typeof item === "string")) {
        const artpackName = file.replace(".json", "");
        artpacks[artpackName] = parsedContent;
      }
    }

    return Object.keys(artpacks).length > 0 ? artpacks : null;
  } catch (error) {
    console.error(`Error reading artpacks from ${configPath}/artpacks:`, error);
    return null;
  }
}

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
 * Detects system capabilities based on environment configuration and tenant config
 * @param config - Optional config object to check for tenant-specific passwords
 */
function detectCapabilities(config?: Config | null): SystemCapabilities {
  const hasTenantId = config?.tenantId && config.tenantId !== "default";
  const isMultiTenant = import.meta.env.PUBLIC_ENABLE_MULTI_TENANT === "true" && hasTenantId;

  // Check environment variables (always used in single-tenant mode)
  const hasTursoCredentials =
    !!import.meta.env.PRIVATE_TURSO_DATABASE_URL && !!import.meta.env.PRIVATE_TURSO_AUTH_TOKEN;

  const hasEnvPassword =
    !!import.meta.env.PRIVATE_ADMIN_PASSWORD && !!import.meta.env.PRIVATE_EDITOR_PASSWORD;

  const hasConcierge =
    !!import.meta.env.PRIVATE_CONCIERGE_BASE_URL && !!import.meta.env.PRIVATE_CONCIERGE_AUTH_SECRET;

  // Check config for passwords (used in multi-tenant mode)
  let hasConfigPassword = false;
  if (isMultiTenant && config?.init) {
    const initConfig = config.init as InitConfig;
    hasConfigPassword = !!initConfig.ADMIN_PASSWORD && !!initConfig.EDITOR_PASSWORD;
  }

  // In multi-tenant mode, use config passwords; in single-tenant mode use env passwords
  const hasPassword = isMultiTenant ? hasConfigPassword : hasEnvPassword;

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
    // Read standard config files
    const configFiles = await Promise.all(
      CONFIG_FILES.map((filename) => readConfigFile(actualConfigPath, filename))
    );
    const validConfigs = configFiles.filter((config): config is ConfigFile => config !== null);

    if (validConfigs.length === 0) {
      console.error("No valid config files found in", actualConfigPath);
      return null;
    }

    // Read artpacks from root config
    const artpacks = await readArtpacks(defaultConfigPath);

    // Merge standard configs
    const mergedConfig = validConfigs.reduce<Config>(
      (acc, curr) => ({
        ...acc,
        [curr.name.replace(".json", "")]: curr.content,
      }),
      { init: {} as InitConfig }
    );

    // Add artpacks to config if they exist
    if (artpacks) {
      mergedConfig.artpacks = artpacks;
    }

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
  const capabilities = detectCapabilities(config);

  // Determine if we have passwords - either in env vars or in tenant config
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
