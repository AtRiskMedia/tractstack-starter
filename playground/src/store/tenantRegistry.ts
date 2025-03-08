import { atom } from "nanostores";
import path from "path";

export const tenantRegistry = atom<
  Record<
    string,
    {
      id: string;
      dbPath: string;
      configPath: string;
      publicPath: string;
      lastAccessed: number;
      exists: boolean;
    }
  >
>({
  default: {
    id: "default",
    dbPath: path.join(process.cwd(), ".tractstack"),
    configPath: path.join(process.cwd(), "config"),
    publicPath: path.join(process.cwd(), "public"),
    lastAccessed: Date.now(),
    exists: true,
  },
});
