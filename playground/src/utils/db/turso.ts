import path from "path";
import { ulid } from "ulid";
import { tursoClient } from "./client";
import { getTailwindWhitelist } from "../tailwind/getTailwindWhitelist";
import {
  invalidateEntry,
  setCachedContentMap,
  getCachedContentMap,
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
  EpinetContentMap,
  Topic,
  TopicContentMap,
  APIContext,
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

// Helper to ensure a value is a string
function ensureString(value: unknown): string {
  if (value === null || value === undefined) {
    throw new Error("Required string value is null or undefined");
  }
  return String(value);
}

// Fetch all TractStacks
export async function getAllTractStackRowData(context?: APIContext): Promise<TractStackRowData[]> {
  const tenantId = context?.locals?.tenant?.id || "default";
  const isMultiTenant =
    import.meta.env.PUBLIC_ENABLE_MULTI_TENANT === "true" && tenantId !== `default`;

  try {
    const client = await tursoClient.getClient(context);
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

    // Update cache only if not in multi-tenant mode
    if (!isMultiTenant) {
      processBatchCache({ tractStacks });
    }
    return tractStacks;
  } catch (error) {
    console.error("Error fetching getAllTractStackRowData:", error);
    throw error;
  }
}

// Fetch TractStack by slug
export async function getTractStackBySlugRowData(
  slug: string,
  context?: APIContext
): Promise<TractStackRowData | null> {
  const tenantId = context?.locals?.tenant?.id || "default";
  const isMultiTenant =
    import.meta.env.PUBLIC_ENABLE_MULTI_TENANT === "true" && tenantId !== `default`;

  // Check cache only if not in multi-tenant mode
  if (!isMultiTenant) {
    const cachedTractStack = getCachedTractStackBySlug(slug);
    if (cachedTractStack) return cachedTractStack;
  }

  try {
    const client = await tursoClient.getClient(context);
    if (!client) return null;
    const { rows } = await client.execute({
      sql: `SELECT id, title, slug, social_image_path FROM tractstacks WHERE slug = ?`,
      args: [slug],
    });
    if (rows.length > 0 && rows[0].id && rows[0].title && rows[0].slug) {
      const tractStack = {
        id: rows[0].id,
        title: rows[0].title,
        slug: rows[0].slug,
        ...(typeof rows[0].social_image_path === "string"
          ? { social_image_path: rows[0].social_image_path }
          : {}),
      } as TractStackRowData;

      // Update cache only if not in multi-tenant mode
      if (!isMultiTenant) {
        processBatchCache({ tractStacks: [tractStack] });
      }
      return tractStack;
    }
    return null;
  } catch (error) {
    console.error("Error fetching getTractStackBySlugRowData:", error);
    throw error;
  }
}

// Fetch TractStack by ID
export async function getTractStackByIdRowData(
  id: string,
  context?: APIContext
): Promise<TractStackRowData | null> {
  const tenantId = context?.locals?.tenant?.id || "default";
  const isMultiTenant =
    import.meta.env.PUBLIC_ENABLE_MULTI_TENANT === "true" && tenantId !== `default`;

  // Check cache only if not in multi-tenant mode
  if (!isMultiTenant) {
    const cached = getCachedTractStackById(id);
    if (cached) return cached;
  }

  try {
    const client = await tursoClient.getClient(context);
    if (!client) return null;
    const { rows } = await client.execute({
      sql: `SELECT id, title, slug, social_image_path FROM tractstacks WHERE id = ?`,
      args: [id],
    });
    if (rows.length > 0 && rows[0].id && rows[0].title && rows[0].slug) {
      const tractStack = {
        id: rows[0].id,
        title: rows[0].title,
        slug: rows[0].slug,
        ...(typeof rows[0].social_image_path === "string"
          ? { social_image_path: rows[0].social_image_path }
          : {}),
      } as TractStackRowData;

      // Update cache only if not in multi-tenant mode
      if (!isMultiTenant) {
        processBatchCache({ tractStacks: [tractStack] });
      }
      return tractStack;
    }
    return null;
  } catch (error) {
    console.error("Error fetching getTractStackByIdRowData:", error);
    throw error;
  }
}

// Upsert TractStack by ID
export async function upsertTractStackByIdRowData(
  data: TractStackRowData,
  context?: APIContext
): Promise<boolean> {
  const tenantId = context?.locals?.tenant?.id || "default";
  const isMultiTenant =
    import.meta.env.PUBLIC_ENABLE_MULTI_TENANT === "true" && tenantId !== `default`;

  try {
    const client = await tursoClient.getClient(context);
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

    // Invalidate cache only if not in multi-tenant mode
    if (!isMultiTenant) {
      invalidateEntry("tractstack", data.id);
      setCachedContentMap([]);
    }
    return true;
  } catch (error) {
    console.error("Error in upsertTractStackByIdRowData:", error);
    throw error;
  }
}

// Fetch Resource by ID
export async function getResourceByIdRowData(
  id: string,
  context?: APIContext
): Promise<ResourceRowData | null> {
  const tenantId = context?.locals?.tenant?.id || "default";
  const isMultiTenant =
    import.meta.env.PUBLIC_ENABLE_MULTI_TENANT === "true" && tenantId !== `default`;

  // Check cache only if not in multi-tenant mode
  if (!isMultiTenant) {
    const cachedResource = getCachedResourceById(id);
    if (cachedResource) return cachedResource;
  }

  try {
    const client = await tursoClient.getClient(context);
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

      // Update cache only if not in multi-tenant mode
      if (!isMultiTenant) {
        processBatchCache({ resources: [resource] });
      }
      return resource;
    }
    return null;
  } catch (error) {
    console.error("Error fetching getResourceByIdRowData:", error);
    throw error;
  }
}

