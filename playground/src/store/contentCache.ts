import { atom, map } from "nanostores";
import type {
  TractStackRowData,
  StoryFragmentRowData,
  PaneRowData,
  MarkdownRowData,
  MenuRowData,
  ImageFileRowData,
  ResourceRowData,
  BeliefRowData,
} from "@/store/nodesSerializer";
import type { FullContentMap } from "@/types";

const VERBOSE = true;

interface CacheEntry<T> {
  data: T;
  accessed: number;
  added: number;
}

interface CacheStats {
  hits: number;
  misses: number;
}

interface BatchCacheData {
  tractStacks?: TractStackRowData[];
  storyFragments?: StoryFragmentRowData[];
  panes?: PaneRowData[];
  markdowns?: MarkdownRowData[];
  menus?: MenuRowData[];
  files?: ImageFileRowData[];
  resources?: ResourceRowData[];
  beliefs?: BeliefRowData[];
}

// TTL in milliseconds (24 hours)
const CACHE_TTL = 24 * 60 * 60 * 1000;

export const cacheStatsStore = map<CacheStats>({
  hits: 0,
  misses: 0,
});

export function updateCacheStats(isHit: boolean) {
  const currentStats = cacheStatsStore.get();
  const currentHits = currentStats.hits + (isHit ? 1 : 0);
  const currentMisses = currentStats.misses + (isHit ? 0 : 1);
  const ratio = (currentHits / (currentHits + currentMisses)) * 100 || 0;
  if (VERBOSE && isHit) console.log(`🟢 Cache hit ${ratio}%`);
  else if (VERBOSE) console.log(`🔴 Cache miss ${ratio}%`);
  cacheStatsStore.set({
    hits: currentStats.hits + (isHit ? 1 : 0),
    misses: currentStats.misses + (isHit ? 0 : 1),
  });
}

type ContentMapStore = {
  items: FullContentMap[] | null;
  lastUpdated: number | null;
};

export const contentMapStore = atom<ContentMapStore>({
  items: null,
  lastUpdated: null,
});

export const tractStackStore = map<{
  byId: Record<string, CacheEntry<TractStackRowData>>;
  bySlug: Record<string, string>;
}>({
  byId: {},
  bySlug: {},
});

export const storyFragmentStore = map<{
  byId: Record<string, CacheEntry<StoryFragmentRowData>>;
  bySlug: Record<string, string>;
}>({
  byId: {},
  bySlug: {},
});

export const paneStore = map<{
  byId: Record<string, CacheEntry<PaneRowData>>;
  bySlug: Record<string, string>;
}>({
  byId: {},
  bySlug: {},
});

export const markdownStore = map<{
  byId: Record<string, CacheEntry<MarkdownRowData>>;
}>({
  byId: {},
});

export const menuStore = map<{
  byId: Record<string, CacheEntry<MenuRowData>>;
}>({
  byId: {},
});

export const fileStore = map<{
  byId: Record<string, CacheEntry<ImageFileRowData>>;
}>({
  byId: {},
});

export const resourceStore = map<{
  byId: Record<string, CacheEntry<ResourceRowData>>;
  bySlug: Record<string, string>;
  byCategory: Record<string, string[]>;
}>({
  byId: {},
  bySlug: {},
  byCategory: {},
});

export const beliefStore = map<{
  byId: Record<string, CacheEntry<BeliefRowData>>;
  bySlug: Record<string, string>;
}>({
  byId: {},
  bySlug: {},
});

export const cacheMetaStore = map<{
  initialized: boolean;
  lastFullUpdate: number | null;
  errors: Record<string, string>;
}>({
  initialized: false,
  lastFullUpdate: null,
  errors: {},
});

function isCacheValid<T>(entry: CacheEntry<T> | undefined): boolean {
  updateCacheStats(!!entry);
  if (!entry) return false;
  return Date.now() - entry.accessed < CACHE_TTL;
}

function createCacheEntry<T>(data: T): CacheEntry<T> {
  const now = Date.now();
  return {
    data,
    accessed: now,
    added: now,
  };
}

