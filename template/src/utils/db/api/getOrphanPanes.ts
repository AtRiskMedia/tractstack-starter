import { tursoClient } from "../client";
import type { OrphanItem, APIContext } from "@/types";

export async function getOrphanPanes(context?: APIContext): Promise<OrphanItem[]> {
  try {
    const client = await tursoClient.getClient(context);
    if (!client) return [];

    // Get all panes directly from the database
    const { rows: allPanes } = await client.execute(`
      SELECT id, title, slug FROM panes
    `);

    // If no panes, return empty array
    if (!allPanes || allPanes.length === 0) {
      return [];
    }

    // Query to find which panes are used in storyfragments
    const { rows: paneUsage } = await client.execute(`
      SELECT sp.pane_id, sf.title as sf_title
      FROM storyfragment_panes sp
      JOIN storyfragments sf ON sp.storyfragment_id = sf.id
    `);

    // Create a map of pane ID to array of storyfragment titles
    const paneUsageMap = new Map<string, string[]>();

    // Initialize all panes with empty arrays
    allPanes.forEach((pane) => {
      if (pane.id && typeof pane.id === "string") {
        paneUsageMap.set(pane.id, []);
      }
    });

    // Populate the map with storyfragment titles
    paneUsage.forEach((row) => {
      if (
        row.pane_id &&
        typeof row.pane_id === "string" &&
        row.sf_title &&
        typeof row.sf_title === "string"
      ) {
        const usedIn = paneUsageMap.get(row.pane_id) || [];
        usedIn.push(row.sf_title);
        paneUsageMap.set(row.pane_id, usedIn);
      }
    });

    // Format the result, including ALL panes
    return allPanes.map((pane) => {
      // Make sure pane.id is a string before using it as a key
      const paneId = pane.id && typeof pane.id === "string" ? pane.id : "";
      const usedIn = paneUsageMap.get(paneId) || [];

      return {
        id: pane.id as string,
        title: pane.title as string,
        slug: pane.slug as string,
        usageCount: usedIn.length,
        usedIn: usedIn,
      };
    });
  } catch (error) {
    console.error("Error in getOrphanPanes:", error);
    throw error;
  }
}
