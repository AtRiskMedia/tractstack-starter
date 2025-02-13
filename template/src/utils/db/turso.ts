import { ulid } from "ulid";
import { tursoClient } from "./client";
import { getTailwindWhitelist } from "../tailwind/getTailwindWhitelist";
import {
  getCachedContentMap,
  setCachedContentMap,
  getCachedStoryFragmentById,
  getCachedStoryFragmentBySlug,
  getCachedPaneById,
  getCachedPaneBySlug,
  getCachedMenuById,
  getCachedMarkdownById,
  getCachedTractStackById,
  getCachedTractStackBySlug,
  getCachedResourceById,
  getCachedFileById,
  getCachedBeliefById,
  processBatchCache,
} from "@/store/contentCache";
import type {
  TractStackRowData,
  ResourceRowData,
  MenuRowData,
  ImageFileRowData,
  PaneRowData,
  MarkdownRowData,
  StoryFragmentRowData,
  BeliefRowData,
} from "@/store/nodesSerializer.ts";
import type {
  SiteMap,
  FullContentMap,
  BeliefContentMap,
  TractStackContentMap,
  StoryFragmentContentMap,
  PaneContentMap,
  ResourceContentMap,
  MenuContentMap,
} from "@/types.ts";

export interface StoryFragmentFullRowData {
  storyfragment: StoryFragmentRowData;
  tractstack: TractStackRowData;
  menu: MenuRowData | null;
  panes: PaneRowData[];
  markdowns: MarkdownRowData[];
}

export interface ContextPaneFullRowData {
  panes: PaneRowData[];
  markdowns: MarkdownRowData[];
  files: ImageFileRowData[];
}

interface EnrichedPaneRowData extends PaneRowData {
  markdown_body?: string;
  files?: string;
  weight?: number;
}

function ensureString(value: unknown): string {
  if (value === null || value === undefined) {
    throw new Error("Required string value is null or undefined");
  }
  return String(value);
}

export async function getAllTractStackRowData(): Promise<TractStackRowData[]> {
  try {
    const client = await tursoClient.getClient();
    if (!client) return [];
    const { rows } = await client.execute(
      `SELECT id, title, slug, social_image_path FROM tractstacks`
    );
    const tractStacks = rows
      .map((row) => {
        if (!row.id || !row.title || !row.slug) return null;
        return {
          id: row.id,
          title: row.title,
          slug: row.slug,
          ...(typeof row.social_image_path === "string"
            ? { social_image_path: row.social_image_path }
            : {}),
        } as TractStackRowData;
      })
      .filter((row): row is TractStackRowData => row !== null);
    processBatchCache({
      tractStacks,
    });
    return tractStacks;
  } catch (error) {
    console.error("Error fetching getAllTractStackRowData:", error);
    throw error;
  }
}

export async function getTractStackBySlugRowData(slug: string): Promise<TractStackRowData | null> {
  // Check cache first
  const cachedTractStack = getCachedTractStackBySlug(slug);
  if (cachedTractStack) {
    return cachedTractStack;
  }

  try {
    const client = await tursoClient.getClient();
    if (!client) return null;
    const { rows } = await client.execute({
      sql: `SELECT id,title,slug,social_image_path FROM tractstacks WHERE slug = ?`,
      args: [slug],
    });
    if (rows.length > 0 && rows[0].id && rows[0].title && rows[0].slug) {
      const tractStack = {
        id: rows[0].id,
        title: rows[0].title,
        slug: rows[0].slug,
        ...(typeof rows[0].social_image_path === `string`
          ? { social_image_path: rows[0].social_image_path }
          : {}),
      } as TractStackRowData;

      // Update cache
      processBatchCache({
        tractStacks: [tractStack],
      });

      return tractStack;
    }
    return null;
  } catch (error) {
    console.error("Error fetching getTractStackBySlugRowData:", error);
    throw error;
  }
}

export async function getTractStackByIdRowData(id: string): Promise<TractStackRowData | null> {
  // Check cache first
  const cached = getCachedTractStackById(id);
  if (cached) return cached;

  try {
    const client = await tursoClient.getClient();
    if (!client) return null;
    const { rows } = await client.execute({
      sql: `SELECT id,title,slug,social_image_path FROM tractstacks WHERE id = ?`,
      args: [id],
    });
    if (rows.length > 0 && rows[0].id && rows[0].title && rows[0].slug) {
      const tractStack = {
        id: rows[0].id,
        title: rows[0].title,
        slug: rows[0].slug,
        ...(typeof rows[0].social_image_path === `string`
          ? { social_image_path: rows[0].social_image_path }
          : {}),
      } as TractStackRowData;

      // Update cache
      processBatchCache({
        tractStacks: [tractStack],
      });

      return tractStack;
    }
    return null;
  } catch (error) {
    console.error("Error fetching getTractStackByIdRowData:", error);
    throw error;
  }
}

export async function upsertTractStackByIdRowData(data: TractStackRowData): Promise<boolean> {
  try {
    const client = await tursoClient.getClient();
    if (!client) return false;
    await client.execute({
      sql: `INSERT INTO tractstacks (id, title, slug, social_image_path)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              title = excluded.title,
              slug = excluded.slug,
              social_image_path = excluded.social_image_path`,
      args: [data.id, data.title, data.slug, data.social_image_path || null],
    });
    return true;
  } catch (error) {
    console.error("Error in upsertTractStackByIdRowData:", error);
    throw error;
  }
}

