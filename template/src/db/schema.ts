import type { Client } from "@libsql/client";
import { hasDbInit } from "./utils";

const createTableStatements = [
  `CREATE TABLE IF NOT EXISTS tractstack (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    social_image_path TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS menu (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    theme TEXT NOT NULL,
    options_payload TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS resource (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    category_slug TEXT,
    oneliner TEXT NOT NULL,
    options_payload TEXT NOT NULL,
    action_lisp TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS file (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    alt_description TEXT NOT NULL,
    url TEXT NOT NULL,
    src_set BOOLEAN DEFAULT false
  )`,
  `CREATE TABLE IF NOT EXISTS markdown (
    id TEXT PRIMARY KEY,
    body TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS storyfragment (
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
  `CREATE TABLE IF NOT EXISTS pane (
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
  `CREATE TABLE IF NOT EXISTS storyfragment_pane (
    id TEXT PRIMARY KEY,
    storyfragment_id TEXT NOT NULL REFERENCES storyfragment(id),
    pane_id TEXT NOT NULL REFERENCES pane(id),
    weight INTEGER NOT NULL,
    UNIQUE(storyfragment_id, pane_id)
  )`,
  `CREATE TABLE IF NOT EXISTS file_pane (
    id TEXT PRIMARY KEY,
    file_id TEXT NOT NULL REFERENCES file(id),
    pane_id TEXT NOT NULL REFERENCES pane(id),
    UNIQUE(file_id, pane_id)
  )`,
  `CREATE TABLE IF NOT EXISTS file_markdown (
    id TEXT PRIMARY KEY,
    file_id TEXT NOT NULL REFERENCES file(id),
    markdown_id TEXT NOT NULL REFERENCES markdown(id),
    UNIQUE(file_id, markdown_id)
  )`,
];

const initializeSchema = async (client: Client): Promise<void> => {
  console.log("Checking database initialization status...");

  const isInitialized = await hasDbInit(client);

  if (isInitialized) {
    console.log("Database already initialized, skipping schema creation");
    return;
  }

  console.log("Starting schema initialization for new database...");

  try {
    // Foreign keys off before creating tables
    console.log("Disabling foreign keys...");
    await client.execute(`PRAGMA foreign_keys = OFF;`);

    // Create tables
    console.log("Creating tables...");
    for (const statement of createTableStatements) {
      console.log("Executing:", statement.substring(0, 50) + "...");
      await client.execute(statement);
    }

    // Create indexes
    const createIndexStatements = [
      `CREATE INDEX IF NOT EXISTS idx_storyfragment_tractstack_id ON storyfragment(tractstack_id)`,
      // ... other index statements ...
    ];

    console.log("Creating indexes...");
    for (const statement of createIndexStatements) {
      console.log("Executing:", statement.substring(0, 50) + "...");
      await client.execute(statement);
    }

    // Foreign keys back on
    console.log("Enabling foreign keys...");
    await client.execute(`PRAGMA foreign_keys = ON;`);

    console.log("Schema initialization completed successfully");
  } catch (error) {
    console.error("Schema initialization failed:", error);
    throw error;
  }
};

export { initializeSchema };

export default {
  initializeSchema,
};