function touchCacheEntry<T>(entry: CacheEntry<T>): CacheEntry<T> {
  return {
    ...entry,
    accessed: Date.now(),
  };
}

export function setCachedContentMap(items: FullContentMap[] | null) {
  contentMapStore.set({
    items: items?.length ? items : null,
    lastUpdated: items?.length ? Date.now() : null,
  });
}

export function getCachedContentMap(): FullContentMap[] | null {
  const store = contentMapStore.get();
  const isValid = store.lastUpdated && Date.now() - store.lastUpdated < CACHE_TTL;
  updateCacheStats(!!isValid);
  if (isValid) {
    return store.items;
  }
  return null;
}

export function getCachedTractStackById(id: string): TractStackRowData | null {
  const entry = tractStackStore.get().byId[id];
  if (!isCacheValid(entry)) return null;

  const updatedEntry = touchCacheEntry(entry);
  tractStackStore.setKey("byId", {
    ...tractStackStore.get().byId,
    [id]: updatedEntry,
  });

  return updatedEntry.data;
}

export function getCachedTractStackBySlug(slug: string): TractStackRowData | null {
  const id = tractStackStore.get().bySlug[slug];
  updateCacheStats(!!id);
  if (!id) return null;
  return getCachedTractStackById(id);
}

export function setCachedTractStack(data: TractStackRowData) {
  const entry = createCacheEntry(data);
  tractStackStore.set({
    byId: {
      ...tractStackStore.get().byId,
      [data.id]: entry,
    },
    bySlug: {
      ...tractStackStore.get().bySlug,
      [data.slug]: data.id,
    },
  });
}

export function getCachedStoryFragmentById(id: string): StoryFragmentRowData | null {
  const entry = storyFragmentStore.get().byId[id];
  if (!isCacheValid(entry)) return null;

  const updatedEntry = touchCacheEntry(entry);
  storyFragmentStore.setKey("byId", {
    ...storyFragmentStore.get().byId,
    [id]: updatedEntry,
  });

  return updatedEntry.data;
}

export function getCachedStoryFragmentBySlug(slug: string): StoryFragmentRowData | null {
  const id = storyFragmentStore.get().bySlug[slug];
  updateCacheStats(!!id);
  if (!id) return null;
  return getCachedStoryFragmentById(id);
}

export function setCachedStoryFragment(data: StoryFragmentRowData) {
  const entry = createCacheEntry(data);
  storyFragmentStore.set({
    byId: {
      ...storyFragmentStore.get().byId,
      [data.id]: entry,
    },
    bySlug: {
      ...storyFragmentStore.get().bySlug,
      [data.slug]: data.id,
    },
  });
}

export function getCachedPaneById(id: string): PaneRowData | null {
  const entry = paneStore.get().byId[id];
  if (!isCacheValid(entry)) return null;

  const updatedEntry = touchCacheEntry(entry);
  paneStore.setKey("byId", {
    ...paneStore.get().byId,
    [id]: updatedEntry,
  });

  return updatedEntry.data;
}

export function getCachedMarkdownById(id: string): MarkdownRowData | null {
  const entry = markdownStore.get().byId[id];
  if (!isCacheValid(entry)) return null;

  const updatedEntry = touchCacheEntry(entry);
  markdownStore.setKey("byId", {
    ...markdownStore.get().byId,
    [id]: updatedEntry,
  });

  return updatedEntry.data;
}

export function getCachedPaneBySlug(slug: string): PaneRowData | null {
  const id = paneStore.get().bySlug[slug];
  updateCacheStats(!!id);
  if (!id) return null;
  return getCachedPaneById(id);
}

export function setCachedPane(data: PaneRowData) {
  const entry = createCacheEntry(data);
  paneStore.set({
    byId: {
      ...paneStore.get().byId,
      [data.id]: entry,
    },
    bySlug: {
      ...paneStore.get().bySlug,
      [data.slug]: data.id,
    },
  });
}

export function setCachedMarkdown(data: MarkdownRowData) {
  const entry = createCacheEntry(data);
  markdownStore.set({
    byId: {
      ...markdownStore.get().byId,
      [data.id]: entry,
    },
  });
}

