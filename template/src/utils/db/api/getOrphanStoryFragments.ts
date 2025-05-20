import { tursoClient } from "../client";
import { getConfig } from "@/utils/core/config";
import { lispLexer } from "@/utils/concierge/lispLexer";
import { preParseAction } from "@/utils/concierge/preParse_Action";
import type { OrphanItem, APIContext, Config } from "@/types";

export async function getOrphanStoryFragments(context?: APIContext): Promise<OrphanItem[]> {
  try {
    const client = await tursoClient.getClient(context);
    if (!client) return [];

    // Get all storyfragments directly from the database
    const { rows: allStoryFragments } = await client.execute(`
      SELECT id, title, slug FROM storyfragments
    `);

    // If no storyfragments, return empty array
    if (!allStoryFragments || allStoryFragments.length === 0) {
      return [];
    }

    // Create a map to track which storyfragment slugs are referenced
    const storyFragmentUsageMap = new Map<string, string[]>();

    // Initialize all storyfragments with empty arrays
    allStoryFragments.forEach((sf) => {
      if (sf.slug && typeof sf.slug === "string") {
        storyFragmentUsageMap.set(sf.slug, []);
      }
    });

    // Get config for home page detection
    const tenantId = context?.locals?.tenant?.id || "default";
    const tenantPaths = context?.locals?.tenant?.paths;
    const config =
      context?.locals?.config ||
      (tenantPaths && (await getConfig(tenantPaths.configPath, tenantId)));
    const homeSlug = config?.init?.HOME_SLUG;

    // Mark the home page as used
    if (homeSlug && storyFragmentUsageMap.has(homeSlug)) {
      storyFragmentUsageMap.set(homeSlug, ["Home Page"]);
    }

    // Get all menus to check for references (even if there might not be any)
    const { rows: allMenus } = await client.execute(`
      SELECT id, title, options_payload FROM menus
    `);

    // Process each menu's options_payload if any exist
    if (allMenus.length > 0) {
      allMenus.forEach((menu) => {
        try {
          if (!menu.options_payload) return;

          const optionsPayload = JSON.parse(menu.options_payload as string);

          if (Array.isArray(optionsPayload)) {
            optionsPayload.forEach((option) => {
              if (option.actionLisp) {
                // Parse actionLisp using lispLexer
                const parsedTokens = lispLexer(option.actionLisp);

                // Use preParseAction to get the potential target slug
                const actionTarget = preParseAction(parsedTokens, "", false, config as Config);

                // If it's a URL that matches a storyFragment pattern, extract the slug
                if (typeof actionTarget === "string" && actionTarget.startsWith("/")) {
                  // Extract slug from URL (remove leading '/' and any hash fragment)
                  const slug = actionTarget.substring(1).split("#")[0];
                  if (slug && storyFragmentUsageMap.has(slug)) {
                    const menuTitles = storyFragmentUsageMap.get(slug) || [];
                    if (!menuTitles.includes(menu.title as string)) {
                      menuTitles.push(menu.title as string);
                      storyFragmentUsageMap.set(slug, menuTitles);
                    }
                  }
                }
              }
            });
          }
        } catch (e) {
          console.error(`Error processing menu ${menu.id} options_payload:`, e);
        }
      });
    }

    // Format the result, including ALL storyfragments
    return allStoryFragments.map((sf) => {
      const usedIn = storyFragmentUsageMap.get(sf.slug as string) || [];
      return {
        id: sf.id as string,
        title: sf.title as string,
        slug: sf.slug as string,
        usageCount: usedIn.length,
        usedIn: usedIn,
      };
    });
  } catch (error) {
    console.error("Error in getOrphanStoryFragments:", error);
    throw error;
  }
}
