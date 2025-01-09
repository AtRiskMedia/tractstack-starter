/* eslint-disable @typescript-eslint/no-explicit-any */
import { ulid } from "ulid";
import { cleanTursoResource } from "./data/tursoResource";
import { cleanTursoPayload } from "./data/tursoPayload";
import { cleanTursoStoryFragment } from "./data/tursoStoryFragment";
import { cleanTursoContextPane } from "./data/tursoContextPane";
import { cleanTursoFile } from "./data/tursoFile";
import { cleanTursoMenu } from "./data/tursoMenu";
import { cleanTursoTractStack } from "./data/tursoTractStack";
import { cleanPaneDesigns } from "./data/tursoPaneDesign";
import { getFileNodes } from "./nodes/files";
import { getResourceNodes } from "./nodes/resources";
import { getMenuNodes } from "./nodes/menus";
import { getTailwindWhitelist } from "./data/tursoTailwindWhitelist";
import { tursoClient } from "./client";
import type {
  ResourceDatum,
  TractStackDatum,
  StoryFragmentDatum,
  ContextPaneDatum,
  ContentMap,
  DatumPayload,
  PaneDesign,
  TursoFileNode,
  FullContentMap,
  MenuDatum,
  FileDatum,
  TursoQuery,
  Config,
  ImageFileNode,
  MenuNode,
  ResourceNode,
} from "../../types.ts";
import type { ResultSet } from "@libsql/client";

export async function getUniqueTailwindClasses(id: string) {
  try {
    const client = await tursoClient.getClient();
    if (!client) return [];
    const { rows } = await client.execute({
      sql: `SELECT id, options_payload FROM pane WHERE id != ?`,
      args: [id],
    });
    return getTailwindWhitelist(rows);
  } catch (error) {
    console.error("Error fetching pane payloads:", error);
    throw error;
  }
}

export async function getAllResources(): Promise<ResourceDatum[]> {
  try {
    const client = await tursoClient.getClient();
    if (!client) return [];
    const { rows } = await client.execute(`
      SELECT * FROM resource
      ORDER BY title ASC
    `);
    return cleanTursoResource(rows);
  } catch (error) {
    console.error("Error fetching all resources:", error);
    throw error;
  }
}

export async function getAllResourceNodes(): Promise<ResourceNode[]> {
  try {
    const client = await tursoClient.getClient();
    if (!client) return [];
    const { rows } = await client.execute(`
      SELECT * FROM resource
      ORDER BY title ASC
    `);
    return getResourceNodes(rows);
  } catch (error) {
    console.error("Error fetching all resources:", error);
    throw error;
  }
}

export async function getAllMenuNodes(): Promise<MenuNode[]> {
  try {
    const client = await tursoClient.getClient();
    if (!client) return [];
    const { rows } = await client.execute(`
      SELECT id, title, theme, options_payload
      FROM menu
      ORDER BY title
    `);
    return getMenuNodes(rows);
  } catch (error) {
    console.error("Error fetching all menus:", error);
    throw error;
  }
}

export async function getAllMenus(): Promise<MenuDatum[]> {
  try {
    const client = await tursoClient.getClient();
    if (!client) return [];
    const { rows } = await client.execute(`
      SELECT id, title, theme, options_payload
      FROM menu
      ORDER BY title
    `);
    return cleanTursoMenu(rows);
  } catch (error) {
    console.error("Error fetching all menus:", error);
    throw error;
  }
}

export async function getMenuById(id: string): Promise<MenuDatum | null> {
  try {
    const client = await tursoClient.getClient();
    if (!client) return null;
    const { rows } = await client.execute({
      sql: `SELECT id, title, theme, options_payload
            FROM menu
            WHERE id = ?`,
      args: [id],
    });
    const menus = cleanTursoMenu(rows);
    return menus[0] || null;
  } catch (error) {
    console.error("Error fetching menu by ID:", error);
    throw error;
  }
}

