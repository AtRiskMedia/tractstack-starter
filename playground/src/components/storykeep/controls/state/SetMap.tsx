import { useEffect } from "react";
import { contentMap, codehookMap } from "@/store/events.ts";
import {
  brandColours,
  preferredTheme,
  homeSlugStore,
  tractstackSlugStore,
} from "@/store/storykeep.ts";
import type { Theme, FullContentMap } from "@/types.ts";

const SetMap = (props: {
  payload: FullContentMap[];
  availableCodeHooks: string[];
  brand: string;
  theme: Theme;
  homeSlug: string;
  tractstackSlug: string;
}) => {
  const { payload, availableCodeHooks, brand, theme, homeSlug, tractstackSlug } = props;

  useEffect(() => {
    contentMap.set(payload);
    codehookMap.set(availableCodeHooks);
    brandColours.set(brand);
    preferredTheme.set(theme);
    homeSlugStore.set(homeSlug);
    tractstackSlugStore.set(tractstackSlug);
  }, []);

  return <div />;
};

export default SetMap;