// Upsert Resource by ID
export async function upsertResourceByIdRowData(
  data: ResourceRowData,
  context?: APIContext
): Promise<boolean> {
  const tenantId = context?.locals?.tenant?.id || "default";
  const isMultiTenant =
    import.meta.env.PUBLIC_ENABLE_MULTI_TENANT === "true" && tenantId !== `default`;
  try {
    const client = await tursoClient.getClient(context);
    if (!client) return false;

    // Check if resource exists by slug
    const { rows: existingRows } = await client.execute({
      sql: `SELECT id FROM resources WHERE slug = ?`,
      args: [data.slug],
    });

    // Use existing ID if found, otherwise use provided ID
    const targetId = existingRows.length > 0 ? (existingRows[0].id as string) : data.id;

    await client.execute({
      sql: `INSERT INTO resources (id, title, slug, oneliner, options_payload, category_slug, action_lisp)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              title = excluded.title,
              slug = excluded.slug,
              oneliner = excluded.oneliner,
              options_payload = excluded.options_payload,
              category_slug = excluded.category_slug,
              action_lisp = excluded.action_lisp`,
      args: [
        targetId,
        data.title,
        data.slug,
        data.oneliner,
        data.options_payload,
        data.category_slug || null,
        data.action_lisp || null,
      ],
    });

    // Invalidate cache only if not in multi-tenant mode
    if (!isMultiTenant) {
      invalidateEntry("resource", targetId);
      setCachedContentMap([]);
    }
    return true;
  } catch (error) {
    console.error("Error in upsertResourceByIdRowData:", error);
    throw error;
  }
}

// Fetch all Menus
export async function getAllMenusRowData(context?: APIContext): Promise<MenuRowData[]> {
  const tenantId = context?.locals?.tenant?.id || "default";
  const isMultiTenant =
    import.meta.env.PUBLIC_ENABLE_MULTI_TENANT === "true" && tenantId !== `default`;

  try {
    const client = await tursoClient.getClient(context);
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

    // Update cache only if not in multi-tenant mode
    if (!isMultiTenant) {
      processBatchCache({ menus });
    }
    return menus;
  } catch (error) {
    console.error("Error fetching getAllMenusRowData:", error);
    throw error;
  }
}

// Fetch Menu by ID
export async function getMenuByIdRowData(
  id: string,
  context?: APIContext
): Promise<MenuRowData | null> {
  const tenantId = context?.locals?.tenant?.id || "default";
  const isMultiTenant =
    import.meta.env.PUBLIC_ENABLE_MULTI_TENANT === "true" && tenantId !== `default`;

  // Check cache only if not in multi-tenant mode
  if (!isMultiTenant) {
    const cachedMenu = getCachedMenuById(id);
    if (cachedMenu) return cachedMenu;
  }

  try {
    const client = await tursoClient.getClient(context);
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

      // Update cache only if not in multi-tenant mode
      if (!isMultiTenant) {
        processBatchCache({ menus: [menu] });
      }
      return menu;
    }
    return null;
  } catch (error) {
    console.error("Error fetching getMenuByIdRowData:", error);
    throw error;
  }
}

// Upsert Menu by ID
export async function upsertMenuByIdRowData(
  data: MenuRowData,
  context?: APIContext
): Promise<boolean> {
  const tenantId = context?.locals?.tenant?.id || "default";
  const isMultiTenant =
    import.meta.env.PUBLIC_ENABLE_MULTI_TENANT === "true" && tenantId !== `default`;

  try {
    const client = await tursoClient.getClient(context);
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

    // Invalidate cache only if not in multi-tenant mode
    if (!isMultiTenant) {
      invalidateEntry("menu", data.id);
      setCachedContentMap([]);
    }
    return true;
  } catch (error) {
    console.error("Error in upsertMenuByIdRowData:", error);
    throw error;
  }
}

