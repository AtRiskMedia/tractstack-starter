import { createClient } from "@libsql/client/web";
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

// Sample data for preview mode
const menuId = ulid();
const tractStackId = ulid();
const markdownId = ulid();
const paneId = ulid();
const fileId = ulid();
const storyFragmentId = ulid();

const PREVIEW_DATA = {
  tractstack: [
    {
      id: tractStackId,
      title: "Demo Tract Stack",
      slug: "demo",
      social_image_path: null,
    },
  ],
  menu: [
    {
      id: menuId,
      title: "Demo Menu",
      theme: "light",
      options_payload: JSON.stringify({
        layout: "default",
        style: "minimal",
        colors: {
          primary: "#000000",
          secondary: "#ffffff",
        },
      }),
    },
  ],
  markdown: [
    {
      id: markdownId,
      body: "# Welcome to the Demo\n\nThis is a sample markdown content for the preview mode.",
    },
  ],
  file: [
    {
      id: fileId,
      filename: "demo-image.jpg",
      alt_description: "A demo image",
      url: "/images/demo-image.jpg",
      src_set: false,
    },
  ],
  pane: [
    {
      id: paneId,
      title: "Demo Pane",
      slug: "demo-pane",
      markdown_id: markdownId,
      options_payload: JSON.stringify({
        layout: "default",
        animation: "fade",
        background: "#ffffff",
      }),
      is_context_pane: false,
      height_offset_desktop: 0,
      height_offset_mobile: 0,
      height_offset_tablet: 0,
      height_ratio_desktop: "16:9",
      height_ratio_mobile: "1:1",
      height_ratio_tablet: "4:3",
    },
  ],
  storyfragment: [
    {
      id: storyFragmentId,
      title: "Demo Story",
      slug: "demo-story",
      social_image_path: null,
      tailwind_background_colour: "bg-white",
      menu_id: menuId,
      tractstack_id: tractStackId,
    },
  ],
  storyfragment_pane: [
    {
      id: ulid(),
      storyfragment_id: storyFragmentId,
      pane_id: paneId,
      weight: 0,
    },
  ],
  file_pane: [
    {
      id: ulid(),
      file_id: fileId,
      pane_id: paneId,
    },
  ],
  file_markdown: [
    {
      id: ulid(),
      file_id: fileId,
      markdown_id: markdownId,
    },
  ],
};

interface InitOptions {
  client: Client;
  isPreview?: boolean;
  onProgress?: (step: number, total: number) => void;
}

export async function initializeSchema({
  client,
  isPreview = false,
  onProgress,
}: InitOptions): Promise<void> {
  const totalSteps =
    Object.keys(TABLE_STATEMENTS).length +
    INDEX_STATEMENTS.length +
    (isPreview ? Object.keys(PREVIEW_DATA).length : 0);
  let currentStep = 0;

  try {
    // Disable foreign keys before operations
    await client.execute(`PRAGMA foreign_keys = OFF;`);

    // Drop existing tables in reverse dependency order
    const tablesToDrop = Object.keys(TABLE_STATEMENTS).reverse();
    for (const table of tablesToDrop) {
      await client.execute(`DROP TABLE IF EXISTS ${table};`);
    }

    // Create tables
    for (const [tableName, statement] of Object.entries(TABLE_STATEMENTS)) {
      await client.execute(statement);
      currentStep++;
      onProgress?.(currentStep, totalSteps);
    }

    // Create indexes
    for (const indexStatement of INDEX_STATEMENTS) {
      await client.execute(indexStatement);
      currentStep++;
      onProgress?.(currentStep, totalSteps);
    }

    // Insert preview data if in preview mode
    if (isPreview) {
      // Insert in dependency order
      for (const [table, rows] of Object.entries(PREVIEW_DATA)) {
        for (const row of rows) {
          const columns = Object.keys(row).join(", ");
          const placeholders = Object.keys(row)
            .map(() => "?")
            .join(", ");
          const values = Object.values(row);

          await client.execute({
            sql: `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`,
            args: values,
          });
        }
        currentStep++;
        onProgress?.(currentStep, totalSteps);
      }
    }

    // Re-enable foreign keys
    await client.execute(`PRAGMA foreign_keys = ON;`);
  } catch (error) {
    console.error("Schema initialization error:", error);
    throw error;
  }
}

interface BrowserInitOptions {
  onProgress?: (step: number, total: number) => void;
}

export const createBrowserTursoClient = (): Client => {
  return createClient({
    url: "libsql://local", // URL for embedded replica
  });
};

export async function initializeBrowserSchema({
  onProgress,
}: BrowserInitOptions = {}): Promise<void> {
  const client = createBrowserTursoClient();
  const totalSteps = Object.keys(TABLE_STATEMENTS).length + INDEX_STATEMENTS.length;
  let currentStep = 0;

  try {
    // Disable foreign keys before dropping/creating tables
    await client.execute(`PRAGMA foreign_keys = OFF;`);

    // Drop existing tables in reverse dependency order
    const tablesToDrop = Object.keys(TABLE_STATEMENTS).reverse();
    for (const table of tablesToDrop) {
      await client.execute(`DROP TABLE IF EXISTS ${table};`);
    }

    // Create tables
    for (const [, statement] of Object.entries(TABLE_STATEMENTS)) {
      await client.execute(statement);
      currentStep++;
      onProgress?.(currentStep, totalSteps);
    }

    // Create indexes
    for (const indexStatement of INDEX_STATEMENTS) {
      await client.execute(indexStatement);
      currentStep++;
      onProgress?.(currentStep, totalSteps);
    }

    // Re-enable foreign keys
    await client.execute(`PRAGMA foreign_keys = ON;`);
  } catch (error) {
    console.error("Schema initialization error:", error);
    throw error;
  }
}

export default {
  initializeSchema,
};