export async function getDatumPayload(): Promise<DatumPayload> {
  try {
    const client = await tursoClient.getClient();
    if (!client)
      return {
        files: [],
        menus: [],
        tractstack: [],
        resources: [],
      };
    const { rows } = await client.execute(
      `WITH dummy AS (SELECT 1),
resource_data AS (
  SELECT json_group_array(json_object(
    'id', id,
    'title', title,
    'slug', slug,
    'category_slug', category_slug,
    'oneliner', oneliner,
    'options_payload', options_payload,
    'action_lisp', action_lisp
  )) AS resources
  FROM resource
),
file_data AS (
  SELECT json_group_array(json_object(
    'id', id,
    'filename', filename,
    'alt_description', alt_description,
    'url', url,
    'src_set', src_set
  )) AS files
  FROM file
),
tractstack_data AS (
  SELECT json_group_array(json_object(
    'id', id,
    'title', title,
    'slug', slug,
    'social_image_path', social_image_path
  )) AS tractstack
  FROM tractstack
),
menu_data AS (
  SELECT json_group_array(json_object(
    'id', id,
    'title', title,
    'theme', theme,
    'options_payload', options_payload
  )) AS menus
  FROM menu
)
SELECT
  json_object(
    'resources', COALESCE(resource_data.resources, '[]'),
    'files', COALESCE(file_data.files, '[]'),
    'tractstack', COALESCE(tractstack_data.tractstack, '[]'),
    'menus', COALESCE(menu_data.menus, '[]')
  ) AS result
FROM
  dummy
  LEFT JOIN resource_data ON 1=1
  LEFT JOIN file_data ON 1=1
  LEFT JOIN tractstack_data ON 1=1
  LEFT JOIN menu_data ON 1=1
LIMIT 1;`
    );
    const rawPayload = rows?.at(0)?.result;
    const payload = typeof rawPayload === `string` && rawPayload && JSON.parse(rawPayload);
    return cleanTursoPayload(
      payload || {
        files: [],
        menus: [],
        tractstack: [],
        resources: [],
      }
    );
  } catch (error) {
    console.error("Error fetching ResourceBySlug:", error);
    throw error;
  }
}

export async function getResourcesBySlug(slugs: string[]): Promise<ResourceDatum[]> {
  const placeholders = slugs.map(() => "?").join(",");
  try {
    const client = await tursoClient.getClient();
    if (!client) return [];
    const { rows } = await client.execute({
      sql: `SELECT * FROM resource WHERE slug IN (${placeholders})`,
      args: slugs,
    });
    const resources = cleanTursoResource(rows) || [];
    return resources;
  } catch (error) {
    console.error("Error fetching ResourceBySlug:", error);
    throw error;
  }
}

export async function getResourcesByCategorySlug(slugs: string[]): Promise<ResourceDatum[]> {
  const placeholders = slugs.map(() => "?").join(",");
  try {
    const client = await tursoClient.getClient();
    if (!client) return [];
    const { rows } = await client.execute({
      sql: `SELECT * FROM resource WHERE category_slug IN (${placeholders})`,
      args: slugs,
    });
    const resources = cleanTursoResource(rows) || [];
    return resources;
  } catch (error) {
    console.error("Error fetching ResourceByCategorySlug:", error);
    throw error;
  }
}

export async function getAllTractStack(): Promise<TractStackDatum[]> {
  try {
    const client = await tursoClient.getClient();
    if (!client) return [];
    const { rows } = await client.execute(`
SELECT id, title, slug, social_image_path FROM tractstack
    `);
    return cleanTursoTractStack(rows);
  } catch (error) {
    console.error("Error fetching all file data:", error);
    throw error;
  }
}

export async function getTractStackBySlug(slug: string): Promise<TractStackDatum[] | null> {
  try {
    const client = await tursoClient.getClient();
    if (!client) return [];
    const { rows } = await client.execute({
      sql: `SELECT id, title, slug, social_image_path FROM tractstack WHERE slug = ?`,
      args: [slug],
    });
    return cleanTursoTractStack(rows);
  } catch (error) {
    console.error("Error fetching TractStackIdBySlug:", error);
    throw error;
  }
}

