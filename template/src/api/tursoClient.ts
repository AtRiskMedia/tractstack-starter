import { createClient } from "@libsql/client/web";
import { createTursoClient } from "../db/utils";
import type { Client, ResultSet } from "@libsql/client";
import type {
  TursoQuery,
  PaneDesign,
  FileDatum,
  PaneDesignBgPane,
  PaneDesignMarkdown,
  BgColourDatum,
} from "../types";

declare global {
  interface Window {
    __PREVIEW_MODE__?: boolean;
  }
}

// Interface for database pane results
interface PaneResult {
  id: string;
  title: string;
  slug: string;
  created: string;
  changed: string | null;
  markdown_id: string | null;
  markdown_body: string | null;
  options_payload: string;
  is_context_pane: number;
  height_offset_desktop: number | null;
  height_offset_tablet: number | null;
  height_offset_mobile: number | null;
  height_ratio_desktop: string | null;
  height_ratio_tablet: string | null;
  height_ratio_mobile: string | null;
  files: string;
}

class TursoClientWrapper {
  private client: Client | null = null;

  private async getClient(): Promise<Client> {
    if (!this.client) {
      const previewMode = window.__PREVIEW_MODE__ || false;
      const url = import.meta.env.TURSO_DATABASE_URL;
      const authToken = import.meta.env.TURSO_AUTH_TOKEN;

      if (previewMode || import.meta.env.DEV) {
        // Use embedded replica for development/preview mode
        this.client = createClient({
          url: "libsql://local",
        });
      } else if (url && authToken) {
        // Production mode with credentials
        this.client = createClient({
          url,
          authToken,
        });
      } else {
        // Fallback to embedded replica
        this.client = createClient({
          url: "libsql://local",
        });
      }
    }
    return this.client;
  }

  async execute(queries: TursoQuery | TursoQuery[]): Promise<ResultSet[]> {
    const client = await this.getClient();
    if (Array.isArray(queries)) {
      const results: ResultSet[] = [];
      for (const query of queries) {
        results.push(await client.execute(query));
      }
      return results;
    }
    return [await client.execute(queries)];
  }

  async paneDesigns(): Promise<PaneDesign[]> {
    const client = await this.getClient();
    const result = await client.execute(`
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

    return result.rows.map((row) => {
      const paneResult = row as unknown as PaneResult;
      let optionsPayload: any;
      let files: FileDatum[] = [];

      try {
        optionsPayload = JSON.parse(paneResult.options_payload);
        files = JSON.parse(paneResult.files).map((file: any) => ({
          id: file.id,
          filename: file.filename,
          altDescription: file.alt_description,
          paneId: file.paneId,
          markdown: file.markdown,
          src: file.url,
          srcSet: file.src_set,
        }));
      } catch {
        optionsPayload = {};
      }

      // Create default fragments based on markdown content
      const fragments: (PaneDesignBgPane | PaneDesignMarkdown | BgColourDatum)[] = [];

      if (paneResult.markdown_body) {
        fragments.push({
          id: `${paneResult.id}-markdown`,
          type: "markdown",
          markdownBody: paneResult.markdown_body,
          textShapeOutsideDesktop: optionsPayload.textShapeOutsideDesktop || "",
          textShapeOutsideTablet: optionsPayload.textShapeOutsideTablet || "",
          textShapeOutsideMobile: optionsPayload.textShapeOutsideMobile || "",
          imageMaskShapeDesktop: optionsPayload.imageMaskShapeDesktop || "",
          imageMaskShapeTablet: optionsPayload.imageMaskShapeTablet || "",
          imageMaskShapeMobile: optionsPayload.imageMaskShapeMobile || "",
          isModal: Boolean(optionsPayload.isModal),
          hiddenViewports: optionsPayload.hiddenViewports || "",
          optionsPayload: optionsPayload.markdownOptionsPayload || {},
        });
      }

      return {
        id: paneResult.id,
        slug: paneResult.slug,
        name: paneResult.title,
        variants: optionsPayload.variants || [],
        img: optionsPayload.img || "",
        priority: optionsPayload.priority || 999,
        type: (optionsPayload.type as "starter" | "break" | "reuse") || "reuse",
        panePayload: {
          heightOffsetDesktop: paneResult.height_offset_desktop || 0,
          heightOffsetTablet: paneResult.height_offset_tablet || 0,
          heightOffsetMobile: paneResult.height_offset_mobile || 0,
          heightRatioDesktop: paneResult.height_ratio_desktop || "1/1",
          heightRatioTablet: paneResult.height_ratio_tablet || "1/1",
          heightRatioMobile: paneResult.height_ratio_mobile || "1/1",
          bgColour: optionsPayload.bgColour || false,
          codeHook: optionsPayload.codeHook || null,
        },
        files,
        fragments,
        orientation: optionsPayload.orientation as "above" | "below" | undefined,
      };
    });
  }

  async uniqueTailwindClasses(id: string): Promise<string[]> {
    const client = await this.getClient();
    const result = await client.execute({
      sql: `SELECT id, options_payload FROM pane WHERE id != ?`,
      args: [id],
    });

    return result.rows
      .map((row) => {
        try {
          const payload = JSON.parse(row.options_payload as string);
          return payload.classes || [];
        } catch {
          return [];
        }
      })
      .flat()
      .filter((value: unknown): value is string => typeof value === "string");
  }
}

export const tursoClient = new TursoClientWrapper();
