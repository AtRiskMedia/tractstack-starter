import { persistentMap, persistentAtom } from "@nanostores/persistent";

export type EventStream = {
  id: string;
  type: string;
  verb: string;
  targetId?: string;
  duration?: number;
  score?: string;
  title?: string;
  targetSlug?: string;
  isContextPane?: string;
};
type ContentMapValue = {
  [key: string]: {
    title: string;
    type: `Pane` | `StoryFragment` | `TractStack`;
    slug: string;
    parentId?: string;
  };
};

export const lastRun = persistentAtom<string>(`0`);

export const contentMap = persistentMap<ContentMapValue>(
  "contentMap:",
  {},
  {
    encode: JSON.stringify,
    decode: JSON.parse,
  }
);

export const events = persistentAtom<EventStream[]>("events", [], {
  encode: JSON.stringify,
  decode: JSON.parse,
});
