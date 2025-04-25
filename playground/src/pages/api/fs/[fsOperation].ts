/* eslint-disable @typescript-eslint/no-explicit-any */
import { createRequire } from "module";
import type { APIRoute } from "astro";
import type { APIContext } from "@/types";
import { withTenantContext } from "@/utils/api/middleware";
import fs from "fs/promises";
import path from "path";
import { getConfig } from "@/utils/core/config";
import { 
  invalidateEntry,
  setCachedContentMap
} from "@/store/contentCache";
import { processImage } from "@/utils/images/processImage";

interface ConfigUpdatePayload {
  file: string;
  updates: Record<string, unknown>;
}

async function readConfigFile(
  filename: string,
  configPath: string
): Promise<Record<string, any> | null> {
  try {
    const filePath = path.join(configPath, filename);

    try {
      await fs.access(filePath);
    } catch {
      if (filename === "init.json") return {};
      return null;
    }

    const fileContents = await fs.readFile(filePath, "utf-8");
    return JSON.parse(fileContents);
  } catch (error) {
    console.error(`Error reading ${filename}:`, error);
    return null;
  }
}

async function updateEnvFile(updates: Record<string, unknown>, basePath: string) {
  try {
    const envPath = path.join(basePath, ".env"); // Define envPath here based on basePath
    let envContent = "";
    try {
      envContent = await fs.readFile(envPath, "utf-8");
    } catch {
      // File doesn't exist yet
    }

    const envVars = new Map(
      envContent
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => {
          const [key, ...valueParts] = line.split("=");
          return [key.trim(), valueParts.join("=").trim()];
        })
    );

    for (const [key, value] of Object.entries(updates)) {
      envVars.set(key, String(value));
    }

    const newContent =
      Array.from(envVars.entries())
        .map(([key, value]) => `${key}=${value}`)
        .join("\n") + "\n";

    await fs.writeFile(envPath, newContent);
  } catch (error) {
    console.error("Error updating .env file:", error);
    throw error;
  }
}