export async function getTractStackIdBySlug(slug: string): Promise<string | null> {
  try {
    const client = await tursoClient.getClient();
    if (!client) return null;
    const { rows } = await client.execute({
      sql: `SELECT id FROM tractstack WHERE slug = ?`,
      args: [slug],
    });

    if (rows.length > 0 && rows[0].id) {
      return rows[0].id as string;
    }

    return null;
  } catch (error) {
    console.error("Error fetching TractStackIdBySlug:", error);
    throw error;
  }
}

export async function getStoryFragmentBySlug(
  slug: string,
  config: Config
): Promise<StoryFragmentDatum | null> {
  try {
    const client = await tursoClient.getClient();
    if (!client) return null;
    const { rows } = await client.execute({
      sql: `SELECT 
                     sf.id AS id,
                     sf.title AS title,
                     sf.slug AS slug,
                     sf.created AS created,
                     sf.changed AS changed,
                     COALESCE(sf.social_image_path, ts.social_image_path) AS social_image_path,
                     sf.tailwind_background_colour,
                     m.id as menu_id,
                     m.title AS menu_title,
                     m.options_payload AS menu_options_payload,
                     m.theme AS menu_theme,
                     ts.id AS tractstack_id,
                     ts.title AS tractstack_title,
                     ts.slug AS tractstack_slug,
                     (
                         WITH RECURSIVE numbered_rows AS (
                           SELECT 
                             p.*,
                             md.body AS markdown_body,
                             md.id AS markdown_id,
                             sp.weight,
                             ROW_NUMBER() OVER (ORDER BY sp.weight ASC) AS row_num
                           FROM storyfragment_pane sp
                           JOIN pane p ON sp.pane_id = p.id
                           LEFT JOIN markdown md ON p.markdown_id = md.id
                           WHERE sp.storyfragment_id = sf.id
                         )
                         SELECT json_group_array(
                           json_object(
                             'id', id,
                             'title', title,
                             'slug', slug,
                             'created', created,
                             'changed', changed,
                             'height_offset_desktop', height_offset_desktop,
                             'height_offset_mobile', height_offset_mobile,
                             'height_offset_tablet', height_offset_tablet,
                             'height_ratio_desktop', height_ratio_desktop,
                             'height_ratio_mobile', height_ratio_mobile,
                             'height_ratio_tablet', height_ratio_tablet,
                             'options_payload', options_payload,
                             'markdown_body', markdown_body,
                             'markdown_id', markdown_id,
                             'files', (
                                SELECT json_group_array(
                                   json_object(
                                       'id', f.id,
                                       'filename', f.filename,
                                       'alt_description', f.alt_description,
                                       'url', f.url,
                                       'src_set', f.src_set,
                                       'paneId', nr.id,
                                       'markdown', CASE 
                                           WHEN nr.markdown_id IS NOT NULL THEN json('true')
                                           ELSE json('false')
                                       END
                                   )
                               )
                               FROM (
                                   SELECT fp.file_id
                                   FROM file_pane fp
                                   WHERE fp.pane_id = nr.id
                                   UNION
                                   SELECT fm.file_id
                                   FROM file_markdown fm
                                   WHERE fm.markdown_id = nr.markdown_id
                               ) AS combined_files
                               JOIN file f ON combined_files.file_id = f.id
                             )
                           )
                         )
                         FROM numbered_rows nr
                         ORDER BY nr.row_num ASC
                     ) AS panes
                 FROM storyfragment sf
                 LEFT JOIN menu m ON sf.menu_id = m.id
                 JOIN tractstack ts ON sf.tractstack_id = ts.id
                 WHERE sf.slug = ?`,
      args: [slug],
    });

    const storyfragments = await cleanTursoStoryFragment(rows, config);
    const storyfragment = storyfragments?.at(0);
    if (storyfragment) return storyfragment;
    return null;
  } catch (error) {
    console.error("Error fetching StoryFragmentBySlug:", error);
    throw error;
  }
}