export async function getResourceByIdRowData(id: string): Promise<ResourceRowData | null> {
  // Check cache first
  const cachedResource = getCachedResourceById(id);
  if (cachedResource) {
    return cachedResource;
  }

  try {
    const client = await tursoClient.getClient();
    if (!client) return null;
    const { rows } = await client.execute({
      sql: `SELECT id, title, slug, category_slug, oneliner, options_payload, action_lisp 
            FROM resources WHERE id = ?`,
      args: [id],
    });
    if (rows.length > 0 && rows[0].id && rows[0].title && rows[0].slug) {
      const resource = {
        id: rows[0].id,
        title: rows[0].title,
        slug: rows[0].slug,
        oneliner: rows[0].oneliner,
        options_payload: rows[0].options_payload,
        ...(typeof rows[0].category_slug === "string"
          ? { category_slug: rows[0].category_slug }
          : {}),
        ...(typeof rows[0].action_lisp === "string" ? { action_lisp: rows[0].action_lisp } : {}),
      } as ResourceRowData;

      // Update cache
      processBatchCache({
        resources: [resource],
      });

      return resource;
    }
    return null;
  } catch (error) {
    console.error("Error fetching getResourceByIdRowData:", error);
    throw error;
  }
}

export async function upsertResourceByIdRowData(data: ResourceRowData): Promise<boolean> {
  try {
    const client = await tursoClient.getClient();
    if (!client) return false;
    await client.execute({
      sql: `INSERT INTO resources (id, title, slug, category_slug, oneliner, options_payload, action_lisp)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              title = excluded.title,
              slug = excluded.slug,
              category_slug = excluded.category_slug,
              oneliner = excluded.oneliner,
              options_payload = excluded.options_payload,
              action_lisp = excluded.action_lisp`,
      args: [
        data.id,
        data.title,
        data.slug,
        data.category_slug || null,
        data.oneliner,
        data.options_payload,
        data.action_lisp || null,
      ],
    });
    return true;
  } catch (error) {
    console.error("Error in upsertResourceByIdRowData:", error);
    throw error;
  }
}

export async function getAllMenusRowData(): Promise<MenuRowData[]> {
  try {
    const client = await tursoClient.getClient();
    if (!client) return [];
    const { rows } = await client.execute(`SELECT id, title, theme, options_payload FROM menus`);
    const menus = rows
      .map((row) => {
        if (!row.id || !row.title) return null;
        return {
          id: row.id,
          title: row.title,
          theme: row.theme,
          options_payload: row.options_payload,
        } as MenuRowData;
      })
      .filter((row): row is MenuRowData => row !== null);
    processBatchCache({
      menus,
    });
    return menus;
  } catch (error) {
    console.error("Error fetching getAllMenusRowData:", error);
    throw error;
  }
}

export async function getMenuByIdRowData(id: string): Promise<MenuRowData | null> {
  // Check cache first
  const cachedMenu = getCachedMenuById(id);
  if (cachedMenu) {
    return cachedMenu;
  }

  try {
    const client = await tursoClient.getClient();
    if (!client) return null;
    const { rows } = await client.execute({
      sql: `SELECT id, title, theme, options_payload FROM menus WHERE id = ?`,
      args: [id],
    });
    if (rows.length > 0 && rows[0].id && rows[0].title) {
      const menu = {
        id: rows[0].id,
        title: rows[0].title,
        theme: rows[0].theme,
        options_payload: rows[0].options_payload,
      } as MenuRowData;

      // Update cache
      processBatchCache({
        menus: [menu],
      });

      return menu;
    }
    return null;
  } catch (error) {
    console.error("Error fetching getMenuByIdRowData:", error);
    throw error;
  }
}

export async function upsertMenuByIdRowData(data: MenuRowData): Promise<boolean> {
  try {
    const client = await tursoClient.getClient();
    if (!client) return false;
    await client.execute({
      sql: `INSERT INTO menus (id, title, theme, options_payload)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              title = excluded.title,
              theme = excluded.theme,
              options_payload = excluded.options_payload`,
      args: [data.id, data.title, data.theme, data.options_payload],
    });
    return true;
  } catch (error) {
    console.error("Error in upsertMenuByIdRowData:", error);
    throw error;
  }
}

export async function getAllFilesRowData(): Promise<ImageFileRowData[]> {
  try {
    const client = await tursoClient.getClient();
    if (!client) return [];
    const { rows } = await client.execute(
      `SELECT id, filename, alt_description, url, src_set FROM files`
    );
    const files = rows
      .map((row) => {
        if (!row.id || !row.filename) return null;
        return {
          id: row.id,
          filename: row.filename,
          alt_description: row.alt_description,
          url: row.url,
          ...(typeof row.src_set === "string" ? { src_set: row.src_set } : {}),
        } as ImageFileRowData;
      })
      .filter((row): row is ImageFileRowData => row !== null);
    processBatchCache({
      files,
    });
    return files;
  } catch (error) {
    console.error("Error fetching getAllFilesRowData:", error);
    throw error;
  }
}

