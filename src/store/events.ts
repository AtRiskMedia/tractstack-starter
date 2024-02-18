import { persistentMap, persistentAtom } from "@nanostores/persistent";

type ContentMapValue = {
  [string]: {
    title: string;
    type: `Pane` | `StoryFragment` | `TractStack`;
    slug: string;
    parentId?: string;
  };
};

export const lastRun = persistentAtom("lastRun", 0);

export const contentMap = persistentMap<ContentMapValue>("contentMap:", {});

export const events = persistentAtom<EventStream[]>("events", [], {
  encode: JSON.stringify,
  decode: JSON.parse,
});
