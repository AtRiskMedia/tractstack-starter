import type { APIRoute } from "astro";
import { createTailwindcss } from "@mhsdesign/jit-browser-tailwindcss";
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "module";
import { getUniqueTailwindClasses } from "@/utils/db/turso";

export const POST: APIRoute = async () => {
  try {
    // Get Tailwind config
    const tailwindConfigPath = path.join(process.cwd(), "tailwind.config.cjs");
    const require = createRequire(import.meta.url);
    const tailwindConfig = require(tailwindConfigPath);
    if (!tailwindConfig.theme) {
      throw new Error("Theme object not found in Tailwind config.");
    }

    // Get core whitelist from config
    const whitelistPath = path.join(process.cwd(), "config", "tailwindWhitelist.json");
    const whitelistContent = await fs.readFile(whitelistPath, "utf-8");
    const { safelist: storykeepWhitelistArr } = JSON.parse(whitelistContent);

    // Get all classes from Turso
    const dbClasses = await getUniqueTailwindClasses();

    // Create complete whitelist combining core and database classes
    const fullWhitelist = [...new Set([...dbClasses, ...storykeepWhitelistArr])];

    // Generate Tailwind CSS styles
    const tailwindCss = createTailwindcss({ tailwindConfig });

    // Generate frontend styles (all classes)
    const frontendHtmlContent = [`<span class="${fullWhitelist.join(" ")}"></span>`];
    const frontendCss = await tailwindCss.generateStylesFromContent(
      `@tailwind base;
       @tailwind utilities;`,
      frontendHtmlContent
    );

    // Generate app styles (just storykeep whitelist)
    const appHtmlContent = [`<span class="${storykeepWhitelistArr.join(" ")}"></span>`];
    const appCss = await tailwindCss.generateStylesFromContent(
      `@tailwind base;
       @tailwind utilities;`,
      appHtmlContent
    );

    // Write CSS files
    const stylesDir = path.join(process.cwd(), "public", "styles");
    await Promise.all([
      fs.writeFile(path.join(stylesDir, "frontend.css"), frontendCss),
      fs.writeFile(path.join(stylesDir, "app.css"), appCss),
    ]);

    // Update STYLES_VER in init config
    const initConfigPath = path.join(process.cwd(), "config", "init.json");
    const initConfig = JSON.parse(await fs.readFile(initConfigPath, "utf-8"));
    initConfig.STYLES_VER = Date.now();
    await fs.writeFile(initConfigPath, JSON.stringify(initConfig, null, 2));

    return new Response(
      JSON.stringify({
        success: true,
        classes: fullWhitelist.length,
        frontend: frontendCss.length,
        app: appCss.length,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in tailwind generation:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      { status: 500 }
    );
  }
};