// clone of getStoryFragmentBySlug
//export async function getStoryFragmentNodesBySlug(slug: string): Promise<StoryKeepNodes | null> {
//  try {
//    const client = await tursoClient.getClient();
//    if (!client) return null;
//    const { rows } = await client.execute({
//      sql: `SELECT
//              sf.id AS id,
//              sf.title AS title,
//              sf.slug AS slug,
//              sf.created AS created,
//              sf.changed AS changed,
//              COALESCE(sf.social_image_path, ts.social_image_path) AS social_image_path,
//              sf.tailwind_background_colour,
//              sf.menu_id,
//              ts.id AS tractstack_id,
//              ts.title AS tractstack_title,
//              ts.slug AS tractstack_slug,
//              (
//                WITH RECURSIVE numbered_rows AS (
//                  SELECT
//                    p.*,
//                    md.body AS markdown_body,
//                    md.id AS markdown_id,
//                    sp.weight,
//                    ROW_NUMBER() OVER (ORDER BY sp.weight ASC) AS row_num
//                  FROM storyfragment_pane sp
//                  JOIN pane p ON sp.pane_id = p.id
//                  LEFT JOIN markdown md ON p.markdown_id = md.id
//                  WHERE sp.storyfragment_id = sf.id
//                )
//                SELECT json_group_array(
//                  json_object(
//                    'id', id,
//                    'title', title,
//                    'slug', slug,
//                    'created', created,
//                    'changed', changed,
//                    'height_offset_desktop', height_offset_desktop,
//                    'height_offset_mobile', height_offset_mobile,
//                    'height_offset_tablet', height_offset_tablet,
//                    'height_ratio_desktop', height_ratio_desktop,
//                    'height_ratio_mobile', height_ratio_mobile,
//                    'height_ratio_tablet', height_ratio_tablet,
//                    'options_payload', options_payload,
//                    'markdown_body', markdown_body,
//                    'markdown_id', markdown_id,
//                    'files', (
//                      SELECT json_group_array(
//                        json_object(
//                          'id', file_id,
//                          'markdown', CASE
//                            WHEN EXISTS (
//                              SELECT 1
//                              FROM file_markdown fm
//                              WHERE fm.file_id = combined_files.file_id
//                              AND fm.markdown_id = nr.markdown_id
//                            )
//                            THEN json('true')
//                            ELSE json('false')
//                          END
//                        )
//                      )
//                      FROM (
//                        SELECT fp.file_id
//                        FROM file_pane fp
//                        WHERE fp.pane_id = nr.id
//                        UNION
//                        SELECT fm.file_id
//                        FROM file_markdown fm
//                        WHERE fm.markdown_id = nr.markdown_id
//                      ) AS combined_files
//                    )
//                  )
//                )
//                FROM numbered_rows nr
//                ORDER BY nr.row_num ASC
//              ) AS panes
//            FROM storyfragment sf
//            JOIN tractstack ts ON sf.tractstack_id = ts.id
//            WHERE sf.slug = ?`,
//      args: [slug],
//    });
//
//    const row = rows.length ? rows[0] : null;
//    if (!row) return null;
//
//    const tractstackNode = getTractStackNode(row);
//    const storyfragmentNode = getStoryFragmentNodes(row);
//    const fileNodes = await getAllFileNodes();
//    const paneNodes = getPaneNodes(row);
//    const paneFragmentNodes = getPaneFragmentNodes(row, fileNodes, slug, false);
//
//    if (tractstackNode && storyfragmentNode) {
//      return {
//        tractstackNode,
//        storyfragmentNode,
//        paneNodes,
//        paneFragmentNodes: paneFragmentNodes.paneFragments || [],
//        flatNodes: paneFragmentNodes.flatNodes || [],
//        fileNodes,
//      };
//    }
//  } catch (error) {
//    console.error("Error fetching StoryFragmentBySlug:", error);
//    throw error;
//  }
//  return null;
//}

export async function executeQueries(
  queries: TursoQuery[]
): Promise<{ success: boolean; results: ResultSet[] }> {
  const results: ResultSet[] = [];

  for (const query of queries) {
    try {
      const client = await tursoClient.getClient();
      if (!client) return { success: false, results: [] };
      const result = await client.execute(query);
      results.push(result);
    } catch (error) {
      console.error("Error executing query:", query, error);
      throw error;
    }
  }

  return { success: true, results };
}

