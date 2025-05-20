import { tursoClient } from "../client";
import type { OrphanItem, APIContext } from "@/types";

export async function getOrphanMenus(context?: APIContext): Promise<OrphanItem[]> {
  try {
    const client = await tursoClient.getClient(context);
    if (!client) return [];

    // Get all menus directly from the database
    const { rows: allMenus } = await client.execute(`
      SELECT id, title FROM menus
    `);

    // If no menus, return empty array
    if (!allMenus || allMenus.length === 0) {
      return [];
    }

    // DIRECT SQL QUERY: Get menu usage from storyfragments
    const { rows: menuUsage } = await client.execute(`
      SELECT m.id as menu_id, sf.title as sf_title
      FROM menus m
      JOIN storyfragments sf ON m.id = sf.menu_id
    `);

    // Create a map of menu ID to array of storyfragment titles
    const menuUsageMap = new Map<string, string[]>();

    // Initialize all menus with empty arrays
    allMenus.forEach((menu) => {
      if (menu.id && typeof menu.id === "string") {
        menuUsageMap.set(menu.id, []);
      }
    });

    // Populate the map with storyfragment titles
    menuUsage.forEach((row) => {
      if (
        row.menu_id &&
        typeof row.menu_id === "string" &&
        row.sf_title &&
        typeof row.sf_title === "string"
      ) {
        const usedIn = menuUsageMap.get(row.menu_id) || [];
        usedIn.push(row.sf_title);
        menuUsageMap.set(row.menu_id, usedIn);
      }
    });

    // Format the result, including ALL menus
    return allMenus.map((menu) => {
      const usedIn = menuUsageMap.get(menu.id as string) || [];
      return {
        id: menu.id as string,
        title: menu.title as string,
        usageCount: usedIn.length,
        usedIn: usedIn,
      };
    });
  } catch (error) {
    console.error("Error in getOrphanMenus:", error);
    throw error;
  }
}