// Fetch all Files
export async function getAllFilesRowData(context?: APIContext): Promise<ImageFileRowData[]> {
  const tenantId = context?.locals?.tenant?.id || "default";
  const isMultiTenant =
    import.meta.env.PUBLIC_ENABLE_MULTI_TENANT === "true" && tenantId !== `default`;

  try {
    const client = await tursoClient.getClient(context);
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

    // Update cache only if not in multi-tenant mode
    if (!isMultiTenant) {
      processBatchCache({ files });
    }
    return files;
  } catch (error) {
    console.error("Error fetching getAllFilesRowData:", error);
    throw error;
  }
}

// Fetch File by ID
export async function getFileByIdRowData(
  id: string,
  context?: APIContext
): Promise<ImageFileRowData | null> {
  const tenantId = context?.locals?.tenant?.id || "default";
  const isMultiTenant =
    import.meta.env.PUBLIC_ENABLE_MULTI_TENANT === "true" && tenantId !== `default`;

  // Check cache only if not in multi-tenant mode
  if (!isMultiTenant) {
    const cachedFile = getCachedFileById(id);
    if (cachedFile) return cachedFile;
  }

  try {
    const client = await tursoClient.getClient(context);
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

      // Update cache only if not in multi-tenant mode
      if (!isMultiTenant) {
        processBatchCache({ files: [file] });
      }
      return file;
    }
    return null;
  } catch (error) {
    console.error("Error fetching getFileByIdRowData:", error);
    throw error;
  }
}

// Upsert File by ID
export async function upsertFileByIdRowData(
  data: ImageFileRowData,
  context?: APIContext
): Promise<boolean> {
  const tenantId = context?.locals?.tenant?.id || "default";
  const isMultiTenant =
    import.meta.env.PUBLIC_ENABLE_MULTI_TENANT === "true" && tenantId !== `default`;

  try {
    const client = await tursoClient.getClient(context);
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

    // Invalidate cache only if not in multi-tenant mode
    if (!isMultiTenant) {
      invalidateEntry("file", data.id);
      setCachedContentMap([]);
    }
    return true;
  } catch (error) {
    console.error("Error in upsertFileByIdRowData:", error);
    throw error;
  }
}

// Fetch Pane by ID
export async function getPaneByIdRowData(
  id: string,
  context?: APIContext
): Promise<PaneRowData | null> {
  const tenantId = context?.locals?.tenant?.id || "default";
  const isMultiTenant =
    import.meta.env.PUBLIC_ENABLE_MULTI_TENANT === "true" && tenantId !== `default`;

  // Check cache only if not in multi-tenant mode
  if (!isMultiTenant) {
    const cachedPane = getCachedPaneById(id);
    if (cachedPane) return cachedPane;
  }

  try {
    const client = await tursoClient.getClient(context);
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
        ...(typeof rows[0].markdown_id === "string" ? { markdown_id: rows[0].markdown_id } : {}),
        created: rows[0].created,
        changed: rows[0].changed,
        options_payload: rows[0].options_payload,
        is_context_pane: rows[0].is_context_pane,
      } as PaneRowData;

      // Update cache only if not in multi-tenant mode
      if (!isMultiTenant) {
        processBatchCache({ panes: [pane] });
      }
      return pane;
    }
    return null;
  } catch (error) {
    console.error("Error fetching getPaneByIdRowData:", error);
    throw error;
  }
}

// Upsert Pane by ID
export async function upsertPaneByIdRowData(
  data: PaneRowData,
  context?: APIContext
): Promise<boolean> {
  const tenantId = context?.locals?.tenant?.id || "default";
  const isMultiTenant =
    import.meta.env.PUBLIC_ENABLE_MULTI_TENANT === "true" && tenantId !== `default`;

  try {
    const client = await tursoClient.getClient(context);
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

    // Invalidate cache only if not in multi-tenant mode
    if (!isMultiTenant) {
      invalidateEntry("pane", data.id);
      setCachedContentMap([]);
    }
    return true;
  } catch (error) {
    console.error("Error in upsertPaneByIdRowData:", error);
    throw error;
  }
}

// Fetch Markdown by ID
export async function getMarkdownByIdRowData(
  id: string,
  context?: APIContext
): Promise<MarkdownRowData | null> {
  const tenantId = context?.locals?.tenant?.id || "default";
  const isMultiTenant =
    import.meta.env.PUBLIC_ENABLE_MULTI_TENANT === "true" && tenantId !== `default`;

  // Check cache only if not in multi-tenant mode
  if (!isMultiTenant) {
    const cachedMarkdown = getCachedMarkdownById(id);
    if (cachedMarkdown) return cachedMarkdown;
  }

  try {
    const client = await tursoClient.getClient(context);
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

      // Update cache only if not in multi-tenant mode
      if (!isMultiTenant) {
        processBatchCache({ markdowns: [markdown] });
      }
      return markdown;
    }
    return null;
  } catch (error) {
    console.error("Error fetching getMarkdownByIdRowData:", error);
    throw error;
  }
}