export const POST: APIRoute = withTenantContext(async (context: APIContext) => {
  const { fsOperation } = context.params;
  const tenantPaths = context.locals.tenant?.paths || {
    configPath: path.join(process.cwd(), "config"),
    publicPath: path.join(process.cwd(), "public"),
    dbPath: path.join(process.cwd(), ".tractstack"), // Match Tenant['paths'] type
  };

  try {
    const tenantId = context.locals.tenant?.id || "default";
    const config = context.locals.config || (await getConfig(tenantPaths.configPath, tenantId));
    const isInitOperation = context.request.headers.get("X-Init-Operation") === "true";

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
    switch (fsOperation) {
      case "read": {
        const configFile = (await context.request.json()) as { file: string };
        const fileContent = await readConfigFile(`${configFile.file}.json`, tenantPaths.configPath);
        result = { success: true, data: fileContent };
        break;
      }
      case "tailwindConfig": {
        const tailwindConfigPath = path.join(process.cwd(), "tailwind.config.cjs");
        const require = createRequire(import.meta.url);
        const tailwindConfig = require(tailwindConfigPath);
        const theme = tailwindConfig.theme;
        if (theme) {
          result = { success: true, data: JSON.stringify(theme) };
        } else {
          throw new Error("Theme object not found in Tailwind config.");
        }
        break;
      }
      case "writeAppWhitelist": {
        const { frontendCss, appCss } = await context.request.json();
        const stylesDir = path.join(tenantPaths.publicPath, "styles");
        await fs.mkdir(stylesDir, { recursive: true });
        await Promise.all([
          fs.writeFile(path.join(stylesDir, "frontend.css"), frontendCss),
          fs.writeFile(path.join(stylesDir, "app.css"), appCss),
        ]);
        result = { success: true, message: "CSS files written successfully" };
        break;
      }
      case "deleteImage": {
        const { path: imagePath } = await context.request.json();
        const fullPath = path.join(tenantPaths.publicPath, imagePath);
        try {
          await fs.unlink(fullPath);
          result = { success: true, message: "Image deleted successfully" };
        } catch (err: any) {
          if (err?.code === "ENOENT") {
            result = { success: true, message: "File already removed" };
          } else {
            throw err;
          }
        }
        break;
      }
      case "saveImage": {
        const { path: imagePath, filename, data } = await context.request.json();
        const fullPath = path.join(tenantPaths.publicPath, imagePath);
        await fs.mkdir(fullPath, { recursive: true });
        const base64Data = data.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        await fs.writeFile(path.join(fullPath, filename), buffer);
        result = { success: true, path: path.join(imagePath, filename) };
        break;
      }
      case "saveOgImage": {
        const { data, filename } = await context.request.json();
        const ogDir = path.join(tenantPaths.publicPath, "images", "og");
        const thumbsDir = path.join(tenantPaths.publicPath, "images", "thumbs");
        await fs.mkdir(ogDir, { recursive: true });
        await fs.mkdir(thumbsDir, { recursive: true });
        const base64Data = data.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        await fs.writeFile(path.join(ogDir, filename), buffer);
        const processedImages = await processImage(buffer, filename, context);
        for (const image of processedImages) {
          await fs.writeFile(path.join(thumbsDir, image.filename), image.buffer);
        }
        const nodeId = path.basename(filename, path.extname(filename));
        const tenantId = context.locals.tenant?.id || "default";
        const isMultiTenant =
          import.meta.env.PUBLIC_ENABLE_MULTI_TENANT === "true" && tenantId !== `default`;

        if (!isMultiTenant) {
          invalidateEntry("storyfragment", nodeId);
          setCachedContentMap([]);
        }
        result = {
          success: true,
          path: `/images/og/${filename}`,
          thumbnails: processedImages.map((img) => `/images/thumbs/${img.filename}`),
        };
        break;
      }
      case "deleteOgImage": {
        const { path: imagePath } = await context.request.json();
        const filename = path.basename(imagePath);
        const basename = path.basename(filename, path.extname(filename));
        const ogPath = path.join(tenantPaths.publicPath, imagePath);
        const thumbsDir = path.join(tenantPaths.publicPath, "images", "thumbs");
        const thumbs = [
          path.join(thumbsDir, `${basename}_600px.webp`),
          path.join(thumbsDir, `${basename}_300px.webp`),
        ];
        try {
          await fs.unlink(ogPath);
          await Promise.all(
            thumbs.map(async (thumbPath) => {
              try {
                await fs.unlink(thumbPath);
              } catch (err: any) {
                if (err?.code !== "ENOENT") throw err;
              }
            })
          );
          result = { success: true, message: "OG image and thumbnails deleted successfully" };
        } catch (err: any) {
          if (err?.code === "ENOENT") {
            result = { success: true, message: "Files already removed" };
          } else {
            throw err;
          }
        }
        break;
      }
      case "saveBrandImage": {
        const { data, filename } = await context.request.json();
        const customDir = path.join(tenantPaths.publicPath, "custom");
        await fs.mkdir(customDir, { recursive: true });
        const existingFiles = await fs.readdir(customDir);
        const matchingFiles = existingFiles.filter((file) =>
          file.startsWith(filename.split(".")[0])
        );
        for (const file of matchingFiles) {
          await fs.unlink(path.join(customDir, file));
        }
        if (filename.toLowerCase().endsWith(".svg")) {
          const svgData = data.replace(/^data:image\/svg\+xml;base64,/, "");
          const svgText = Buffer.from(svgData, "base64").toString("utf-8");
          await fs.writeFile(path.join(customDir, filename), svgText);
        } else {
          const base64Data = data.replace(/^data:image\/\w+;base64,/, "");
          const buffer = Buffer.from(base64Data, "base64");
          await fs.writeFile(path.join(customDir, filename), buffer);
        }
        result = { success: true, path: `/custom/${filename}` };
        break;
      }
      case "storykeepWhitelist": {
        const fileContent = await readConfigFile("tailwindWhitelist.json", tenantPaths.configPath);
        result = { success: true, data: fileContent?.safelist || [] };
        break;
      }
      case "generateTailwindWhitelist": {
        result = { success: true, message: "CSS generated successfully" }; // Placeholder
        break;
      }
      case "update": {
        const { file, updates } = (await context.request.json()) as ConfigUpdatePayload;
        const envUpdates: Record<string, unknown> = {};
        const configUpdates: Record<string, unknown> = {};
        Object.entries(updates).forEach(([key, value]) => {
          if (key.startsWith("PRIVATE_")) envUpdates[key] = value;
          else configUpdates[key] = value;
        });
        if (Object.keys(envUpdates).length > 0) {
          await updateEnvFile(envUpdates, process.cwd()); // Use process.cwd() as base path
        }
        if (Object.keys(configUpdates).length > 0) {
          const filePath = path.join(tenantPaths.configPath, `${file}.json`);
          await fs.mkdir(tenantPaths.configPath, { recursive: true });
          let currentConfig = {};
          try {
            const fileContent = await fs.readFile(filePath, "utf-8");
            currentConfig = JSON.parse(fileContent);
          } catch {
            // File doesn't exist
          }
          const newConfig = { ...currentConfig, ...configUpdates };
          await fs.writeFile(filePath, JSON.stringify(newConfig, null, 2));
        }
        result = { success: true, data: configUpdates };
        break;
      }
      case "updateCss": {
        const { brandColors } = (await context.request.json()) as { brandColors: string };
        const cssPath = path.join(tenantPaths.publicPath, "styles", "custom.css");
        const cssContent = await fs.readFile(cssPath, "utf-8");
        const colors = brandColors.split(",").map((color) => `#${color.trim()}`);
        if (colors.length !== 8) {
          throw new Error("Invalid brand colors format - expected 8 color values");
        }
        let updatedContent = cssContent;
        colors.forEach((color, index) => {
          const varNumber = index + 1;
          updatedContent = updatedContent.replace(
            new RegExp(`--brand-${varNumber}: #[0-9a-fA-F]+;`),
            `--brand-${varNumber}: ${color};`
          );
        });
        await fs.writeFile(cssPath, updatedContent, "utf-8");
        result = { success: true, message: "CSS variables updated successfully" };
        break;
      }
      default:
        throw new Error(`Unknown operation: ${fsOperation}`);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`Error in filesystem ${fsOperation} operation:`, error);
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
});

export const GET: APIRoute = withTenantContext(async (context: APIContext) => {
  if (context.params.fsOperation === "read") {
    return POST(context as any); // Type assertion for simplicity
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
});
