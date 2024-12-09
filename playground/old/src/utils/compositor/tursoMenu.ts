import type { Row } from "@libsql/client";
import type { MenuDatum } from "../../types";

export function cleanTursoMenu(rows: Row[]): MenuDatum[] {
  if (!rows.length) return [];

  const payload: (MenuDatum | null)[] = rows.map((r: Row) => {
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

  return payload.filter((n): n is MenuDatum => n !== null);
}
