/* eslint-disable @typescript-eslint/no-explicit-any */
import type { APIRoute } from "astro";
import fs from "fs/promises";
import path from "path";
import { getConfig } from "../../../utils/core/config";

const CONFIG_DIR = path.join(process.cwd(), "config");
const ENV_FILE = path.join(process.cwd(), ".env");

interface ConfigUpdatePayload {
  file: string;
  updates: Record<string, unknown>;
}

async function updateEnvFile(updates: Record<string, unknown>) {
  try {
    // Read existing .env content
    let envContent = "";
    try {
      envContent = await fs.readFile(ENV_FILE, "utf-8");
    } catch (error) {
      // File doesn't exist yet, start with empty content
    }

    // Parse existing env variables
    const envVars = new Map(
      envContent
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => {
          const [key, ...valueParts] = line.split("=");
          return [key.trim(), valueParts.join("=").trim()];
        })
    );

    // Update with new values
    for (const [key, value] of Object.entries(updates)) {
      envVars.set(key, String(value));
    }

    // Write back to file
    const newContent =
      Array.from(envVars.entries())
        .map(([key, value]) => `${key}=${value}`)
        .join("\n") + "\n";

    await fs.writeFile(ENV_FILE, newContent);
  } catch (error) {
    console.error("Error updating .env file:", error);
    throw error;
  }
}

export const POST: APIRoute = async ({ request, params }) => {
  const { operation } = params;

  try {
    const config = await getConfig();
    const isInitOperation = request.headers.get("X-Init-Operation") === "true";

    if (!config && !isInitOperation) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No configuration available",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    let result;
    switch (operation) {
      case "read": {
        const configFile = (await request.json()) as { file: string };
        const filePath = path.join(CONFIG_DIR, `${configFile.file}.json`);
        const fileContent = await fs.readFile(filePath, "utf-8");

        result = {
          success: true,
          data: JSON.parse(fileContent),
        };
        break;
      }

      case "update": {
        const { file, updates } = (await request.json()) as ConfigUpdatePayload;

        // Separate env variables from regular config
        const envUpdates: Record<string, unknown> = {};
        const configUpdates: Record<string, unknown> = {};

        Object.entries(updates).forEach(([key, value]) => {
          if (key.startsWith("PRIVATE_")) {
            envUpdates[key] = value;
          } else {
            configUpdates[key] = value;
          }
        });

        // Update .env if we have env variables
        if (Object.keys(envUpdates).length > 0) {
          await updateEnvFile(envUpdates);
        }

        // Update config file if we have config updates
        if (Object.keys(configUpdates).length > 0) {
          const filePath = path.join(CONFIG_DIR, `${file}.json`);
          const fileContent = await fs.readFile(filePath, "utf-8");
          const currentConfig = JSON.parse(fileContent);
          const newConfig = {
            ...currentConfig,
            ...configUpdates,
          };
          await fs.writeFile(filePath, JSON.stringify(newConfig, null, 2));
        }

        result = {
          success: true,
          data: configUpdates,
        };
        break;
      }

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`Error in filesystem ${operation} operation:`, error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "An error occurred",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

export const GET: APIRoute = async ({ params }) => {
  if (params.operation === "read") {
    return POST({
      request: new Request("http://dummy"),
      params,
      redirect: () => new Response(),
    } as any);
  }

  return new Response(
    JSON.stringify({
      success: false,
      error: "Method not allowed",
    }),
    {
      status: 405,
      headers: { "Content-Type": "application/json" },
    }
  );
};