// Upsert Markdown
export async function upsertMarkdownRowData(
  id: string,
  markdown_body: string,
  context?: APIContext
): Promise<boolean> {
  try {
    const client = await tursoClient.getClient(context);
    if (!client) return false;
    await client.execute({
      sql: `INSERT INTO markdowns (id, body) 
            VALUES (?, ?)
            ON CONFLICT(id) DO UPDATE SET
              body = excluded.body`,
      args: [id, markdown_body],
    });
    return true; // Note: No cache invalidation here as markdowns aren't directly cached by ID
  } catch (error) {
    console.error("Error in upsertMarkdownRowData:", error);
    throw error;
  }
}

// Upsert Pane-File Relation
export async function upsertPaneFileRelation(
  pane_id: string,
  file_id: string,
  context?: APIContext
): Promise<boolean> {
  try {
    const client = await tursoClient.getClient(context);
    if (!client) return false;
    await client.execute({
      sql: `INSERT INTO file_panes (file_id, pane_id)
            VALUES (?, ?)
            ON CONFLICT(file_id, pane_id) DO NOTHING`,
      args: [file_id, pane_id],
    });
    return true; // Note: No cache invalidation here as this relation isn't directly cached
  } catch (error) {
    console.error("Error in upsertPaneFileRelation:", error);
    throw error;
  }
}

// Fetch StoryFragment by ID
export async function getCachedStoryFragmentByIdRowData(
  id: string,
  context?: APIContext
): Promise<StoryFragmentRowData | null> {
  const tenantId = context?.locals?.tenant?.id || "default";
  const isMultiTenant =
    import.meta.env.PUBLIC_ENABLE_MULTI_TENANT === "true" && tenantId !== `default`;

  // Check cache only if not in multi-tenant mode
  if (!isMultiTenant) {
    const cached = getCachedStoryFragmentById(id);
    if (cached) return cached;
  }

  try {
    const client = await tursoClient.getClient(context);
    if (!client) return null;

    const { rows } = await client.execute({
      sql: `SELECT id, title, slug, tractstack_id, created, changed, menu_id, 
            social_image_path, tailwind_background_colour 
            FROM storyfragments WHERE id = ?`,
      args: [id],
    });

    if (rows.length === 0 || !rows[0].id) return null;

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

    // Update cache only if not in multi-tenant mode
    if (!isMultiTenant) {
      processBatchCache({ storyFragments: [storyFragment] });
    }
    return storyFragment;
  } catch (error) {
    console.error("Error fetching getStoryFragmentByIdRowData:", error);
    throw error;
  }
}

// Upsert StoryFragment by ID
export async function upsertStoryFragmentByIdRowData(
  data: StoryFragmentRowData,
  context?: APIContext
): Promise<boolean> {
  const tenantId = context?.locals?.tenant?.id || "default";
  const isMultiTenant =
    import.meta.env.PUBLIC_ENABLE_MULTI_TENANT === "true" && tenantId !== `default`;

  try {
    const client = await tursoClient.getClient(context);
    if (!client) return false;

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

    await client.execute({
      sql: "DELETE FROM storyfragment_panes WHERE storyfragment_id = ?",
      args: [data.id],
    });

    if (data.pane_ids && data.pane_ids.length > 0) {
      for (const paneId of data.pane_ids) {
        await client.execute({
          sql: "INSERT INTO storyfragment_panes (storyfragment_id, pane_id, weight) VALUES (?, ?, ?)",
          args: [data.id, paneId, data.pane_ids.indexOf(paneId) + 1],
        });
      }
    }

    // Invalidate cache only if not in multi-tenant mode
    if (!isMultiTenant) {
      invalidateEntry("storyfragment", data.id);
      setCachedContentMap([]);
    }
    return true;
  } catch (error) {
    console.error("Error in upsertStoryFragmentByIdRowData:", error);
    throw error;
  }
}