export function getCachedMenuById(id: string): MenuRowData | null {
  const entry = menuStore.get().byId[id];
  if (!isCacheValid(entry)) return null;

  const updatedEntry = touchCacheEntry(entry);
  menuStore.setKey("byId", {
    ...menuStore.get().byId,
    [id]: updatedEntry,
  });

  return updatedEntry.data;
}

export function setCachedMenu(data: MenuRowData) {
  const entry = createCacheEntry(data);
  menuStore.setKey("byId", {
    ...menuStore.get().byId,
    [data.id]: entry,
  });
}

export function getCachedFileById(id: string): ImageFileRowData | null {
  const entry = fileStore.get().byId[id];
  if (!isCacheValid(entry)) return null;

  const updatedEntry = touchCacheEntry(entry);
  fileStore.setKey("byId", {
    ...fileStore.get().byId,
    [id]: updatedEntry,
  });

  return updatedEntry.data;
}

export function setCachedFile(data: ImageFileRowData) {
  const entry = createCacheEntry(data);
  fileStore.setKey("byId", {
    ...fileStore.get().byId,
    [data.id]: entry,
  });
}

export function getCachedResourceById(id: string): ResourceRowData | null {
  const entry = resourceStore.get().byId[id];
  if (!isCacheValid(entry)) return null;

  const updatedEntry = touchCacheEntry(entry);
  resourceStore.setKey("byId", {
    ...resourceStore.get().byId,
    [id]: updatedEntry,
  });

  return updatedEntry.data;
}

export function getCachedResourceBySlug(slug: string): ResourceRowData | null {
  const id = resourceStore.get().bySlug[slug];
  updateCacheStats(!!id);
  if (!id) return null;
  return getCachedResourceById(id);
}

export function getCachedResourcesByCategory(category: string): ResourceRowData[] {
  const ids = resourceStore.get().byCategory[category] || [];
  return ids
    .map((id) => getCachedResourceById(id))
    .filter((resource): resource is ResourceRowData => resource !== null);
}

export function setCachedResource(data: ResourceRowData) {
  const entry = createCacheEntry(data);
  const currentStore = resourceStore.get();

  let byCategory = currentStore.byCategory;
  if (data.category_slug) {
    const categoryIds = new Set(currentStore.byCategory[data.category_slug] || []);
    categoryIds.add(data.id);
    byCategory = {
      ...byCategory,
      [data.category_slug]: Array.from(categoryIds),
    };
  }

  resourceStore.set({
    byId: {
      ...currentStore.byId,
      [data.id]: entry,
    },
    bySlug: {
      ...currentStore.bySlug,
      [data.slug]: data.id,
    },
    byCategory,
  });
}

export function getCachedBeliefById(id: string): BeliefRowData | null {
  const entry = beliefStore.get().byId[id];
  if (!isCacheValid(entry)) return null;

  const updatedEntry = touchCacheEntry(entry);
  beliefStore.setKey("byId", {
    ...beliefStore.get().byId,
    [id]: updatedEntry,
  });

  return updatedEntry.data;
}

export function getCachedBeliefBySlug(slug: string): BeliefRowData | null {
  const id = beliefStore.get().bySlug[slug];
  updateCacheStats(!!id);
  if (!id) return null;
  return getCachedBeliefById(id);
}

export function setCachedBelief(data: BeliefRowData) {
  const entry = createCacheEntry(data);
  beliefStore.set({
    byId: {
      ...beliefStore.get().byId,
      [data.id]: entry,
    },
    bySlug: {
      ...beliefStore.get().bySlug,
      [data.slug]: data.id,
    },
  });
}

export function invalidateCache() {
  contentMapStore.set({ items: [], lastUpdated: null });
  tractStackStore.set({ byId: {}, bySlug: {} });
  storyFragmentStore.set({ byId: {}, bySlug: {} });
  paneStore.set({ byId: {}, bySlug: {} });
  menuStore.set({ byId: {} });
  fileStore.set({ byId: {} });
  resourceStore.set({ byId: {}, bySlug: {}, byCategory: {} });
  beliefStore.set({ byId: {}, bySlug: {} });
  cacheMetaStore.set({
    initialized: false,
    lastFullUpdate: null,
    errors: {},
  });
}