export async function getFileByIdRowData(id: string): Promise<ImageFileRowData | null> {
  // Check cache first
  const cachedFile = getCachedFileById(id);
  if (cachedFile) {
    return cachedFile;
  }

  try {
    const client = await tursoClient.getClient();
    if (!client) return null;
    const { rows } = await client.execute({
      sql: `SELECT id, filename, alt_description, url, src_set FROM files WHERE id = ?`,
      args: [id],
    });
    if (rows.length > 0 && rows[0].id && rows[0].filename) {
      const file = {
        id: rows[0].id,
        filename: rows[0].filename,
        alt_description: rows[0].alt_description,
        url: rows[0].url,
        ...(typeof rows[0].src_set === "string" ? { src_set: rows[0].src_set } : {}),
      } as ImageFileRowData;

      // Update cache
      processBatchCache({
        files: [file],
      });

      return file;
    }
    return null;
  } catch (error) {
    console.error("Error fetching getFileByIdRowData:", error);
    throw error;
  }
}

export async function upsertFileByIdRowData(data: ImageFileRowData): Promise<boolean> {
  try {
    const client = await tursoClient.getClient();
    if (!client) return false;
    await client.execute({
      sql: `INSERT INTO files (id, filename, alt_description, url, src_set)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              filename = excluded.filename,
              alt_description = excluded.alt_description,
              url = excluded.url,
              src_set = excluded.src_set`,
      args: [data.id, data.filename, data.alt_description || null, data.url, data.src_set || null],
    });
    return true;
  } catch (error) {
    console.error("Error in upsertFileByIdRowData:", error);
    throw error;
  }
}

export async function getPaneByIdRowData(id: string): Promise<PaneRowData | null> {
  // Check cache first
  const cachedPane = getCachedPaneById(id);
  if (cachedPane) {
    return cachedPane;
  }

  try {
    const client = await tursoClient.getClient();
    if (!client) return null;
    const { rows } = await client.execute({
      sql: `SELECT id, title, slug, pane_type, created, changed, options_payload, is_context_pane, markdown_id 
            FROM panes WHERE id = ?`,
      args: [id],
    });
    if (rows.length > 0 && rows[0].id && rows[0].title) {
      const pane = {
        id: rows[0].id,
        title: rows[0].title,
        slug: rows[0].slug,
        pane_type: rows[0].pane_type,
        ...(typeof rows[0].markdown_id === `string` ? { markdown_id: rows[0].markdown_id } : {}),
        created: rows[0].created,
        changed: rows[0].changed,
        options_payload: rows[0].options_payload,
        is_context_pane: rows[0].is_context_pane,
      } as PaneRowData;

      // Update cache
      processBatchCache({
        panes: [pane],
      });

      return pane;
    }
    return null;
  } catch (error) {
    console.error("Error fetching getPaneByIdRowData:", error);
    throw error;
  }
}

export async function upsertPaneByIdRowData(data: PaneRowData): Promise<boolean> {
  try {
    const client = await tursoClient.getClient();
    if (!client) return false;
    await client.execute({
      sql: `INSERT INTO panes (id, title, slug, pane_type, created, changed, options_payload, is_context_pane, markdown_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              title = excluded.title,
              slug = excluded.slug,
              pane_type = excluded.pane_type,
              changed = excluded.changed,
              options_payload = excluded.options_payload,
              is_context_pane = excluded.is_context_pane,
              markdown_id = excluded.markdown_id`,
      args: [
        data.id,
        data.title,
        data.slug,
        data.pane_type,
        data.created,
        data.changed,
        data.options_payload,
        data.is_context_pane,
        data.markdown_id || null,
      ],
    });
    return true;
  } catch (error) {
    console.error("Error in upsertPaneByIdRowData:", error);
    throw error;
  }
}

export async function getMarkdownByIdRowData(id: string): Promise<MarkdownRowData | null> {
  // Check cache first
  const cachedMarkdown = getCachedMarkdownById(id);
  if (cachedMarkdown) {
    return cachedMarkdown;
  }

  try {
    const client = await tursoClient.getClient();
    if (!client) return null;
    const { rows } = await client.execute({
      sql: `SELECT id, body FROM markdowns WHERE id = ?`,
      args: [id],
    });
    if (rows.length > 0 && rows[0].id) {
      const markdown = {
        id: rows[0].id,
        markdown_body: rows[0].body,
      } as MarkdownRowData;

      // Update cache
      processBatchCache({
        markdowns: [markdown],
      });

      return markdown;
    }
    return null;
  } catch (error) {
    console.error("Error fetching getMarkdownByIdRowData:", error);
    throw error;
  }
}

export async function upsertMarkdownRowData(id: string, markdown_body: string): Promise<boolean> {
  try {
    const client = await tursoClient.getClient();
    if (!client) return false;
    await client.execute({
      sql: `INSERT INTO markdowns (id, body) 
            VALUES (?, ?)
            ON CONFLICT(id) DO UPDATE SET
              body = excluded.body`,
      args: [id, markdown_body],
    });
    return true;
  } catch (error) {
    console.error("Error in upsertMarkdownRowData:", error);
    throw error;
  }
}

export async function upsertPaneFileRelation(pane_id: string, file_id: string): Promise<boolean> {
  try {
    const client = await tursoClient.getClient();
    if (!client) return false;
    await client.execute({
      sql: `INSERT INTO file_panes (file_id, pane_id)
            VALUES (?, ?)
            ON CONFLICT(file_id, pane_id) DO NOTHING`,
      args: [file_id, pane_id],
    });
    return true;
  } catch (error) {
    console.error("Error in upsertPaneFileRelation:", error);
    throw error;
  }
}

