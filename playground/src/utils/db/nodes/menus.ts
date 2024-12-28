import type { Row } from "@libsql/client";
import type { MenuNode } from "../../../types";

export function getMenuNodes(rows: Row[]): MenuNode[] {
  if (!rows.length) return [];

  const payload: (MenuNode | null)[] = rows.map((r: Row) => {
    if (
      typeof r?.id === `string` &&
      typeof r?.title === `string` &&
      typeof r?.theme === `string` &&
      typeof r?.options_payload === `string`
    )
      return {
        id: r.id,
        title: r.title,
        theme: r.theme,
        optionsPayload:
          (typeof r?.options_payload === `string` && JSON.parse(r.options_payload)) || null,
      };
    return null;
  });

  return payload.filter((n): n is MenuNode => n !== null);
}
