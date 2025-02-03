/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Row } from "@libsql/client";

export function getTailwindWhitelist(rows: Row[]) {
  if (!rows.length) return [];
  const uniqueClasses = new Set();
  rows.forEach((r: Row) => {
    if (typeof r.id === `string` && typeof r.options_payload === `string`) {
      const optionPayload = JSON.parse(r.options_payload);
      optionPayload?.nodes?.forEach((node: any) => {
        if (node.parentCss && Array.isArray(node.parentCss)) {
          node.parentCss.forEach((classString: string) => {
            const classes = classString.split(" ");
            classes.forEach((className: string) => uniqueClasses.add(className));
          });
        }
        if (node.elementCss) {
          const classes = node.elementCss.split(" ");
          classes.forEach((className: string) => uniqueClasses.add(className));
        }
      });
    }
  });
  return Array.from(uniqueClasses);
}