export async function getCachedStoryFragmentByIdRowData(
  id: string
): Promise<StoryFragmentRowData | null> {
  // Check cache first
  const cached = getCachedStoryFragmentById(id);
  if (cached) return cached;

  try {
    const client = await tursoClient.getClient();
    if (!client) return null;

    // Get the storyfragment base data
    const { rows } = await client.execute({
      sql: `SELECT id, title, slug, tractstack_id, created, changed, menu_id, 
            social_image_path, tailwind_background_colour 
            FROM storyfragments WHERE id = ?`,
      args: [id],
    });

    if (rows.length === 0 || !rows[0].id) return null;

    // Get the related pane IDs ordered by weight
    const { rows: paneRows } = await client.execute({
      sql: `SELECT pane_id FROM storyfragment_panes 
            WHERE storyfragment_id = ? 
            ORDER BY weight ASC`,
      args: [id],
    });

    const pane_ids = paneRows.map((row) => row.pane_id);

    const storyFragment = {
      id: rows[0].id,
      title: rows[0].title,
      slug: rows[0].slug,
      tractstack_id: rows[0].tractstack_id,
      created: rows[0].created,
      changed: rows[0].changed,
      pane_ids,
      ...(typeof rows[0].menu_id === "string" ? { menu_id: rows[0].menu_id } : {}),
      ...(typeof rows[0].social_image_path === "string"
        ? { social_image_path: rows[0].social_image_path }
        : {}),
      ...(typeof rows[0].tailwind_background_colour === "string"
        ? { tailwind_background_colour: rows[0].tailwind_background_colour }
        : {}),
    } as StoryFragmentRowData;

    // Update cache
    processBatchCache({
      storyFragments: [storyFragment],
    });

    return storyFragment;
  } catch (error) {
    console.error("Error fetching getStoryFragmentByIdRowData:", error);
    throw error;
  }
}

export async function upsertStoryFragmentByIdRowData(data: StoryFragmentRowData): Promise<boolean> {
  try {
    const client = await tursoClient.getClient();
    if (!client) return false;

    // First insert/update the storyfragment
    await client.execute({
      sql: `INSERT INTO storyfragments 
            (id, title, slug, tractstack_id, created, changed, tailwind_background_colour, menu_id, social_image_path)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            slug = excluded.slug,
            tractstack_id = excluded.tractstack_id,
            created = excluded.created,
            changed = excluded.changed,
            tailwind_background_colour = excluded.tailwind_background_colour,
            menu_id = excluded.menu_id,
            social_image_path = excluded.social_image_path`,
      args: [
        data.id,
        data.title,
        data.slug,
        data.tractstack_id,
        data.created,
        data.changed,
        data.tailwind_background_colour || null,
        data.menu_id || null,
        data.social_image_path || null,
      ],
    });

    // Clear existing pane relationships
    await client.execute({
      sql: "DELETE FROM storyfragment_panes WHERE storyfragment_id = ?",
      args: [data.id],
    });

    // Add new pane relationships if they exist
    if (data.pane_ids && data.pane_ids.length > 0) {
      for (const paneId of data.pane_ids) {
        await client.execute({
          sql: "INSERT INTO storyfragment_panes (storyfragment_id, pane_id, weight) VALUES (?, ?, ?)",
          args: [data.id, paneId, data.pane_ids.indexOf(paneId) + 1],
        });
      }
    }

    return true;
  } catch (error) {
    console.error("Error in upsertStoryFragmentByIdRowData:", error);
    throw error;
  }
}