// Fetch StoryFragment by Slug with Full Data
export async function getStoryFragmentBySlugFullRowData(
  slug: string,
  context?: APIContext
): Promise<StoryFragmentFullRowData | null> {
  const tenantId = context?.locals?.tenant?.id || "default";
  const isMultiTenant =
    import.meta.env.PUBLIC_ENABLE_MULTI_TENANT === "true" && tenantId !== `default`;

  // Check cache only if not in multi-tenant mode
  if (!isMultiTenant) {
    const storyFragment = getCachedStoryFragmentBySlug(slug);
    if (storyFragment) {
      const tractstack = getCachedTractStackById(storyFragment.tractstack_id);
      const menu = storyFragment.menu_id ? getCachedMenuById(storyFragment.menu_id) : null;
      const panes = storyFragment.pane_ids.map((id) => getCachedPaneById(id));
      const markdowns: MarkdownRowData[] = [];

      const allPanesFound = panes.every((pane) => {
        if (!pane) return false;
        if (pane.markdown_id) {
          const markdown = getCachedMarkdownById(pane.markdown_id);
          if (!markdown) return false;
          markdowns.push(markdown);
        }
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
  }

  try {
    const client = await tursoClient.getClient(context);
    if (!client) return null;

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

    const storyFragment: StoryFragmentRowData = {
      id: String(sfRow.id),
      title: String(sfRow.title),
      slug: String(sfRow.slug),
      tractstack_id: String(sfRow.tractstack_id),
      created: String(sfRow.created),
      changed: String(sfRow.changed || sfRow.created),
      pane_ids: [],
      ...(sfRow.menu_id && { menu_id: String(sfRow.menu_id) }),
      ...(sfRow.social_image_path && { social_image_path: String(sfRow.social_image_path) }),
      ...(sfRow.tailwind_background_colour && {
        tailwind_background_colour: String(sfRow.tailwind_background_colour),
      }),
    };

    const tractstack: TractStackRowData = {
      id: String(sfRow.ts_id),
      title: String(sfRow.ts_title),
      slug: String(sfRow.ts_slug),
      ...(sfRow.ts_social_image_path && {
        social_image_path: String(sfRow.ts_social_image_path),
      }),
    };

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

    panesData.forEach((paneData: EnrichedPaneRowData) => {
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

      if (paneData.id) storyFragment.pane_ids.push(String(paneData.id));

      if (paneData.markdown_id && paneData.markdown_body) {
        markdowns.push({
          id: String(paneData.markdown_id),
          markdown_body: String(paneData.markdown_body),
        });
      }
    });

    // Update cache only if not in multi-tenant mode
    if (!isMultiTenant) {
      processBatchCache({
        storyFragments: [storyFragment],
        tractStacks: [tractstack],
        menus: menu ? [menu] : undefined,
        panes,
        markdowns,
      });
    }

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

// Fetch Full Content Map
export async function getFullContentMap(context?: APIContext): Promise<FullContentMap[]> {
  const tenantId = context?.locals?.tenant?.id || "default";
  const isMultiTenant =
    import.meta.env.PUBLIC_ENABLE_MULTI_TENANT === "true" && tenantId !== `default`;

  // Check cache only if not in multi-tenant mode
  if (!isMultiTenant) {
    const cachedContent = getCachedContentMap();
    if (cachedContent) return cachedContent;
  }

  try {
    const client = await tursoClient.getClient(context);
    if (!client) return [];

    // First, get all topics to include as a special content map entry
    const { rows: allTopicRows } = await client.execute(
      `SELECT id, title FROM storyfragment_topics ORDER BY title ASC`
    );

    const allTopics: Topic[] = allTopicRows.map((row) => ({
      id: Number(row.id),
      title: String(row.title),
    }));

    const queryParts = [
      `SELECT 
        id, 
        id as slug, 
        title, 
        'Menu' as type, 
        theme as extra, 
        NULL as parent_id, 
        NULL as parent_title, 
        NULL as parent_slug, 
        NULL as created,
        NULL as pane_ids, 
        NULL as description,
        NULL as topics
      FROM menus`,
      `SELECT 
        id, 
        slug, 
        title, 
        'Pane' as type, 
        is_context_pane as extra, 
        NULL as parent_id, 
        NULL as parent_title, 
        NULL as parent_slug,
        NULL as created,
        NULL as pane_ids, 
        NULL as description,
        NULL as topics
      FROM panes`,
      `SELECT 
        id, 
        slug, 
        title, 
        'Resource' as type, 
        category_slug as extra, 
        NULL as parent_id, 
        NULL as parent_title, 
        NULL as parent_slug,
        NULL as created,
        NULL as pane_ids, 
        NULL as description,
        NULL as topics
      FROM resources`,
      `SELECT 
        id, 
        id as slug, 
        title, 
        'Epinet' as type, 
        options_payload as extra, 
        NULL as parent_id, 
        NULL as parent_title, 
        NULL as parent_slug,
        NULL as created,
        NULL as pane_ids, 
        NULL as description,
        NULL as topics
      FROM epinets`,
      `SELECT 
        sf.id, 
        sf.slug, 
        sf.title, 
        'StoryFragment' as type, 
        sf.social_image_path as extra,
        ts.id as parent_id,
        ts.title as parent_title,
        ts.slug as parent_slug,
        sf.created,
        (
          SELECT GROUP_CONCAT(pane_id)
          FROM storyfragment_panes sp
          WHERE sp.storyfragment_id = sf.id
        ) as pane_ids,
        sfd.description,
        (
          SELECT GROUP_CONCAT(st.title)
          FROM storyfragment_has_topic sht
          JOIN storyfragment_topics st ON sht.topic_id = st.id
          WHERE sht.storyfragment_id = sf.id
        ) as topics
      FROM storyfragments sf
      JOIN tractstacks ts ON sf.tractstack_id = ts.id
      LEFT JOIN storyfragment_details sfd ON sfd.storyfragment_id = sf.id`,
      `SELECT 
        id, 
        slug, 
        title, 
        'TractStack' as type, 
        social_image_path as extra, 
        NULL as parent_id, 
        NULL as parent_title, 
        NULL as parent_slug,
        NULL as created,
        NULL as pane_ids, 
        NULL as description,
        NULL as topics
      FROM tractstacks`,
      `SELECT 
        id, 
        slug, 
        'Belief' as title, 
        'Belief' as type, 
        scale as extra, 
        NULL as parent_id, 
        NULL as parent_title, 
        NULL as parent_slug,
        NULL as created,
        NULL as pane_ids, 
        NULL as description,
        NULL as topics
      FROM beliefs`,
    ];

    const { rows } = await client.execute(queryParts.join(" UNION ALL ") + " ORDER BY title");

    const mappedData: FullContentMap[] = rows.map((row) => {
      const base = {
        id: ensureString(row.id),
        title: ensureString(row.title),
        slug: ensureString(row.slug),
      };

      switch (ensureString(row.type)) {
        case "Epinet": {
          let steps: any[] = [];
          let promoted = false;
          try {
            if (row.extra && typeof row.extra === "string") {
              const options = JSON.parse(String(row.extra));
              if (Array.isArray(options)) {
                steps = options;
              } else if (typeof options === "object") {
                if (Array.isArray(options.steps)) {
                  steps = options.steps;
                }
                promoted = !!options.promoted;
              }
            }
          } catch (error) {
            console.error(`Error parsing options_payload for epinet ${row.id}:`, error);
          }
          return {
            ...base,
            type: "Epinet" as const,
            promoted,
            steps,
          } as EpinetContentMap;
        }

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

        case "StoryFragment": {
          const baseData = {
            ...base,
            type: "StoryFragment" as const,
            created: row.created ? String(row.created) : null,
          } as StoryFragmentContentMap;

          // Add description if available
          if (row.description && typeof row.description === "string")
            baseData.description = row.description;

          // Add topics if available
          if (row.topics && typeof row.topics === "string")
            baseData.topics = row.topics.split(",").map((t) => t.trim());

          const socialImagePath = row.extra ? String(row.extra) : null;

          const cacheBuster = row.created ? new Date(String(row.created)).getTime() : Date.now();

          if (socialImagePath) {
            const basename = socialImagePath
              ? path.basename(socialImagePath, path.extname(socialImagePath))
              : row.id;
            baseData.thumbSrc = `/images/thumbs/${basename}_1200px.webp?v=${cacheBuster}`;
            baseData.thumbSrcSet = [
              `/images/thumbs/${basename}_1200px.webp?v=${cacheBuster} 1200w`,
              `/images/thumbs/${basename}_600px.webp?v=${cacheBuster} 600w`,
              `/images/thumbs/${basename}_300px.webp?v=${cacheBuster} 300w`,
            ].join(", ");
            baseData.socialImagePath = socialImagePath
              ? `${socialImagePath}?v=${cacheBuster}`
              : `/images/og/${row.id}.png?v=${cacheBuster}`;
          }

          return {
            ...baseData,
            ...(row.parent_id && {
              parentId: String(row.parent_id),
              parentTitle: String(row.parent_title),
              parentSlug: String(row.parent_slug),
            }),
            ...(row.pane_ids && {
              panes: String(row.pane_ids).split(","),
            }),
          } as StoryFragmentContentMap;
        }

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

    // Add a special entry for all topics
    if (allTopics.length > 0) {
      mappedData.push({
        id: "all-topics",
        slug: "all-topics",
        title: "All Topics",
        type: "Topic",
        topics: allTopics,
      } as TopicContentMap);
    }

    // Update cache only if not in multi-tenant mode
    if (!isMultiTenant) {
      setCachedContentMap(mappedData);
    }
    return mappedData;
  } catch (error) {
    return [];
  }
}

// Fetch all Resources
export async function getAllResourcesRowData(context?: APIContext): Promise<ResourceRowData[]> {
  const tenantId = context?.locals?.tenant?.id || "default";
  const isMultiTenant =
    import.meta.env.PUBLIC_ENABLE_MULTI_TENANT === "true" && tenantId !== `default`;

  try {
    const client = await tursoClient.getClient(context);
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

    // Update cache only if not in multi-tenant mode
    if (!isMultiTenant) {
      processBatchCache({ resources });
    }
    return resources;
  } catch (error) {
    console.error("Error fetching getAllResourcesRowData:", error);
    throw error;
  }
}

export async function getResourceFilesByResourceId(
  resourceId: string,
  context?: APIContext
): Promise<ImageFileRowData[]> {
  try {
    const client = await tursoClient.getClient(context);
    if (!client) return [];

    const { rows } = await client.execute({
      sql: `SELECT f.id, f.filename, f.alt_description, f.url, f.src_set 
            FROM files f
            JOIN files_resource rf ON f.id = rf.file_id
            WHERE rf.resource_id = ?`,
      args: [resourceId],
    });

    return rows.map((row) => ({
      id: row.id as string,
      filename: row.filename as string,
      alt_description: row.alt_description as string,
      url: row.url as string,
      ...(row.src_set ? { src_set: row.src_set as string } : {}),
    }));
  } catch (error) {
    console.error("Error fetching resource files:", error);
    return [];
  }
}

// Fetch Resources by Category Slug
export async function getResourcesByCategorySlugRowData(
  categorySlug: string,
  context?: APIContext
): Promise<ResourceRowData[]> {
  const tenantId = context?.locals?.tenant?.id || "default";
  const isMultiTenant =
    import.meta.env.PUBLIC_ENABLE_MULTI_TENANT === "true" && tenantId !== `default`;

  try {
    const client = await tursoClient.getClient(context);
    if (!client) return [];

    const { rows } = await client.execute({
      sql: `SELECT id, title, slug, category_slug, oneliner, options_payload, action_lisp
            FROM resources 
            WHERE category_slug = ?`,
      args: [categorySlug],
    });

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

    // Update cache only if not in multi-tenant mode
    if (!isMultiTenant) {
      processBatchCache({ resources });
    }
    return resources;
  } catch (error) {
    console.error("Error fetching resources by category slug:", error);
    throw error;
  }
}

// Fetch Resources by Slugs
export async function getResourcesBySlugsRowData(
  slugs: string[],
  context?: APIContext
): Promise<ResourceRowData[]> {
  const tenantId = context?.locals?.tenant?.id || "default";
  const isMultiTenant =
    import.meta.env.PUBLIC_ENABLE_MULTI_TENANT === "true" && tenantId !== `default`;

  try {
    const client = await tursoClient.getClient(context);
    if (!client) return [];

    const placeholders = slugs.map(() => "?").join(",");
    const { rows } = await client.execute({
      sql: `SELECT id, title, slug, category_slug, oneliner, options_payload, action_lisp
            FROM resources 
            WHERE slug IN (${placeholders})`,
      args: slugs,
    });

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

    // Update cache only if not in multi-tenant mode
    if (!isMultiTenant) {
      processBatchCache({ resources });
    }
    return resources;
  } catch (error) {
    console.error("Error fetching resources by slugs:", error);
    return [];
  }
}

// Fetch Resource by Slug
export async function getResourceBySlugRowData(
  slug: string,
  context?: APIContext
): Promise<ResourceRowData | null> {
  const tenantId = context?.locals?.tenant?.id || "default";
  const isMultiTenant =
    import.meta.env.PUBLIC_ENABLE_MULTI_TENANT === "true" && tenantId !== `default`;

  try {
    const client = await tursoClient.getClient(context);
    if (!client) return null;

    const { rows } = await client.execute({
      sql: `SELECT id, title, slug, category_slug, oneliner, options_payload, action_lisp
            FROM resources 
            WHERE slug = ?`,
      args: [slug],
    });

    if (rows.length === 0) return null;

    const row = rows[0];
    const resource = {
      id: ensureString(row.id),
      title: ensureString(row.title),
      slug: ensureString(row.slug),
      oneliner: ensureString(row.oneliner),
      options_payload: ensureString(row.options_payload),
      ...(typeof row.category_slug === "string" ? { category_slug: row.category_slug } : {}),
      ...(typeof row.action_lisp === "string" ? { action_lisp: row.action_lisp } : {}),
    } as ResourceRowData;

    // Update cache only if not in multi-tenant mode
    if (!isMultiTenant) {
      processBatchCache({ resources: [resource] });
    }
    return resource;
  } catch (error) {
    console.error("Error fetching resource by slug:", error);
    throw error;
  }
}

// Fetch Context Pane by Slug with Full Data
export async function getContextPaneBySlugFullRowData(
  slug: string,
  context?: APIContext
): Promise<ContextPaneFullRowData | null> {
  const tenantId = context?.locals?.tenant?.id || "default";
  const isMultiTenant =
    import.meta.env.PUBLIC_ENABLE_MULTI_TENANT === "true" && tenantId !== `default`;

  // Check cache only if not in multi-tenant mode
  if (!isMultiTenant) {
    const pane = getCachedPaneBySlug(slug);
    if (pane && pane.is_context_pane) {
      const markdowns: MarkdownRowData[] = [];
      let allDependenciesFound = true;

      if (pane.markdown_id) {
        const markdown = getCachedMarkdownById(pane.markdown_id);
        if (!markdown) {
          allDependenciesFound = false;
        } else {
          markdowns.push(markdown);
        }
      }

      const files: ImageFileRowData[] = [];
      try {
        const options = JSON.parse(pane.options_payload);
        if (options.nodes) {
          const fileIds = new Set<string>();
          const findFileIds = (nodes: any[]) => {
            nodes.forEach((node) => {
              if (node.fileId) fileIds.add(node.fileId);
              if (node.nodes) findFileIds(node.nodes);
            });
          };
          findFileIds(options.nodes);

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
  }

  try {
    const client = await tursoClient.getClient(context);
    if (!client) return null;

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

    const markdowns: MarkdownRowData[] = [];
    if (paneRow.markdown_id && paneRow.markdown_body) {
      markdowns.push({
        id: ensureString(paneRow.markdown_id),
        markdown_body: ensureString(paneRow.markdown_body),
      });
    }

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

    // Update cache only if not in multi-tenant mode
    if (!isMultiTenant) {
      processBatchCache({ panes, markdowns, files });
    }

    return { panes, markdowns, files };
  } catch (error) {
    console.error("Error in getContextPaneBySlugFullRowData:", error);
    throw error;
  }
}

// Fetch all Beliefs
export async function getAllBeliefRowData(context?: APIContext): Promise<BeliefRowData[]> {
  const tenantId = context?.locals?.tenant?.id || "default";
  const isMultiTenant =
    import.meta.env.PUBLIC_ENABLE_MULTI_TENANT === "true" && tenantId !== `default`;

  try {
    const client = await tursoClient.getClient(context);
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

    // Update cache only if not in multi-tenant mode
    if (!isMultiTenant) {
      processBatchCache({ beliefs });
    }
    return beliefs;
  } catch (error) {
    console.error("Error fetching getAllBeliefRowData:", error);
    throw error;
  }
}

// Fetch Belief by ID
export async function getBeliefByIdRowData(
  id: string,
  context?: APIContext
): Promise<BeliefRowData | null> {
  const tenantId = context?.locals?.tenant?.id || "default";
  const isMultiTenant =
    import.meta.env.PUBLIC_ENABLE_MULTI_TENANT === "true" && tenantId !== `default`;

  // Check cache only if not in multi-tenant mode
  if (!isMultiTenant) {
    const cachedBelief = getCachedBeliefById(id);
    if (cachedBelief) return cachedBelief;
  }

  try {
    const client = await tursoClient.getClient(context);
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

      // Update cache only if not in multi-tenant mode
      if (!isMultiTenant) {
        processBatchCache({ beliefs: [belief] });
      }
      return belief;
    }
    return null;
  } catch (error) {
    console.error("Error fetching getBeliefByIdRowData:", error);
    throw error;
  }
}

// Initialize Content
export async function initializeContent(context?: APIContext): Promise<void> {
  const client = await tursoClient.getClient(context);
  if (client) {
    try {
      const tractStackId = ulid();
      await client.execute({
        sql: "INSERT INTO tractstacks (id, title, slug, social_image_path) VALUES (?, ?, ?, ?) ON CONFLICT (slug) DO NOTHING",
        args: [tractStackId, "Tract Stack", "HELLO", ""],
      });
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
        args: [storyFragmentId, "", "hello", tractStackId, now, now, null, null, null],
      });
    } catch (error) {
      console.error("Content initialization error:", error);
      throw error;
    }
  }
}

// Get Unique Tailwind Classes
export async function getUniqueTailwindClasses(context?: APIContext) {
  try {
    const client = await tursoClient.getClient(context);
    if (!client) return [];
    const { rows } = await client.execute(`SELECT id, options_payload FROM panes`);
    return getTailwindWhitelist(rows);
  } catch (error) {
    console.error("Error fetching pane payloads:", error);
    throw error;
  }
}

// Get Site Map
export async function getSiteMap(context?: APIContext): Promise<SiteMap[]> {
  try {
    const client = await tursoClient.getClient(context);
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

    const siteMap: SiteMap[] = [
      ...storyFragments.rows.map((row: any) => ({
        id: row.id,
        title: row.title,
        slug: row.slug,
        type: "StoryFragment" as const,
        created: new Date(row.created || Date.now()),
        changed: row.changed ? new Date(row.changed) : null,
      })),
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
    return [];
  }
}

export async function logTokenUsage(tokensUsed: number, context?: APIContext): Promise<boolean> {
  try {
    const client = await tursoClient.getClient(context);
    if (!client) return false;

    await client.execute({
      sql: `INSERT INTO aai_tokens_used (timestamp, tokens_used) 
            VALUES (CURRENT_TIMESTAMP, ?)`,
      args: [tokensUsed],
    });
    return true;
  } catch (error) {
    console.error("Error logging token usage:", error);
    return false;
  }
}
