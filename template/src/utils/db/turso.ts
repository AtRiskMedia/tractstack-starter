import { tursoClient } from "./client";
import type {
  TractStackRowData,
  ResourceRowData,
  MenuRowData,
  ImageFileRowData,
  PaneRowData,
  MarkdownRowData,
  StoryFragmentRowData,
} from "@/store/nodesSerializer.ts";

export async function getTractStackByIdRowData(id: string): Promise<TractStackRowData | null> {
  try {
    const client = await tursoClient.getClient();
    if (!client) return null;
    const { rows } = await client.execute({
      sql: `SELECT id,title,slug,social_image_path FROM tractstacks WHERE id = ?`,
      args: [id],
    });
    if (rows.length > 0 && rows[0].id && rows[0].title && rows[0].slug) {
      return {
        id: rows[0].id,
        title: rows[0].title,
        slug: rows[0].slug,
        ...(typeof rows[0].social_image_path === `string`
          ? { social_image_path: rows[0].social_image_path }
          : {}),
      } as TractStackRowData;
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
  try {
    const client = await tursoClient.getClient();
    if (!client) return null;
    const { rows } = await client.execute({
      sql: `SELECT id, title, slug, category_slug, oneliner, options_payload, action_lisp 
            FROM resources WHERE id = ?`,
      args: [id],
    });
    if (rows.length > 0 && rows[0].id && rows[0].title && rows[0].slug) {
      return {
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

export async function getMenuByIdRowData(id: string): Promise<MenuRowData | null> {
  try {
    const client = await tursoClient.getClient();
    if (!client) return null;
    const { rows } = await client.execute({
      sql: `SELECT id, title, theme, options_payload FROM menus WHERE id = ?`,
      args: [id],
    });
    if (rows.length > 0 && rows[0].id && rows[0].title) {
      return {
        id: rows[0].id,
        title: rows[0].title,
        theme: rows[0].theme,
        options_payload: rows[0].options_payload,
      } as MenuRowData;
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

export async function getFileByIdRowData(id: string): Promise<ImageFileRowData | null> {
  try {
    const client = await tursoClient.getClient();
    if (!client) return null;
    const { rows } = await client.execute({
      sql: `SELECT id, filename, alt_description, url, src_set FROM files WHERE id = ?`,
      args: [id],
    });
    if (rows.length > 0 && rows[0].id && rows[0].filename) {
      return {
        id: rows[0].id,
        filename: rows[0].filename,
        alt_description: rows[0].alt_description,
        url: rows[0].url,
        ...(typeof rows[0].src_set === "boolean" ? { src_set: rows[0].src_set } : {}),
      } as ImageFileRowData;
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
  try {
    const client = await tursoClient.getClient();
    if (!client) return null;
    const { rows } = await client.execute({
      sql: `SELECT id, title, slug, pane_type, created, changed, options_payload, is_context_pane, markdown_id 
            FROM panes WHERE id = ?`,
      args: [id],
    });
    if (rows.length > 0 && rows[0].id && rows[0].title) {
      return {
        id: rows[0].id,
        title: rows[0].title,
        slug: rows[0].slug,
        pane_type: rows[0].pane_type,
        ...(typeof rows[0].markdown_id ? { markdown_id: rows[0].markdown_id } : {}),
        created: rows[0].created,
        changed: rows[0].changed,
        options_payload: rows[0].options_payload,
        is_context_pane: rows[0].is_context_pane,
      } as PaneRowData;
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
  try {
    const client = await tursoClient.getClient();
    if (!client) return null;
    const { rows } = await client.execute({
      sql: `SELECT id, body FROM markdowns WHERE id = ?`,
      args: [id],
    });
    if (rows.length > 0 && rows[0].id) {
      return {
        id: rows[0].id,
        markdown_body: rows[0].body,
      } as MarkdownRowData;
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

export async function getStoryFragmentByIdRowData(
  id: string
): Promise<StoryFragmentRowData | null> {
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

    return {
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
