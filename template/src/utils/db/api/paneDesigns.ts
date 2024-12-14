import { tursoClient } from "../client";
import { cleanPaneDesigns } from "../data/tursoPaneDesign";
import type { PaneDesign } from "../../../types";

export async function getPaneDesigns(): Promise<PaneDesign[]> {
  try {
    const client = await tursoClient.getClient();
    if (!client) return [];

    const { rows } = await client.execute(`
      WITH file_data AS (
        SELECT 
          combined_files.pane_id,
          json_group_array(
            json_object(
              'id', f.id,
              'filename', f.filename,
              'alt_description', f.alt_description,
              'url', f.url,
              'src_set', f.src_set,
              'paneId', combined_files.pane_id,
              'markdown', CASE 
                WHEN fm.file_id IS NOT NULL THEN json('true')
                ELSE json('false')
              END
            )
          ) AS files
        FROM (
          SELECT fp.pane_id, fp.file_id
          FROM file_pane fp
          UNION
          SELECT p.id as pane_id, fm.file_id
          FROM pane p
          JOIN file_markdown fm ON p.markdown_id = fm.markdown_id
        ) AS combined_files
        JOIN file f ON combined_files.file_id = f.id
        LEFT JOIN file_markdown fm ON fm.file_id = f.id AND fm.markdown_id = (
          SELECT markdown_id FROM pane WHERE id = combined_files.pane_id
        )
        GROUP BY combined_files.pane_id
      )
      SELECT 
        p.id,
        p.title,
        p.slug,
        p.created,
        p.changed,
        p.markdown_id,
        p.options_payload,
        p.is_context_pane,
        p.height_offset_desktop,
        p.height_offset_tablet,
        p.height_offset_mobile,
        p.height_ratio_desktop,
        p.height_ratio_tablet,
        p.height_ratio_mobile,
        m.body AS markdown_body,
        COALESCE(fd.files, '[]') AS files
      FROM pane p
      LEFT JOIN markdown m ON p.markdown_id = m.id
      LEFT JOIN file_data fd ON p.id = fd.pane_id
      ORDER BY p.created DESC
    `);

    return cleanPaneDesigns(rows);
  } catch (error) {
    console.error("Error fetching pane designs:", error);
    throw error;
  }
}