export async function isContentReady(): Promise<boolean> {
  try {
    const client = await tursoClient.getClient();
    if (!client) return false;

    // First check if tables exist
    const { rows: tableCheck } = await client.execute(
      `SELECT name FROM sqlite_master 
       WHERE type='table' AND name IN ('storyfragment', 'tractstack')`
    );

    if (tableCheck.length < 2) return false;

    // Then check for content
    const { rows } = await client.execute(
      `SELECT EXISTS (
         SELECT 1 
         FROM storyfragment sf
         JOIN tractstack ts ON sf.tractstack_id = ts.id
       ) as content_exists`
    );
    return rows[0]?.content_exists === 1;
  } catch (error) {
    console.log("Database not ready for content check:", error);
    return false;
  }
}

export async function isContentPrimed(): Promise<boolean> {
  try {
    const client = await tursoClient.getClient();
    if (!client) return false;

    // Check if tractstack table exists first
    const { rows: tableCheck } = await client.execute(
      `SELECT name FROM sqlite_master 
       WHERE type='table' AND name='tractstack'`
    );

    if (tableCheck.length === 0) return false;

    const { rows } = await client.execute(
      `SELECT EXISTS (SELECT 1 FROM tractstack LIMIT 1) as content_exists`
    );
    return rows[0]?.content_exists === 1;
  } catch (error) {
    console.log("Database not ready for content prime check:", error);
    return false;
  }
}

export async function isTursoReady(): Promise<boolean> {
  try {
    const client = await tursoClient.getClient();
    if (!client) return false;

    const { rows } = await client.execute(`
      SELECT COUNT(*) as table_count 
      FROM sqlite_master 
      WHERE type='table' 
      AND name IN (
        'tractstack',
        'menu',
        'resource',
        'file',
        'markdown',
        'storyfragment',
        'pane',
        'storyfragment_pane',
        'file_pane',
        'file_markdown'
      )
    `);
    return rows[0].table_count === 10;
  } catch (error) {
    console.log("Database not ready:", error);
    return false;
  }
}

export async function checkTursoStatus(): Promise<boolean> {
  try {
    const client = await tursoClient.getClient();
    if (!client) {
      console.log("No Turso client available");
      return false;
    }
    // Test basic connectivity
    await client.execute("SELECT 1");

    // Check for required tables
    const { rows } = await client.execute(`
      SELECT COUNT(*) as table_count 
      FROM sqlite_master 
      WHERE type='table' 
      AND name IN (
        'tractstack',
        'menu',
        'resource',
        'file',
        'markdown',
        'storyfragment',
        'pane',
        'storyfragment_pane',
        'file_pane',
        'file_markdown'
      )
    `);
    const tableCount = rows[0]?.table_count as number;
    return tableCount === 10;
  } catch (error) {
    console.error("Database status check failed:", error);
    return false;
  }
}

export async function getContextPaneBySlug(slug: string): Promise<ContextPaneDatum | null> {
  try {
    const client = await tursoClient.getClient();
    if (!client) return null;
    const { rows } = await client.execute({
      sql: `SELECT 
                   p.id, 
                   p.title, 
                   p.is_context_pane, 
                   p.slug, 
                   p.created, 
                   p.changed, 
                   p.height_offset_desktop, 
                   p.height_offset_mobile, 
                   p.height_offset_tablet, 
                   p.height_ratio_desktop, 
                   p.height_ratio_mobile, 
                   p.height_ratio_tablet,
                   p.options_payload, 
                   m.body AS markdown_body,
                   m.id AS markdown_id,
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
                                   WHEN m.id IS NOT NULL THEN json('true')
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
               LEFT JOIN markdown m ON p.markdown_id = m.id
               WHERE p.slug = ? AND p.is_context_pane = 1`,
      args: [slug],
    });

    const contextPane = await cleanTursoContextPane(rows);
    if (contextPane) return contextPane;
    return null;
  } catch (error) {
    console.error("Error fetching ContextPaneBySlug:", error);
    throw error;
  }
}

