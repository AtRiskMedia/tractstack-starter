import fs from "fs/promises";
import path from "path";

interface BrandImageResult {
  success: boolean;
  path: string;
  error?: string;
}

interface BrandImageParams {
  data: string;
  filename: string;
  tenantPaths: {
    publicPath: string;
    configPath: string;
  };
}

export async function handleBrandImageUpload({
  data,
  filename,
  tenantPaths,
}: BrandImageParams): Promise<BrandImageResult> {
  try {
    const customDir = path.join(tenantPaths.publicPath, "custom");
    await fs.mkdir(customDir, { recursive: true });

    // Read current config to get existing versions
    const configPath = path.join(tenantPaths.configPath, "init.json");
    let currentConfig: Record<string, any> = {};
    try {
      const fileContent = await fs.readFile(configPath, "utf-8");
      currentConfig = JSON.parse(fileContent);
    } catch {
      // File doesn't exist or can't be read
    }

    // Determine which image type and get current version
    const baseFilename = filename.split(".")[0];
    let versionKey: string | undefined;
    let pathKey: string | undefined;

    if (baseFilename === "og") {
      versionKey = "OG_VER";
      pathKey = "OG";
    } else if (baseFilename === "oglogo") {
      versionKey = "OGLOGO_VER";
      pathKey = "OGLOGO";
    }

    // Handle deletion case
    if (!data) {
      if (versionKey && pathKey && currentConfig[versionKey]) {
        // Delete existing versioned file
        const existingVersion = currentConfig[versionKey];
        const fileExtension = filename.split(".").pop() || "png";
        const existingFilePath = path.join(
          customDir,
          `${baseFilename}-${existingVersion}.${fileExtension}`
        );
        try {
          await fs.unlink(existingFilePath);
        } catch {
          // File might not exist, continue
        }

        // Clear from config
        const newConfig = { ...currentConfig };
        delete newConfig[versionKey];
        delete newConfig[pathKey];
        await fs.writeFile(configPath, JSON.stringify(newConfig, null, 2));
      }
      return { success: true, path: "" };
    }

    // Handle upload case
    if (versionKey && pathKey) {
      // Delete existing versioned file if it exists
      if (currentConfig[versionKey]) {
        const existingVersion = currentConfig[versionKey];
        const fileExtension = filename.split(".").pop() || "png";
        const existingFilePath = path.join(
          customDir,
          `${baseFilename}-${existingVersion}.${fileExtension}`
        );
        try {
          await fs.unlink(existingFilePath);
        } catch {
          // File might not exist, continue
        }
      }

      // Generate new version timestamp
      const newVersion = Date.now();
      const fileExtension = filename.split(".").pop() || "png";
      const versionedFilename = `${baseFilename}-${newVersion}.${fileExtension}`;
      const versionedPath = `/custom/${versionedFilename}`;

      // Save the new file
      if (filename.toLowerCase().endsWith(".svg")) {
        const svgData = data.replace(/^data:image\/svg\+xml;base64,/, "");
        const svgText = Buffer.from(svgData, "base64").toString("utf-8");
        await fs.writeFile(path.join(customDir, versionedFilename), svgText);
      } else {
        const base64Data = data.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        await fs.writeFile(path.join(customDir, versionedFilename), buffer);
      }

      // Update config with new version and path
      const newConfig = {
        ...currentConfig,
        [versionKey]: newVersion,
        [pathKey]: versionedPath,
      };
      await fs.writeFile(configPath, JSON.stringify(newConfig, null, 2));

      return { success: true, path: versionedPath };
    } else {
      // Fallback to original behavior for other brand images (logo, wordmark, favicon)
      const existingFiles = await fs.readdir(customDir);
      const matchingFiles = existingFiles.filter((file) => file.startsWith(filename.split(".")[0]));
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

      return { success: true, path: `/custom/${filename}` };
    }
  } catch (error) {
    console.error("Error handling brand image upload:", error);
    return {
      success: false,
      path: "",
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