export function invalidateEntry(type: string, id: string) {
  switch (type) {
    case "tractstack": {
      const tractStack = tractStackStore.get().byId[id];
      if (tractStack) {
        const { [id]: removed, ...restById } = tractStackStore.get().byId;
        const { [tractStack.data.slug]: removedSlug, ...restBySlug } = tractStackStore.get().bySlug;
        tractStackStore.set({
          byId: restById,
          bySlug: restBySlug,
        });
      }
      break;
    }

    case "storyfragment": {
      const storyFragment = storyFragmentStore.get().byId[id];
      if (storyFragment) {
        const { [id]: removed, ...restById } = storyFragmentStore.get().byId;
        const { [storyFragment.data.slug]: removedSlug, ...restBySlug } =
          storyFragmentStore.get().bySlug;
        storyFragmentStore.set({
          byId: restById,
          bySlug: restBySlug,
        });
      }
      break;
    }

    case "pane": {
      const pane = paneStore.get().byId[id];
      if (pane) {
        const { [id]: removed, ...restById } = paneStore.get().byId;
        const { [pane.data.slug]: removedSlug, ...restBySlug } = paneStore.get().bySlug;
        paneStore.set({
          byId: restById,
          bySlug: restBySlug,
        });
      }
      break;
    }

    case "menu": {
      const { [id]: removed, ...rest } = menuStore.get().byId;
      menuStore.setKey("byId", rest);
      break;
    }

    case "file": {
      const { [id]: removed, ...rest } = fileStore.get().byId;
      fileStore.setKey("byId", rest);
      break;
    }

    case "resource": {
      const resource = resourceStore.get().byId[id];
      if (resource) {
        // Remove from byId
        const { [id]: removed, ...restById } = resourceStore.get().byId;
        // Remove from bySlug
        const { [resource.data.slug]: removedSlug, ...restBySlug } = resourceStore.get().bySlug;
        // Remove from byCategory
        const byCategory = { ...resourceStore.get().byCategory };
        if (resource.data.category_slug && byCategory[resource.data.category_slug]) {
          byCategory[resource.data.category_slug] = byCategory[resource.data.category_slug].filter(
            (categoryId) => categoryId !== id
          );
          // Remove category if empty
          if (byCategory[resource.data.category_slug].length === 0) {
            delete byCategory[resource.data.category_slug];
          }
        }
        resourceStore.set({
          byId: restById,
          bySlug: restBySlug,
          byCategory,
        });
      }
      break;
    }

    case "belief": {
      const belief = beliefStore.get().byId[id];
      if (belief) {
        const { [id]: removed, ...restById } = beliefStore.get().byId;
        const { [belief.data.slug]: removedSlug, ...restBySlug } = beliefStore.get().bySlug;
        beliefStore.set({
          byId: restById,
          bySlug: restBySlug,
        });
      }
      break;
    }

    default:
      console.warn(`Invalid content type for cache invalidation: ${type}`);
  }
}

// Error handling
export function setCacheError(key: string, error: string) {
  cacheMetaStore.setKey("errors", {
    ...cacheMetaStore.get().errors,
    [key]: error,
  });
}

// Initialize cache (to be called from middleware)
export async function initializeCache() {
  try {
    cacheMetaStore.setKey("initialized", true);
    cacheMetaStore.setKey("lastFullUpdate", Date.now());
  } catch (error) {
    console.error("Cache initialization error:", error);
    setCacheError("init", error instanceof Error ? error.message : "Unknown error");
    cacheMetaStore.setKey("initialized", false);
  }
}