export async function getContentMap(): Promise<ContentMap[]> {
  try {
    const client = await tursoClient.getClient();
    if (!client) return [];

    // Check if required tables exist
    const { rows: tableCheck } = await client.execute(
      `SELECT name FROM sqlite_master 
       WHERE type='table' AND name IN ('storyfragment', 'tractstack', 'pane', 'storyfragment_pane')`
    );

    const existingTables = new Set(tableCheck.map((row) => row.name as string));

    // Return empty array if any required table is missing
    if (
      !existingTables.has("storyfragment") ||
      !existingTables.has("tractstack") ||
      !existingTables.has("pane") ||
      !existingTables.has("storyfragment_pane")
    ) {
      return [];
    }

    // Query for all three types together
    const results = await Promise.all([
      // Get TractStacks
      client.execute(
        `SELECT 
          id, title, slug, 'TractStack' as type, NULL as parent_id, NULL as parent_title, NULL as parent_slug
         FROM tractstack`
      ),

      // Get StoryFragments with TractStack info
      client.execute(
        `SELECT 
          sf.id AS id,
          sf.title AS title,
          sf.slug AS slug,
          'StoryFragment' as type,
          ts.id AS parent_id,
          ts.title AS parent_title,
          ts.slug AS parent_slug,
          GROUP_CONCAT(sp.pane_id) AS pane_ids
         FROM 
          storyfragment sf
          JOIN tractstack ts ON sf.tractstack_id = ts.id
          LEFT JOIN storyfragment_pane sp ON sf.id = sp.storyfragment_id
         GROUP BY 
          sf.id, sf.title, sf.slug, ts.id, ts.title, ts.slug`
      ),

      // Get Panes with StoryFragment info
      client.execute(
        `SELECT 
          p.id, 
          p.title, 
          p.slug, 
          'Pane' as type,
          p.is_context_pane,
          sf.id AS parent_id,
          sf.title AS parent_title,
          sf.slug AS parent_slug,
          sf.tractstack_id AS tractstack_id
         FROM pane p
         LEFT JOIN storyfragment_pane sp ON p.id = sp.pane_id
         LEFT JOIN storyfragment sf ON sp.storyfragment_id = sf.id`
      ),
    ]);
    const [tractStacks, storyFragments, panes] = results;

    // Combine and transform all results
    const contentMap: ContentMap[] = [
      // Add TractStacks
      ...tractStacks.rows.map((row: any) => ({
        id: row.id,
        title: row.title,
        slug: row.slug,
        type: "TractStack" as const,
        created: new Date(), // You might want to add created field to tractstack table
        changed: null,
      })),

      // Add StoryFragments
      ...storyFragments.rows.map((row: any) => ({
        id: row.id,
        title: row.title,
        slug: row.slug,
        type: "StoryFragment" as const,
        parentId: row.parent_id,
        parentTitle: row.parent_title,
        parentSlug: row.parent_slug,
        panes: row.pane_ids?.split(",") || [],
        created: new Date(row.created || Date.now()),
        changed: row.changed ? new Date(row.changed) : null,
      })),

      // Add Panes
      ...panes.rows.map((row: any) => ({
        id: row.id,
        title: row.title,
        slug: row.slug,
        type: "Pane" as const,
        parentId: row.parent_id,
        parentTitle: row.parent_title,
        parentSlug: row.parent_slug,
        isContextPane: row.is_context_pane === 1,
        created: new Date(row.created || Date.now()),
        changed: row.changed ? new Date(row.changed) : null,
      })),
    ];

    return contentMap;
  } catch (error) {
    console.log("Unable to fetch content map:", error);
    return [];
  }
}

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

