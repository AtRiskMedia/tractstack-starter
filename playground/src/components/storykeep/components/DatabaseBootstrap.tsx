import { useState } from "react";
import { ulid } from "ulid";
import { navigate } from "astro:transitions/client";
import { tursoClient } from "../../../api/tursoClient";

const DatabaseBootstrap = () => {
  const [isInitializing, setIsInitializing] = useState(false);
  const [progress, setProgress] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const initializeDatabase = async () => {
    setIsInitializing(true);
    setProgress(1);

    try {
      // Disable foreign keys and drop existing tables
      setProgress(2);
      await tursoClient.execute([
        {
          sql: "PRAGMA foreign_keys = OFF;",
          args: [],
        },
      ]);

      const tablesToDrop = [
        "storyfragment_pane",
        "file_pane",
        "file_markdown",
        "pane",
        "storyfragment",
        "markdown",
        "file",
        "resource",
        "menu",
        "tractstack",
      ];

      for (const table of tablesToDrop) {
        await tursoClient.execute([
          {
            sql: `DROP TABLE IF EXISTS ${table};`,
            args: [],
          },
        ]);
      }

      setProgress(3);
      await tursoClient.execute([
        {
          sql: "PRAGMA foreign_keys = ON;",
          args: [],
        },
      ]);

      // Create tables
      setProgress(4);
      await tursoClient.execute([
        {
          sql: `CREATE TABLE IF NOT EXISTS tractstack (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          slug TEXT NOT NULL UNIQUE,
          social_image_path TEXT
        )`,
          args: [],
        },
      ]);

      setProgress(5);
      await tursoClient.execute([
        {
          sql: `CREATE TABLE IF NOT EXISTS menu (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          theme TEXT NOT NULL,
          options_payload TEXT NOT NULL
        )`,
          args: [],
        },
      ]);

      setProgress(6);
      await tursoClient.execute([
        {
          sql: `CREATE TABLE IF NOT EXISTS resource (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          slug TEXT NOT NULL UNIQUE,
          category_slug TEXT,
          oneliner TEXT NOT NULL,
          options_payload TEXT NOT NULL,
          action_lisp TEXT
        )`,
          args: [],
        },
      ]);

      setProgress(7);
      await tursoClient.execute([
        {
          sql: `CREATE TABLE IF NOT EXISTS file (
          id TEXT PRIMARY KEY,
          filename TEXT NOT NULL,
          alt_description TEXT NOT NULL,
          url TEXT NOT NULL,
          src_set BOOLEAN DEFAULT false
        )`,
          args: [],
        },
      ]);

      setProgress(8);
      await tursoClient.execute([
        {
          sql: `CREATE TABLE IF NOT EXISTS markdown (
          id TEXT PRIMARY KEY,
          body TEXT NOT NULL
        )`,
          args: [],
        },
      ]);

      setProgress(9);
      await tursoClient.execute([
        {
          sql: `CREATE TABLE IF NOT EXISTS storyfragment (
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
          args: [],
        },
      ]);

      setProgress(10);
      await tursoClient.execute([
        {
          sql: `CREATE TABLE IF NOT EXISTS pane (
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
          args: [],
        },
      ]);

      setProgress(11);
      await tursoClient.execute([
        {
          sql: `CREATE TABLE IF NOT EXISTS storyfragment_pane (
          id TEXT PRIMARY KEY,
          storyfragment_id TEXT NOT NULL REFERENCES storyfragment(id),
          pane_id TEXT NOT NULL REFERENCES pane(id),
          weight INTEGER NOT NULL,
          UNIQUE(storyfragment_id, pane_id)
        )`,
          args: [],
        },
      ]);

      setProgress(12);
      await tursoClient.execute([
        {
          sql: `CREATE TABLE IF NOT EXISTS file_pane (
          id TEXT PRIMARY KEY,
          file_id TEXT NOT NULL REFERENCES file(id),
          pane_id TEXT NOT NULL REFERENCES pane(id),
          UNIQUE(file_id, pane_id)
        )`,
          args: [],
        },
      ]);

      setProgress(13);
      await tursoClient.execute([
        {
          sql: `CREATE TABLE IF NOT EXISTS file_markdown (
          id TEXT PRIMARY KEY,
          file_id TEXT NOT NULL REFERENCES file(id),
          markdown_id TEXT NOT NULL REFERENCES markdown(id),
          UNIQUE(file_id, markdown_id)
        )`,
          args: [],
        },
      ]);

      // Create indexes
      setProgress(14);
      const indexes = [
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

      for (const index of indexes) {
        await tursoClient.execute([
          {
            sql: index,
            args: [],
          },
        ]);
      }

      // first Tract Stack
      setProgress(15);
      await tursoClient.execute([
        {
          sql: "INSERT INTO tractstack (id, title, slug, social_image_path) VALUES (?, ?, ?, ?)",
          args: [ulid(), "Tract Stack", "HELLO", ""],
        },
      ]);

      setProgress(16);
      setTimeout(() => {
        navigate("/storykeep");
      }, 1000);
    } catch (err) {
      console.error("Database initialization error:", err);
      setError(err instanceof Error ? err.message : "Failed to initialize database");
    }
  };

  return (
    <div className="space-y-4">
      {!isInitializing ? (
        <button
          onClick={initializeDatabase}
          className="px-4 py-2 text-white bg-myorange rounded hover:bg-myblue"
        >
          Initialize Database Tables
        </button>
      ) : (
        <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-sm sm:p-6">
          <div>
            <div className="mt-3 text-center sm:mt-5">
              <h3 className="text-lg font-bold leading-6 text-mydarkgrey">
                {error ? "Initialization Error" : "Initializing Database..."}
              </h3>

              {!error && (
                <div className="mt-4">
                  <div className="h-2 w-full bg-mylightgrey/20 rounded-full">
                    <div
                      className="h-full rounded-full transition-all duration-500 bg-myorange"
                      style={{ width: `${(progress / 15) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="mt-4">
                <p className="text-sm text-mydarkgrey">
                  {error ? error : "Creating tables and indexes..."}
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-5 sm:mt-6">
              <button
                type="button"
                className="inline-flex w-full justify-center rounded-md bg-myorange px-3 py-2 text-sm font-bold text-black hover:bg-black hover:text-white"
                onClick={() => {
                  setError(null);
                  setIsInitializing(false);
                }}
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DatabaseBootstrap;
