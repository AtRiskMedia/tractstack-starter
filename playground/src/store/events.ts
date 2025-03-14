import { map, atom } from "nanostores";
import type { Current, EventStream, StoryStep, FullContentMap, PanesVisible } from "../types";

export const events = atom<EventStream[]>([]);
export const contentMap = atom<FullContentMap[]>([]);
export const codehookMap = atom<string[]>([]);
export const current = atom<Current>({
  id: ``,
  slug: ``,
  title: ``,
  isContextPane: false,
});
export const storySteps = atom<StoryStep[]>([]);
export const loaded = atom<boolean>(false);
export const showImpressions = atom<boolean>(false);
export const panesVisible = map<PanesVisible>({});
export const pageLoadTime = atom<number>(Date.now());
