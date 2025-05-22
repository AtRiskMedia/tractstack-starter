import { useEffect } from "react";
import { contentMap, codehookMap } from "@/store/events.ts";
import {
  brandColours,
  preferredTheme,
  homeSlugStore,
  tractstackSlugStore,
  hasAssemblyAIStore,
  isDemoModeStore,
  isAdminStore,
  canonicalURLStore,
  hasArtpacksStore,
  tenantIdStore,
  urlParamsStore,
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
  isAdmin: boolean;
  canonicalURL: string;
  urlParams: Record<string, string | boolean>;
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
    isAdmin,
    canonicalURL,
    urlParams,
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
    isAdminStore.set(isAdmin);
    canonicalURLStore.set(canonicalURL);
    hasArtpacksStore.set(artpacks);
    tenantIdStore.set(tenantId);
    urlParamsStore.set(urlParams);
  }, []);

  return <div />;
};

export default SetMap;