export function processBatchCache(batch: BatchCacheData) {
  // Process tractStacks
  if (batch.tractStacks?.length) {
    const tractStackEntries = batch.tractStacks.map((ts) => [ts.id, createCacheEntry(ts)]);
    const tractStackSlugs = batch.tractStacks.map((ts) => [ts.slug, ts.id]);

    tractStackStore.set({
      byId: {
        ...tractStackStore.get().byId,
        ...Object.fromEntries(tractStackEntries),
      },
      bySlug: {
        ...tractStackStore.get().bySlug,
        ...Object.fromEntries(tractStackSlugs),
      },
    });
  }

  // Process storyFragments
  if (batch.storyFragments?.length) {
    const storyFragmentEntries = batch.storyFragments.map((sf) => [sf.id, createCacheEntry(sf)]);
    const storyFragmentSlugs = batch.storyFragments.map((sf) => [sf.slug, sf.id]);

    storyFragmentStore.set({
      byId: {
        ...storyFragmentStore.get().byId,
        ...Object.fromEntries(storyFragmentEntries),
      },
      bySlug: {
        ...storyFragmentStore.get().bySlug,
        ...Object.fromEntries(storyFragmentSlugs),
      },
    });
  }

  // Process panes
  if (batch.panes?.length) {
    const paneEntries = batch.panes.map((p) => [p.id, createCacheEntry(p)]);
    const paneSlugs = batch.panes.map((p) => [p.slug, p.id]);

    paneStore.set({
      byId: {
        ...paneStore.get().byId,
        ...Object.fromEntries(paneEntries),
      },
      bySlug: {
        ...paneStore.get().bySlug,
        ...Object.fromEntries(paneSlugs),
      },
    });
  }

  // Process markdowns
  if (batch.markdowns?.length) {
    const markdownEntries = batch.markdowns.map((m) => [m.id, createCacheEntry(m)]);

    markdownStore.set({
      byId: {
        ...markdownStore.get().byId,
        ...Object.fromEntries(markdownEntries),
      },
    });
  }

  // Process menus
  if (batch.menus?.length) {
    const menuEntries = batch.menus.map((m) => [m.id, createCacheEntry(m)]);

    menuStore.setKey("byId", {
      ...menuStore.get().byId,
      ...Object.fromEntries(menuEntries),
    });
  }

  // Process files
  if (batch.files?.length) {
    const fileEntries = batch.files.map((f) => [f.id, createCacheEntry(f)]);

    fileStore.setKey("byId", {
      ...fileStore.get().byId,
      ...Object.fromEntries(fileEntries),
    });
  }

  // Process resources
  if (batch.resources?.length) {
    const resourceEntries = batch.resources.map((r) => [r.id, createCacheEntry(r)]);
    const resourceSlugs = batch.resources.map((r) => [r.slug, r.id]);

    // Build category mapping
    const categoryMapping = batch.resources.reduce(
      (acc, resource) => {
        if (resource.category_slug) {
          if (!acc[resource.category_slug]) {
            acc[resource.category_slug] = new Set();
          }
          acc[resource.category_slug].add(resource.id);
        }
        return acc;
      },
      {} as Record<string, Set<string>>
    );

    // Convert Sets to arrays and merge with existing categories
    const byCategory = {
      ...resourceStore.get().byCategory,
      ...Object.fromEntries(
        Object.entries(categoryMapping).map(([category, ids]) => [category, Array.from(ids)])
      ),
    };

    resourceStore.set({
      byId: {
        ...resourceStore.get().byId,
        ...Object.fromEntries(resourceEntries),
      },
      bySlug: {
        ...resourceStore.get().bySlug,
        ...Object.fromEntries(resourceSlugs),
      },
      byCategory,
    });
  }

  // Process beliefs
  if (batch.beliefs?.length) {
    const beliefEntries = batch.beliefs.map((b) => [b.id, createCacheEntry(b)]);
    const beliefSlugs = batch.beliefs.map((b) => [b.slug, b.id]);

    beliefStore.set({
      byId: {
        ...beliefStore.get().byId,
        ...Object.fromEntries(beliefEntries),
      },
      bySlug: {
        ...beliefStore.get().bySlug,
        ...Object.fromEntries(beliefSlugs),
      },
    });
  }
}
