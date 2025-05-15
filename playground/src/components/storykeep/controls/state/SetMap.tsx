import { useEffect } from "react";
import { contentMap, codehookMap } from "@/store/events.ts";
import {
  brandColours,
  preferredTheme,
  homeSlugStore,
  tractstackSlugStore,
  hasAssemblyAIStore,
  isDemoModeStore,
  hasArtpacksStore,
  tenantIdStore,
} from "@/store/storykeep.ts";
import type { ArtpacksStore, Theme, FullContentMap } from "@/types.ts";

const SetMap = (props: {
  payload: FullContentMap[];
  availableCodeHooks: string[];
  brand: string;
  theme: Theme;
  homeSlug: string;
  tractstackSlug: string;
  hasAssemblyAI: boolean;
  isDemoMode: boolean;
  artpacks: ArtpacksStore;
  tenantId: string;
}) => {
  const {
    payload,
    availableCodeHooks,
    brand,
    theme,
    homeSlug,
    tractstackSlug,
    hasAssemblyAI,
    isDemoMode,
    artpacks,
    tenantId,
  } = props;

  useEffect(() => {
    contentMap.set(payload);
    codehookMap.set(availableCodeHooks);
    brandColours.set(brand);
    preferredTheme.set(theme);
    homeSlugStore.set(homeSlug);
    tractstackSlugStore.set(tractstackSlug);
    hasAssemblyAIStore.set(hasAssemblyAI);
    isDemoModeStore.set(isDemoMode);
    hasArtpacksStore.set(artpacks);
    tenantIdStore.set(tenantId);
  }, []);

  return <div />;
};

export default SetMap;