export async function getStoryFragmentBySlugFullRowData(
  slug: string
): Promise<StoryFragmentFullRowData | null> {
  // Check cache first
  const storyFragment = getCachedStoryFragmentBySlug(slug);
  if (storyFragment) {
    // Need to verify we have all related data
    const tractstack = getCachedTractStackById(storyFragment.tractstack_id);
    const menu = storyFragment.menu_id ? getCachedMenuById(storyFragment.menu_id) : null;
    const panes = storyFragment.pane_ids.map((id) => getCachedPaneById(id));
    const markdowns: MarkdownRowData[] = [];

    // Check if we have all panes and their related data
    const allPanesFound = panes.every((pane) => {
      if (!pane) return false;
      // Check markdown if exists
      if (pane.markdown_id) {
        const markdown = getCachedMarkdownById(pane.markdown_id);
        if (!markdown) return false;
        markdowns.push(markdown);
      }
      // TODO: Check files for each pane
      // Would need to parse options_payload to get file IDs
      // but we don't actually need the file ids in the tree
      // so better to remove from query altogether
      // same with markdown i believe
      return true;
    });

    if (tractstack && (!storyFragment.menu_id || menu) && allPanesFound) {
      return {
        storyfragment: storyFragment,
        tractstack,
        menu,
        panes: panes.filter((p): p is PaneRowData => p !== null),
        markdowns,
      };
    }
  }

  // else load from Turso
  try {
    const client = await tursoClient.getClient();
    if (!client) return null;

    // First get story fragment data with tractstack and menu in a single query
    const { rows: sfRows } = await client.execute({
      sql: `
        WITH ordered_panes AS (
          SELECT 
            p.*,
            sp.weight,
            m.body as markdown_body
          FROM storyfragment_panes sp
          JOIN panes p ON sp.pane_id = p.id
          LEFT JOIN markdowns m ON p.markdown_id = m.id
          WHERE sp.storyfragment_id = (
            SELECT id FROM storyfragments WHERE slug = ?
          )
          ORDER BY sp.weight ASC
        )
        SELECT 
          sf.id, sf.title, sf.slug, sf.tractstack_id, 
          sf.created, sf.changed, sf.menu_id,
          sf.social_image_path, sf.tailwind_background_colour,
          ts.id as ts_id, ts.title as ts_title, ts.slug as ts_slug,
          ts.social_image_path as ts_social_image_path,
          m.id as menu_id, m.title as menu_title, m.theme as menu_theme, 
          m.options_payload as menu_options_payload,
          json_group_array(
            json_object(
              'id', op.id,
              'title', op.title,
              'slug', op.slug,
              'pane_type', op.pane_type,
              'created', op.created,
              'changed', op.changed,
              'options_payload', op.options_payload,
              'is_context_pane', op.is_context_pane,
              'markdown_id', op.markdown_id,
              'markdown_body', op.markdown_body,
              'weight', op.weight
            )
          ) as panes_data
        FROM storyfragments sf
        JOIN tractstacks ts ON sf.tractstack_id = ts.id
        LEFT JOIN menus m ON sf.menu_id = m.id
        LEFT JOIN ordered_panes op
        WHERE sf.slug = ?
        GROUP BY sf.id
      `,
      args: [slug, slug],
    });

    if (sfRows.length === 0) return null;

    const sfRow = sfRows[0];

    // Create base story fragment data
    const storyFragment: StoryFragmentRowData = {
      id: String(sfRow.id),
      title: String(sfRow.title),
      slug: String(sfRow.slug),
      tractstack_id: String(sfRow.tractstack_id),
      created: String(sfRow.created),
      changed: String(sfRow.changed || sfRow.created),
      pane_ids: [], // Will be populated from panes data
      ...(sfRow.menu_id && { menu_id: String(sfRow.menu_id) }),
      ...(sfRow.social_image_path && { social_image_path: String(sfRow.social_image_path) }),
      ...(sfRow.tailwind_background_colour && {
        tailwind_background_colour: String(sfRow.tailwind_background_colour),
      }),
    };

    // Create tractstack data
    const tractstack: TractStackRowData = {
      id: String(sfRow.ts_id),
      title: String(sfRow.ts_title),
      slug: String(sfRow.ts_slug),
      ...(sfRow.ts_social_image_path && {
        social_image_path: String(sfRow.ts_social_image_path),
      }),
    };

    // Create menu data if exists
    let menu: MenuRowData | null = null;
    if (sfRow.menu_id) {
      menu = {
        id: String(sfRow.menu_id),
        title: String(sfRow.menu_title),
        theme: String(sfRow.menu_theme),
        options_payload: String(sfRow.menu_options_payload),
      };
    }

    const rawPanesData = sfRow.panes_data ? JSON.parse(String(sfRow.panes_data)) : [];
    const panesData = rawPanesData.filter(
      (item: EnrichedPaneRowData) => item.id !== null || item.slug !== null
    );
    const panes: PaneRowData[] = [];
    const markdowns: MarkdownRowData[] = [];

    // Process each pane and its related data
    panesData.forEach((paneData: EnrichedPaneRowData) => {
      // Add pane (only include PaneRowData fields)
      panes.push({
        id: String(paneData.id),
        title: String(paneData.title),
        slug: String(paneData.slug),
        pane_type: String(paneData.pane_type),
        created: String(paneData.created),
        changed: String(paneData.changed || paneData.created),
        options_payload: String(paneData.options_payload),
        is_context_pane: Number(paneData.is_context_pane),
        ...(paneData.markdown_id && { markdown_id: String(paneData.markdown_id) }),
      });

      // Add to story fragment pane IDs
      if (paneData.id) storyFragment.pane_ids.push(String(paneData.id));

      // Add markdown if exists
      if (paneData.markdown_id && paneData.markdown_body) {
        markdowns.push({
          id: String(paneData.markdown_id),
          markdown_body: String(paneData.markdown_body),
        });
      }
    });

    // Cache all the data before returning
    processBatchCache({
      storyFragments: [storyFragment],
      tractStacks: [tractstack],
      menus: menu ? [menu] : undefined,
      panes,
      markdowns,
    });

    return {
      storyfragment: storyFragment,
      tractstack,
      menu,
      panes,
      markdowns,
    };
  } catch (error) {
    console.error("Error in getStoryFragmentBySlugFullRowData:", error);
    throw error;
  }
}

