import { map, atom } from "nanostores";
import type { Current, EventStream, StoryStep, ContentMap, PanesVisible } from "../types";

export const events = atom<EventStream[]>([]);
export const contentMap = atom<ContentMap[]>([]);
export const current = atom<Current>({
  id: ``,
  slug: ``,
  title: ``,
});
export const storySteps = atom<StoryStep[]>([]);
export const loaded = atom<boolean>(false);
export const showImpressions = atom<boolean>(false);
export const panesVisible = map<PanesVisible>({});
export const pageLoadTime = atom<number>(Date.now());
