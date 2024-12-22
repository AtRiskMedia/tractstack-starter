import type { Row } from "@libsql/client";
import type { FileNode } from "../../../types";

export function getFileNodes(rows: Row[]): FileNode[] {
  if (!rows.length) return [];

  const payload: FileNode[] = rows
    .map((r: Row) => {
      if (
        typeof r?.id === "string" &&
        typeof r?.filename === "string" &&
        typeof r?.alt_description === "string" &&
        typeof r?.src_set === "number" &&
        typeof r?.url === "string"
      ) {
        return {
          id: r.id,
          filename: r.filename,
          altDescription: r.alt_description,
          url: r.url,
          srcSet: r.src_set === 1,
        } as FileNode;
      }
      return null;
    })
    .filter((n): n is FileNode => n !== null);

  return payload;
}