export async function getFileById(id: string): Promise<FileDatum | null> {
  try {
    const client = await tursoClient.getClient();
    if (!client) return null;
    const { rows } = await client.execute({
      sql: `SELECT id, filename, alt_description, url, src_set
            FROM file
            WHERE id = ?`,
      args: [id],
    });
    const files = cleanTursoFile(rows);
    if (files.length > 0) {
      const file = files[0];
      if (file.src_set)
        return {
          id: file.id,
          filename: file.filename,
          altDescription: file.alt_description,
          paneId: file.paneId,
          markdown: file.markdown,
          src: `${file.url}`.replace(/(\.[^.]+)$/, "_1920px$1"),
          srcSet: false,
        };
      return {
        id: file.id,
        filename: file.filename,
        altDescription: file.alt_description,
        paneId: file.paneId,
        markdown: file.markdown,
        src: `${file.url}`,
        srcSet: false,
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching file by ID:", error);
    throw error;
  }
}

export async function getAllFileDatum(): Promise<TursoFileNode[]> {
  try {
    const client = await tursoClient.getClient();
    if (!client) return [];
    const { rows } = await client.execute(`
      SELECT id, filename, alt_description, url, src_set
      FROM file
    `);
    return cleanTursoFile(rows);
  } catch (error) {
    console.error("Error fetching all file data:", error);
    throw error;
  }
}

export async function getFullContentMap(): Promise<FullContentMap[]> {
  try {
    const client = await tursoClient.getClient();
    if (!client) return [];
    //const { rows: tableCheck } = await client.execute(
    //  `SELECT name FROM sqlite_master
    //   WHERE type='table' AND name IN ('menu', 'pane', 'resource', 'storyfragment', 'tractstack')`
    //);
    //const existingTables = tableCheck.map((row) => row.name as string);
    const queryParts = [];
    //if (existingTables.includes("menu")) {
    queryParts.push(`SELECT id, id as slug, title, 'Menu' as type, theme as extra 
                      FROM menu`);
    //}
    //if (existingTables.includes("pane")) {
    queryParts.push(`SELECT id, slug, title, 'Pane' as type, is_context_pane as extra 
                      FROM pane`);
    //}
    //if (existingTables.includes("resource")) {
    queryParts.push(`SELECT id, slug, title, 'Resource' as type, category_slug as extra 
                      FROM resource`);
    //}
    //if (existingTables.includes("storyfragment")) {
    queryParts.push(`SELECT id, slug, title, 'StoryFragment' as type, NULL as extra 
                      FROM storyfragment`);
    //}
    //if (existingTables.includes("tractstack")) {
    queryParts.push(`SELECT id, slug, title, 'TractStack' as type, NULL as extra 
                      FROM tractstack`);
    //}
    //if (queryParts.length === 0) return [];

    const { rows } = await client.execute(queryParts.join(" UNION ALL ") + " ORDER BY title");

    return rows.map((row) => {
      const base = {
        id: row.id as string,
        title: row.title as string,
        slug: row.slug as string,
      };

      switch (row.type) {
        case "Menu":
          return {
            ...base,
            type: "Menu",
            theme: row.extra as string,
          };
        case "Resource":
          return {
            ...base,
            type: "Resource",
            categorySlug: row.extra as string | null,
          };
        case "Pane":
          return {
            ...base,
            type: "Pane",
            isContext: Boolean(row.extra),
          };
        case "StoryFragment":
          return {
            ...base,
            type: "StoryFragment",
          };
        case "TractStack":
          return {
            ...base,
            type: "TractStack",
          };
        default:
          throw new Error(`Unknown type: ${row.type}`);
      }
    });
  } catch (error) {
    console.log("Unable to fetch content map:", error);
    return [];
  }
}

export async function initializeContent(): Promise<void> {
  const client = await tursoClient.getClient();
  if (client) {
    try {
      await client.execute({
        sql: "INSERT INTO tractstack (id, title, slug, social_image_path) VALUES (?, ?, ?, ?) ON CONFLICT (slug) DO NOTHING",
        args: [`${ulid()}`, "Tract Stack", "HELLO", ""],
      });
    } catch (error) {
      console.error("Content initialization error:", error);
      throw error;
    }
  }
}

export async function getAllFileNodes(): Promise<ImageFileNode[]> {
  try {
    const client = await tursoClient.getClient();
    if (!client) return [];
    const { rows } = await client.execute(`
      SELECT id, filename, alt_description, url, src_set
      FROM file
    `);
    return getFileNodes(rows);
  } catch (error) {
    console.error("Error fetching all file data:", error);
    throw error;
  }
}
