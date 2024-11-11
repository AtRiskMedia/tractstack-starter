import type { Row } from "@libsql/client";
import type { DatumPayload } from "../../types";
import { cleanTursoResource } from "../../utils/compositor/tursoResource";
import { cleanTursoFile } from "../../utils/compositor/tursoFile";
import { cleanTursoMenu } from "../../utils/compositor/tursoMenu";
import { cleanTursoTractStack } from "../../utils/compositor/tursoTractStack";

export function cleanTursoPayload(row: Row): DatumPayload {
  if (!row)
    return {
      files: [],
      tractstack: [],
      resources: [],
      menus: [],
    };
  const resourcesPayload = (typeof row?.resources === `string` && JSON.parse(row.resources)) || [];
  const filesPayload = (typeof row?.files === `string` && JSON.parse(row.files)) || [];
  const menusPayload = (typeof row?.menus === `string` && JSON.parse(row.menus)) || [];
  const tractstackPayload =
    (typeof row?.tractstack === `string` && JSON.parse(row.tractstack)) || [];
  const files = cleanTursoFile(filesPayload);
  const resources = cleanTursoResource(resourcesPayload);
  const tractstack = cleanTursoTractStack(tractstackPayload);
  const menus = cleanTursoMenu(menusPayload);

  return {
    files: files || [],
    tractstack: tractstack || [],
    resources: resources || [],
    menus: menus || [],
  };
}