export async function getFullContentMap(): Promise<FullContentMap[]> {
  // Check cache first
  const cachedContent = getCachedContentMap();
  if (cachedContent) {
    return cachedContent;
  }
  try {
    const client = await tursoClient.getClient();
    if (!client) return [];

    const queryParts = [
      `SELECT id, id as slug, title, 'Menu' as type, theme as extra, NULL as parent_id, NULL as parent_title, NULL as parent_slug, NULL as pane_ids 
       FROM menus`,

      `SELECT id, slug, title, 'Pane' as type, is_context_pane as extra, NULL as parent_id, NULL as parent_title, NULL as parent_slug, NULL as pane_ids 
       FROM panes`,

      `SELECT id, slug, title, 'Resource' as type, category_slug as extra, NULL as parent_id, NULL as parent_title, NULL as parent_slug, NULL as pane_ids 
       FROM resources`,

      `SELECT 
         sf.id, 
         sf.slug, 
         sf.title, 
         'StoryFragment' as type, 
         sf.social_image_path as extra,
         ts.id as parent_id,
         ts.title as parent_title,
         ts.slug as parent_slug,
         (
           SELECT GROUP_CONCAT(pane_id)
           FROM storyfragment_panes sp
           WHERE sp.storyfragment_id = sf.id
         ) as pane_ids
       FROM storyfragments sf
       JOIN tractstacks ts ON sf.tractstack_id = ts.id`,

      `SELECT id, slug, title, 'TractStack' as type, social_image_path as extra, NULL as parent_id, NULL as parent_title, NULL as parent_slug, NULL as pane_ids 
       FROM tractstacks`,

      `SELECT id, slug, 'Belief' as title, 'Belief' as type, scale as extra, NULL as parent_id, NULL as parent_title, NULL as parent_slug, NULL as pane_ids 
       FROM beliefs`,
    ];

    const { rows } = await client.execute(queryParts.join(" UNION ALL ") + " ORDER BY title");

    const mappedData = rows.map((row) => {
      const base = {
        id: ensureString(row.id),
        title: ensureString(row.title),
        slug: ensureString(row.slug),
      };

      switch (ensureString(row.type)) {
        case "Menu":
          return {
            ...base,
            type: "Menu" as const,
            theme: ensureString(row.extra),
          } as MenuContentMap;
        case "Resource":
          return {
            ...base,
            type: "Resource" as const,
            categorySlug: row.extra as string | null,
          } as ResourceContentMap;
        case "Pane":
          return {
            ...base,
            type: "Pane" as const,
            isContext: Boolean(row.extra),
          } as PaneContentMap;
        case "StoryFragment":
          return {
            ...base,
            type: "StoryFragment" as const,
            ...(row.extra && { socialImagePath: String(row.extra) }),
            ...(row.parent_id && {
              parentId: String(row.parent_id),
              parentTitle: String(row.parent_title),
              parentSlug: String(row.parent_slug),
            }),
            ...(row.pane_ids && {
              panes: String(row.pane_ids).split(","),
            }),
          } as StoryFragmentContentMap;
        case "TractStack":
          return {
            ...base,
            type: "TractStack" as const,
            ...(row.extra && { socialImagePath: String(row.extra) }),
          } as TractStackContentMap;
        case "Belief":
          return {
            ...base,
            type: "Belief" as const,
            scale: ensureString(row.extra),
          } as BeliefContentMap;
        default:
          throw new Error(`Unknown type: ${row.type}`);
      }
    });
    setCachedContentMap(mappedData);
    return mappedData;
  } catch (error) {
    console.log("Unable to fetch content map:", error);
    return [];
  }
}

export async function getAllResourcesRowData(): Promise<ResourceRowData[]> {
  try {
    const client = await tursoClient.getClient();
    if (!client) return [];
    const { rows } = await client.execute(
      `SELECT id, title, slug, category_slug, oneliner, options_payload, action_lisp
            FROM resources`
    );
    const resources = rows.map(
      (row) =>
        ({
          id: ensureString(row.id),
          title: ensureString(row.title),
          slug: ensureString(row.slug),
          oneliner: ensureString(row.oneliner),
          options_payload: ensureString(row.options_payload),
          ...(typeof row.category_slug === "string" ? { category_slug: row.category_slug } : {}),
          ...(typeof row.action_lisp === "string" ? { action_lisp: row.action_lisp } : {}),
        }) as ResourceRowData
    );
    processBatchCache({
      resources,
    });
    return resources;
  } catch (error) {
    console.error("Error fetching getAllResourcesRowData:", error);
    throw error;
  }
}

export async function getResourcesByCategorySlugRowData(
  categorySlug: string
): Promise<ResourceRowData[]> {
  try {
    const client = await tursoClient.getClient();
    if (!client) return [];

    const { rows } = await client.execute({
      sql: `SELECT id, title, slug, category_slug, oneliner, options_payload, action_lisp
            FROM resources 
            WHERE category_slug = ?`,
      args: [categorySlug],
    });

    return rows.map(
      (row) =>
        ({
          id: ensureString(row.id),
          title: ensureString(row.title),
          slug: ensureString(row.slug),
          oneliner: ensureString(row.oneliner),
          options_payload: ensureString(row.options_payload),
          ...(typeof row.category_slug === "string" ? { category_slug: row.category_slug } : {}),
          ...(typeof row.action_lisp === "string" ? { action_lisp: row.action_lisp } : {}),
        }) as ResourceRowData
    );
  } catch (error) {
    console.error("Error fetching resources by category slug:", error);
    throw error;
  }
}

