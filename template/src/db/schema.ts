import { ulid } from "ulid";
import type { Client } from "@libsql/client";

const TABLE_STATEMENTS = {
  tractstack: `CREATE TABLE IF NOT EXISTS tractstack (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    social_image_path TEXT
  )`,

  menu: `CREATE TABLE IF NOT EXISTS menu (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    theme TEXT NOT NULL,
    options_payload TEXT NOT NULL
  )`,

  resource: `CREATE TABLE IF NOT EXISTS resource (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    category_slug TEXT,
    oneliner TEXT NOT NULL,
    options_payload TEXT NOT NULL,
    action_lisp TEXT
  )`,

  file: `CREATE TABLE IF NOT EXISTS file (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    alt_description TEXT NOT NULL,
    url TEXT NOT NULL,
    src_set BOOLEAN DEFAULT false
  )`,

  markdown: `CREATE TABLE IF NOT EXISTS markdown (
    id TEXT PRIMARY KEY,
    body TEXT NOT NULL
  )`,

  storyfragment: `CREATE TABLE IF NOT EXISTS storyfragment (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    social_image_path TEXT,
    tailwind_background_colour TEXT,
    created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    changed TIMESTAMP,
    menu_id TEXT REFERENCES menu(id),
    tractstack_id TEXT NOT NULL REFERENCES tractstack(id)
  )`,

  pane: `CREATE TABLE IF NOT EXISTS pane (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    changed TIMESTAMP,
    markdown_id TEXT REFERENCES markdown(id),
    options_payload TEXT NOT NULL,
    is_context_pane BOOLEAN DEFAULT 0,
    height_offset_desktop INTEGER,
    height_offset_mobile INTEGER,
    height_offset_tablet INTEGER,
    height_ratio_desktop TEXT,
    height_ratio_mobile TEXT,
    height_ratio_tablet TEXT
  )`,

  storyfragment_pane: `CREATE TABLE IF NOT EXISTS storyfragment_pane (
    id TEXT PRIMARY KEY,
    storyfragment_id TEXT NOT NULL REFERENCES storyfragment(id),
    pane_id TEXT NOT NULL REFERENCES pane(id),
    weight INTEGER NOT NULL,
    UNIQUE(storyfragment_id, pane_id)
  )`,

  file_pane: `CREATE TABLE IF NOT EXISTS file_pane (
    id TEXT PRIMARY KEY,
    file_id TEXT NOT NULL REFERENCES file(id),
    pane_id TEXT NOT NULL REFERENCES pane(id),
    UNIQUE(file_id, pane_id)
  )`,

  file_markdown: `CREATE TABLE IF NOT EXISTS file_markdown (
    id TEXT PRIMARY KEY,
    file_id TEXT NOT NULL REFERENCES file(id),
    markdown_id TEXT NOT NULL REFERENCES markdown(id),
    UNIQUE(file_id, markdown_id)
  )`,
};

const INDEX_STATEMENTS = [
  "CREATE INDEX IF NOT EXISTS idx_storyfragment_tractstack_id ON storyfragment(tractstack_id)",
  "CREATE INDEX IF NOT EXISTS idx_storyfragment_menu_id ON storyfragment(menu_id)",
  "CREATE INDEX IF NOT EXISTS idx_storyfragment_pane_storyfragment_id ON storyfragment_pane(storyfragment_id)",
  "CREATE INDEX IF NOT EXISTS idx_storyfragment_pane_pane_id ON storyfragment_pane(pane_id)",
  "CREATE INDEX IF NOT EXISTS idx_file_pane_file_id ON file_pane(file_id)",
  "CREATE INDEX IF NOT EXISTS idx_file_pane_pane_id ON file_pane(pane_id)",
  "CREATE INDEX IF NOT EXISTS idx_file_markdown_file_id ON file_markdown(file_id)",
  "CREATE INDEX IF NOT EXISTS idx_file_markdown_markdown_id ON file_markdown(markdown_id)",
  "CREATE INDEX IF NOT EXISTS idx_pane_markdown_id ON pane(markdown_id)",
];

interface InitOptions {
  client: Client;
}

export async function initializeSchema({ client }: InitOptions): Promise<void> {
  try {
    // For safety, always create tables/indexes without dropping in production replicas
    // Create tables if they don't exist (safe for both demo and replicas)
    for (const [, statement] of Object.entries(TABLE_STATEMENTS)) {
      await client.execute(statement);
    }

    // Create indexes
    for (const indexStatement of INDEX_STATEMENTS) {
      await client.execute(indexStatement);
    }
  } catch (error) {
    console.error("Schema initialization error:", error);
    throw error;
  }
}

export async function initializeContent({ client }: InitOptions): Promise<void> {
  try {
    await client.execute({
      sql: "INSERT INTO tractstack (id, title, slug, social_image_path) VALUES (?, ?, ?, ?)",
      args: [`${ulid()}`, "Tract Stack", "HELLO", ""],
    });
  } catch (error) {
    console.error("Content initialization error:", error);
    throw error;
  }
}
