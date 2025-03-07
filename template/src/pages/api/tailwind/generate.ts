import type { APIRoute } from "astro";
import type { APIContext } from "@/types";
import { withTenantContext } from "@/utils/api/middleware";
import { createTailwindcss } from "@mhsdesign/jit-browser-tailwindcss";
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "module";
import { getUniqueTailwindClasses } from "@/utils/db/turso";
import { updateCssStore } from "@/store/css";

export const POST: APIRoute = withTenantContext(async (context: APIContext) => {
  const isMultiTenant = import.meta.env.PUBLIC_ENABLE_MULTI_TENANT === "true";
  if (isMultiTenant) {
    return new Response("CSS generation disabled in multi-tenant mode", { status: 403 });
  }

  const tenantPaths = context.locals.tenant?.paths || {
    configPath: path.join(process.cwd(), "config"),
    publicPath: path.join(process.cwd(), "public"),
  };

  try {
    const tailwindConfigPath = path.join(process.cwd(), "tailwind.config.cjs");
    const require = createRequire(import.meta.url);
    const tailwindConfig = require(tailwindConfigPath);
    if (!tailwindConfig.theme) {
      throw new Error("Theme object not found in Tailwind config.");
    }

    const whitelistPath = path.join(tenantPaths.configPath, "tailwindWhitelist.json");
    const whitelistContent = await fs.readFile(whitelistPath, "utf-8");
    const { safelist: storykeepWhitelistArr } = JSON.parse(whitelistContent);

    const dbClasses = await getUniqueTailwindClasses(context);
    const fullWhitelist = [...new Set([...dbClasses, ...storykeepWhitelistArr])];

    const tailwindCss = createTailwindcss({ tailwindConfig });
    const frontendHtmlContent = [`<span class="${fullWhitelist.join(" ")}"></span>`];
    const frontendCss = await tailwindCss.generateStylesFromContent(
      `@tailwind base; @tailwind utilities;`,
      frontendHtmlContent
    );

    const appHtmlContent = [`<span class="${storykeepWhitelistArr.join(" ")}"></span>`];
    const appCss = await tailwindCss.generateStylesFromContent(
      `@tailwind base; @tailwind utilities;`,
      appHtmlContent
    );

    const stylesDir = path.join(tenantPaths.publicPath, "styles");
    await Promise.all([
      fs.writeFile(path.join(stylesDir, "frontend.css"), frontendCss),
      fs.writeFile(path.join(stylesDir, "app.css"), appCss),
    ]);

    const initConfigPath = path.join(tenantPaths.configPath, "init.json");
    const initConfig = JSON.parse(await fs.readFile(initConfigPath, "utf-8"));
    initConfig.STYLES_VER = Date.now();
    await fs.writeFile(initConfigPath, JSON.stringify(initConfig, null, 2));
    await updateCssStore();

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
});