export async function getResourcesBySlugsRowData(slugs: string[]): Promise<ResourceRowData[]> {
  try {
    const client = await tursoClient.getClient();
    if (!client) return [];

    // Create placeholders for the IN clause
    const placeholders = slugs.map(() => "?").join(",");

    const { rows } = await client.execute({
      sql: `SELECT id, title, slug, category_slug, oneliner, options_payload, action_lisp
            FROM resources 
            WHERE slug IN (${placeholders})`,
      args: slugs,
    });

    // Transform each row into a ResourceRowData
    return rows.map(
      (row) =>
        ({
          id: ensureString(row.id),
          title: ensureString(row.title),
          slug: ensureString(row.slug),
          oneliner: ensureString(row.oneliner),
          options_payload: ensureString(row.options_payload),
          ...(typeof row.category_slug === "string" ? { category_slug: row.category_slug } : {}),
          ...(typeof row.action_lisp === "string" ? { action_lisp: row.action_lisp } : {}),
        }) as ResourceRowData
    );
  } catch (error) {
    console.error("Error fetching resources by slugs:", error);
    return [];
  }
}

export async function getResourceBySlugRowData(slug: string): Promise<ResourceRowData | null> {
  try {
    const client = await tursoClient.getClient();
    if (!client) return null;

    const { rows } = await client.execute({
      sql: `SELECT id, title, slug, category_slug, oneliner, options_payload, action_lisp
            FROM resources 
            WHERE slug = ?`,
      args: [slug],
    });

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      id: ensureString(row.id),
      title: ensureString(row.title),
      slug: ensureString(row.slug),
      oneliner: ensureString(row.oneliner),
      options_payload: ensureString(row.options_payload),
      ...(typeof row.category_slug === "string" ? { category_slug: row.category_slug } : {}),
      ...(typeof row.action_lisp === "string" ? { action_lisp: row.action_lisp } : {}),
    } as ResourceRowData;
  } catch (error) {
    console.error("Error fetching resource by slug:", error);
    throw error;
  }
}

export async function getContextPaneBySlugFullRowData(
  slug: string
): Promise<ContextPaneFullRowData | null> {
  // Check cache first
  const pane = getCachedPaneBySlug(slug);
  if (pane && pane.is_context_pane) {
    // Need to verify we have all related data
    const markdowns: MarkdownRowData[] = [];
    let allDependenciesFound = true;

    // Check markdown if exists
    if (pane.markdown_id) {
      const markdown = getCachedMarkdownById(pane.markdown_id);
      if (!markdown) {
        allDependenciesFound = false;
      } else {
        markdowns.push(markdown);
      }
    }

    // Parse options_payload to check for file dependencies
    const files: ImageFileRowData[] = [];
    try {
      const options = JSON.parse(pane.options_payload);
      // Look for file references in nodes
      if (options.nodes) {
        const fileIds = new Set<string>();
        // Recursively find file IDs in nodes
        const findFileIds = (nodes: any[]) => {
          nodes.forEach((node) => {
            if (node.fileId) fileIds.add(node.fileId);
            if (node.nodes) findFileIds(node.nodes);
          });
        };
        findFileIds(options.nodes);

        // Check if all files are in cache
        for (const fileId of fileIds) {
          const file = getCachedFileById(fileId);
          if (!file) {
            allDependenciesFound = false;
            break;
          } else {
            files.push(file);
          }
        }
      }
    } catch (e) {
      console.error("Error parsing options_payload:", e);
      allDependenciesFound = false;
    }

    if (allDependenciesFound) {
      return {
        panes: [pane],
        markdowns,
        files,
      };
    }
  }

  // Cache miss or missing dependencies - load from Turso
  try {
    const client = await tursoClient.getClient();
    if (!client) return null;

    // Get the context pane with all related data in a single query
    const { rows: paneRows } = await client.execute({
      sql: `SELECT 
              p.id, 
              p.title,
              p.slug,
              p.pane_type,
              p.created,
              p.changed,
              p.options_payload,
              p.is_context_pane,
              p.markdown_id,
              m.body as markdown_body,
              (
                SELECT json_group_array(
                  json_object(
                    'id', f.id,
                    'filename', f.filename,
                    'alt_description', f.alt_description,
                    'url', f.url,
                    'src_set', f.src_set
                  )
                )
                FROM file_panes fp
                JOIN files f ON fp.file_id = f.id
                WHERE fp.pane_id = p.id
              ) as files
            FROM panes p
            LEFT JOIN markdowns m ON p.markdown_id = m.id
            WHERE p.slug = ? AND p.is_context_pane = 1
            LIMIT 1`,
      args: [slug],
    });

    if (paneRows.length === 0) return null;

    const paneRow = paneRows[0];

    // Convert to PaneRowData
    const panes: PaneRowData[] = [
      {
        id: ensureString(paneRow.id),
        title: ensureString(paneRow.title),
        slug: ensureString(paneRow.slug),
        pane_type: ensureString(paneRow.pane_type),
        created: ensureString(paneRow.created),
        changed: ensureString(paneRow.changed || paneRow.created),
        options_payload: ensureString(paneRow.options_payload),
        is_context_pane: 1,
        ...(paneRow.markdown_id ? { markdown_id: ensureString(paneRow.markdown_id) } : {}),
      },
    ];

    // Process markdown
    const markdowns: MarkdownRowData[] = [];
    if (paneRow.markdown_id && paneRow.markdown_body) {
      markdowns.push({
        id: ensureString(paneRow.markdown_id),
        markdown_body: ensureString(paneRow.markdown_body),
      });
    }

    // Process files
    let files: ImageFileRowData[] = [];
    if (paneRow.files && typeof paneRow.files === "string") {
      try {
        const filesArray = JSON.parse(paneRow.files);
        files = filesArray.map((file: ImageFileRowData) => ({
          id: ensureString(file.id),
          filename: ensureString(file.filename),
          alt_description: ensureString(file.alt_description),
          url: ensureString(file.url),
          ...(file.src_set ? { src_set: ensureString(file.src_set) } : {}),
        }));
      } catch (e) {
        console.error("Error parsing files JSON:", e);
      }
    }

    // Update cache with all fetched data
    processBatchCache({
      panes,
      markdowns,
      files,
    });

    return {
      panes,
      markdowns,
      files,
    };
  } catch (error) {
    console.error("Error in getContextPaneBySlugFullRowData:", error);
    throw error;
  }
}

