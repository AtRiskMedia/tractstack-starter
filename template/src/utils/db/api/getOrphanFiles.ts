import { tursoClient } from "../client";
import type { OrphanItem, APIContext } from "@/types";

export async function getOrphanFiles(context?: APIContext): Promise<OrphanItem[]> {
  try {
    const client = await tursoClient.getClient(context);
    if (!client) return [];

    // Get all files directly from the database
    const { rows: allFiles } = await client.execute(`
      SELECT id, filename FROM files
    `);

    // If no files, return empty array
    if (!allFiles || allFiles.length === 0) {
      return [];
    }

    // DIRECT SQL QUERY: Get files used in file_panes junction table
    const { rows: fileUsageRows } = await client.execute(`
      SELECT fp.file_id, p.title as pane_title
      FROM file_panes fp
      JOIN panes p ON fp.pane_id = p.id
    `);

    // Also search for file IDs in pane options_payload JSON
    const { rows: paneOptionsUsage } = await client.execute(`
      SELECT 
        p.id as pane_id, 
        p.title as pane_title,
        p.options_payload
      FROM 
        panes p
      WHERE 
        p.options_payload LIKE '%fileId%'
    `);

    // Create a map of file ID to array of pane titles
    const fileUsageMap = new Map<string, string[]>();

    // Initialize all files with empty arrays
    allFiles.forEach((file) => {
      if (file.id && typeof file.id === "string") {
        fileUsageMap.set(file.id, []);
      }
    });

    // Populate the map with explicit file_panes relationships
    fileUsageRows.forEach((row) => {
      if (
        row.file_id &&
        typeof row.file_id === "string" &&
        row.pane_title &&
        typeof row.pane_title === "string"
      ) {
        const usedIn = fileUsageMap.get(row.file_id) || [];
        usedIn.push(row.pane_title);
        fileUsageMap.set(row.file_id, usedIn);
      }
    });

    // Also check pane options_payload for fileId references
    paneOptionsUsage.forEach((row) => {
      if (row.options_payload && typeof row.options_payload === "string" && row.pane_title) {
        try {
          // Look for fileId in any nodes
          allFiles.forEach((file) => {
            if (
              file.id &&
              typeof file.id === "string" &&
              (row.options_payload as string)?.includes(`"fileId":"${file.id}"`)
            ) {
              const usedIn = fileUsageMap.get(file.id) || [];
              if (!usedIn.includes(row.pane_title as string)) {
                usedIn.push(row.pane_title as string);
                fileUsageMap.set(file.id, usedIn);
              }
            }
          });
        } catch (e) {
          console.error(`Error parsing options_payload for pane ${row.pane_id}:`, e);
        }
      }
    });

    // Format the result, including ALL files
    return allFiles.map((file) => {
      const usedIn = fileUsageMap.get(file.id as string) || [];
      return {
        id: file.id as string,
        title: file.filename as string,
        usageCount: usedIn.length,
        usedIn: usedIn,
      };
    });
  } catch (error) {
    console.error("Error in getOrphanFiles:", error);
    throw error;
  }
}
