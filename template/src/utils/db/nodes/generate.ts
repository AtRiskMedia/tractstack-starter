import { getAllFileNodes, getAllMenuNodes, getAllResourceNodes } from "../utils";
import { getTractStackNode } from "./tractstack";
import { getStoryFragmentNodes } from "./storyfragment";
import { getPaneNodes } from "./panesNew";
import { getImpressionNode } from "./paneImpressions";
import { getPaneFragmentNodes } from "./panefragmentsNew";
import { tursoClient } from "../client";
import type {
  StoryKeepAllNodes,
  TractStackNode,
  StoryFragmentNode,
  PaneNode,
  ImpressionNode,
} from "../../../types";

export async function getGenerateAllNodes(): Promise<StoryKeepAllNodes | null> {
  try {
    const client = await tursoClient.getClient();
    if (!client) return null;

    // Get all tractstack nodes
    const { rows: tractStackRows } = await client.execute(`
      SELECT 
        id as tractstack_id,
        title as tractstack_title,
        slug as tractstack_slug,
        social_image_path
      FROM tractstack
    `);

    // Get all storyfragment nodes with sorted pane IDs
    const { rows: storyFragmentRows } = await client.execute(`
      SELECT 
        sf.id,
        sf.title,
        sf.slug,
        sf.tractstack_id,
        sf.social_image_path,
        sf.tailwind_background_colour,
        sf.created,
        sf.changed,
        sf.menu_id,
        (
          SELECT json_group_array(pane_id)
          FROM (
            SELECT pane_id
            FROM storyfragment_pane
            WHERE storyfragment_id = sf.id
            ORDER BY weight ASC
          )
        ) as pane_ids
      FROM storyfragment sf
    `);

    // Get all pane nodes with their markdown and files
    const { rows: paneRows } = await client.execute(`
      SELECT 
        p.*,
        md.body AS markdown_body,
        md.id AS markdown_id,
        (
          SELECT json_group_array(
            json_object(
              'id', f.id,
              'filename', f.filename,
              'alt_description', f.alt_description,
              'url', f.url,
              'src_set', f.src_set,
              'paneId', p.id,
              'markdown', CASE 
                WHEN p.markdown_id IS NOT NULL THEN json('true')
                ELSE json('false')
              END
            )
          )
          FROM (
            SELECT fp.file_id
            FROM file_pane fp
            WHERE fp.pane_id = p.id
            UNION
            SELECT fm.file_id
            FROM file_markdown fm
            WHERE fm.markdown_id = p.markdown_id
          ) AS combined_files
          JOIN file f ON combined_files.file_id = f.id
        ) AS files
      FROM pane p
      LEFT JOIN markdown md ON p.markdown_id = md.id
    `);

    const fileNodes = await getAllFileNodes();
    const menuNodes = await getAllMenuNodes();
    const resourceNodes = await getAllResourceNodes();

    const tractStackNodes = tractStackRows
      .map((row) => getTractStackNode(row))
      .filter((node): node is TractStackNode => node !== null);

    const storyfragmentNodes = storyFragmentRows
      .map((row) => getStoryFragmentNodes(row))
      .filter((node): node is StoryFragmentNode => node !== null);

    const paneNodes = paneRows
      .map((row) => getPaneNodes(row))
      .filter((node): node is PaneNode => node !== null);
    const impressionNodes = paneRows
      .map((row) => getImpressionNode(row))
      .filter((node): node is ImpressionNode => node !== null);

    const fragmentResults = getPaneFragmentNodes(paneRows, fileNodes, "all", false);

    const storyfragmentPanesMap = storyfragmentNodes.reduce(
      (acc, n: StoryFragmentNode) => {
        acc[n.id] = n.paneIds;
        return acc;
      },
      {} as Record<string, string[]>
    );

    return {
      tractstackNodes: tractStackNodes,
      storyfragmentNodes: storyfragmentNodes,
      storyfragmentPanesMap,
      paneNodes,
      paneFragmentNodes: fragmentResults.paneFragments || [],
      flatNodes: fragmentResults.flatNodes || [],
      fileNodes,
      menuNodes,
      impressionNodes,
      resourceNodes,
    };
  } catch (error) {
    console.error("Error generating all nodes:", error);
    return null;
  }
}