export async function getAllBeliefRowData(): Promise<BeliefRowData[]> {
  try {
    const client = await tursoClient.getClient();
    if (!client) return [];
    const { rows } = await client.execute(`
      SELECT id, title, slug, scale, custom_values 
      FROM beliefs
    `);
    const beliefs = rows.map((row) => ({
      id: row.id as string,
      title: row.title as string,
      slug: row.slug as string,
      scale: row.scale as string,
      custom_values: row.custom_values as string | undefined,
    }));
    processBatchCache({
      beliefs,
    });
    return beliefs;
  } catch (error) {
    console.error("Error fetching getAllBeliefRowData:", error);
    throw error;
  }
}

export async function getBeliefByIdRowData(id: string): Promise<BeliefRowData | null> {
  // Check cache first
  const cachedBelief = getCachedBeliefById(id);
  if (cachedBelief) {
    return cachedBelief;
  }

  try {
    const client = await tursoClient.getClient();
    if (!client) return null;
    const { rows } = await client.execute({
      sql: `SELECT id, title, slug, scale, custom_values 
            FROM beliefs WHERE id = ?`,
      args: [id],
    });
    if (rows.length > 0 && rows[0].id && rows[0].title) {
      const belief = {
        id: rows[0].id,
        title: rows[0].title,
        slug: rows[0].slug,
        scale: rows[0].scale,
        ...(typeof rows[0].custom_values === "string"
          ? { custom_values: rows[0].custom_values }
          : {}),
      } as BeliefRowData;

      // Update cache
      processBatchCache({
        beliefs: [belief],
      });

      return belief;
    }
    return null;
  } catch (error) {
    console.error("Error fetching getBeliefByIdRowData:", error);
    throw error;
  }
}

export async function initializeContent(): Promise<void> {
  const client = await tursoClient.getClient();
  if (client) {
    try {
      // Create tractstack first and get its id
      const tractStackId = ulid();
      await client.execute({
        sql: "INSERT INTO tractstacks (id, title, slug, social_image_path) VALUES (?, ?, ?, ?) ON CONFLICT (slug) DO NOTHING",
        args: [tractStackId, "Tract Stack", "HELLO", ""],
      });
      // Create storyfragment linked to the tractstack
      const storyFragmentId = ulid();
      const now = new Date().toISOString();
      await client.execute({
        sql: `INSERT INTO storyfragments (
                id, 
                title, 
                slug, 
                tractstack_id, 
                created, 
                changed, 
                menu_id, 
                social_image_path, 
                tailwind_background_colour
              ) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) 
              ON CONFLICT (slug) DO NOTHING`,
        args: [
          storyFragmentId, // id
          "", // title
          "hello", // slug
          tractStackId, // tractstack_id
          now, // created
          now, // changed
          null, // menu_id
          null, // social_image_path
          null, // tailwind_background_colour
        ],
      });
    } catch (error) {
      console.error("Content initialization error:", error);
      throw error;
    }
  }
}

export async function getUniqueTailwindClasses() {
  try {
    const client = await tursoClient.getClient();
    if (!client) return [];
    const { rows } = await client.execute(`SELECT id, options_payload FROM panes`);
    return getTailwindWhitelist(rows);
  } catch (error) {
    console.error("Error fetching pane payloads:", error);
    throw error;
  }
}

export async function getSiteMap(): Promise<SiteMap[]> {
  try {
    const client = await tursoClient.getClient();
    if (!client) return [];

    const results = await Promise.all([
      client.execute(
        `SELECT 
          id, title, slug, 'StoryFragment' as type
          FROM storyfragments`
      ),
      client.execute({
        sql: `SELECT id,title,slug,is_context_pane FROM panes WHERE is_context_pane = ?`,
        args: [1],
      }),
    ]);
    const [storyFragments, panes] = results;

    // Combine and transform all results
    const siteMap: SiteMap[] = [
      // Add StoryFragments
      ...storyFragments.rows.map((row: any) => ({
        id: row.id,
        title: row.title,
        slug: row.slug,
        type: "StoryFragment" as const,
        created: new Date(row.created || Date.now()),
        changed: row.changed ? new Date(row.changed) : null,
      })),
      // Add Panes
      ...panes.rows.map((row: any) => ({
        id: row.id,
        title: row.title,
        slug: row.slug,
        type: "Pane" as const,
        isContextPane: row.is_context_pane === 1,
        created: new Date(row.created || Date.now()),
        changed: row.changed ? new Date(row.changed) : null,
      })),
    ];
    return siteMap;
  } catch (error) {
    console.log("Unable to fetch site map:", error);
    return [];
  }
}
