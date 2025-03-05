import fs from "fs/promises";
import path from "path";

const CSS_FILE_PATH = path.join(process.cwd(), "public", "styles", "custom.css");

interface CssUpdateResult {
  success: boolean;
  error?: string;
}

export async function updateCssVars(brandColors: string): Promise<CssUpdateResult> {
  if (import.meta.env.ENABLE_MULTI_TENANT === "true") {
    return {
      success: true,
    };
  }
  try {
    // Read existing CSS file
    const cssContent = await fs.readFile(CSS_FILE_PATH, "utf-8");

    // Parse the comma-separated color string
    const colors = brandColors.split(",").map((color) => `#${color.trim()}`);
    if (colors.length !== 8) {
      throw new Error("Invalid brand colors format - expected 8 color values");
    }

    // Create new brand variable declarations
    const colorVarUpdates = colors.map((color, index) => {
      const varName = `--brand-${index + 1}`;
      // Match the specific variable and update its value
      const varRegex = new RegExp(`(${varName}):\\s*[^;]+;`);
      if (cssContent.match(varRegex)) {
        return cssContent.replace(varRegex, `$1: ${color};`);
      }
      // If variable doesn't exist, we need to add it to root
      return cssContent.replace(/:root\s*{/, `:root {\n  ${varName}: ${color};`);
    });

    // Apply all updates sequentially
    const updatedContent = colorVarUpdates.reduce((update) => update, cssContent);

    // Write updated content back to file
    await fs.writeFile(CSS_FILE_PATH, updatedContent, "utf-8");

    return { success: true };
  } catch (error) {
    console.error("Error updating CSS variables:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update CSS variables",
    };
  }
}
