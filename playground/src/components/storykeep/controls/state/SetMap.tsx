import { useEffect } from "react";
import { contentMap, codehookMap } from "@/store/events.ts";
import {
  brandColours,
  preferredTheme,
  homeSlugStore,
  tractstackSlugStore,
  hasAssemblyAIStore,
  storyfragmentAnalyticsStore,
  isDemoModeStore,
  hasArtpacksStore,
  tenantIdStore,
} from "@/store/storykeep.ts";
import type { ArtpacksStore, Theme, FullContentMap, StoryfragmentAnalytics } from "@/types.ts";

const SetMap = (props: {
  payload: FullContentMap[];
  analytics: StoryfragmentAnalytics[];
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
    analytics,
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
    if (analytics.length > 0) {
      const analyticsById = analytics.reduce(
        (acc, item) => {
          acc[item.id] = item;
          return acc;
        },
        {} as Record<string, StoryfragmentAnalytics>
      );

      storyfragmentAnalyticsStore.set({
        byId: analyticsById,
        lastUpdated: Date.now(),
      });
    }
  }, []);

  return <div />;
};

export default SetMap;
