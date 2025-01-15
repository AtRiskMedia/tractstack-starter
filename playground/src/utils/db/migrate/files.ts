import type { Row } from "@libsql/client";
import type { ImageFileNode } from "../../../types";

function createSrcSet(url: string): string {
  const lastSlashIndex = url.lastIndexOf("/");
  const basePath = url.substring(0, lastSlashIndex + 1);
  const filename = url.substring(lastSlashIndex + 1);
  const nameWithoutExt = filename.substring(0, filename.lastIndexOf("."));
  const extension = filename.substring(filename.lastIndexOf("."));
  const mobile = `${basePath}${nameWithoutExt}_600px${extension} 600w`;
  const tablet = `${basePath}${nameWithoutExt}_1080px${extension} 1080w`;
  const desktop = `${basePath}${nameWithoutExt}_1920px${extension} 1920w`;
  return [mobile, tablet, desktop].join(", ");
}

export function getFileNodes(rows: Row[]): ImageFileNode[] {
  if (!rows.length) return [];

  return rows
    .map((r: Row) => {
      if (
        typeof r?.id === "string" &&
        typeof r?.filename === "string" &&
        typeof r?.alt_description === "string" &&
        typeof r?.src_set === "number" &&
        typeof r?.url === "string"
      ) {
        const isSourceSet = r.src_set === 1;
        const node: ImageFileNode = {
          id: r.id,
          parentId: null,
          filename: r.filename,
          nodeType: `File`,
          altDescription: r.alt_description,
          src: isSourceSet
            ? `${r.url.substring(0, r.url.lastIndexOf("."))}_600px${r.url.substring(r.url.lastIndexOf("."))}`
            : r.url,
        };

        if (isSourceSet) {
          node.srcSet = createSrcSet(r.url);
        }

        return node;
      }
      return null;
    })
    .filter((n): n is ImageFileNode => n !== null);
}
