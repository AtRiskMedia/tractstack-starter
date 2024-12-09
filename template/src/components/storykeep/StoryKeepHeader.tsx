import { useState, useRef, useEffect, memo } from "react";
import { navigate } from "astro:transitions/client";
import { useStore } from "@nanostores/react";
import RectangleGroupIcon from "@heroicons/react/24/outline/RectangleGroupIcon";
import PresentationChartBarIcon from "@heroicons/react/24/outline/PresentationChartBarIcon";
import AdjustmentsVerticalIcon from "@heroicons/react/24/outline/AdjustmentsVerticalIcon";
import CursorArrowRippleIcon from "@heroicons/react/24/outline/CursorArrowRippleIcon";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import CheckIcon from "@heroicons/react/24/outline/CheckIcon";
import { SaveProcessModal } from "./components/SaveProcessModal";
import ViewportSelector from "./components/ViewportSelector";
import ToolModeSelector from "./components/ToolModeSelector";
import PaneTitle from "./fields/PaneTitle";
import PaneSlug from "./fields/PaneSlug";
import StoryFragmentTitle from "./fields/StoryFragmentTitle";
import StoryFragmentSlug from "./fields/StoryFragmentSlug";
import { StoryFragmentSettings } from "./settings/StoryFragmentSettings";
import {
  editModeStore,
  unsavedChangesStore,
  temporaryErrorsStore,
  uncleanDataStore,
  paneInit,
  paneSlug,
  paneTitle,
  storyFragmentInit,
  storyFragmentSlug,
  storyFragmentTitle,
  storyFragmentPaneIds,
  paneFragmentIds,
  viewportStore,
  viewportKeyStore,
  viewportSetStore,
  toolModeStore,
  toolAddModeStore,
  showAnalytics,
  storedAnalytics,
  analyticsDuration,
  creationStateStore,
} from "../../store/storykeep";
import { contentMap } from "../../store/events";
import { classNames, cleanString, findUniqueSlug } from "../../utils/helpers";
import { useStoryKeepUtils } from "../../utils/storykeep";
import type {
  MenuDatum,
  AuthStatus,
  StoreKey,
  ToolMode,
  ToolAddMode,
  Analytics,
  RawAnalytics,
  AnalyticsItem,
  PieDataItem,
  LineDataSeries,
  StoryFragmentDatum,
  ContextPaneDatum,
} from "../../types";
import { AddElementsPanel } from "@/components/storykeep/components/AddElementsPanel.tsx";

const processedAnalytics = (data: RawAnalytics): Analytics => {
  const result: Analytics = {};

  // Process pie data
  data.pie.forEach((item: AnalyticsItem) => {
    result[item.object_id] = {
      ...result[item.object_id],
      pie: item.verbs as PieDataItem[],
    };
  });

  // Process line data
  data.line.forEach((item: AnalyticsItem) => {
    result[item.object_id] = {
      ...result[item.object_id],
      line: item.verbs as LineDataSeries[],
    };
  });
  return result;
};

export const StoryKeepHeader = memo(
  ({
    id,
    slug,
    user,
    isContext,
    originalData,
    hasContentReady,
    contentMapSlugs,
    hasTurso,
    menus,
  }: {
    id: string;
    slug: string;
    user: AuthStatus;
    isContext: boolean;
    originalData: StoryFragmentDatum | ContextPaneDatum | null;
    hasContentReady: boolean;
    contentMapSlugs: string[];
    hasTurso: boolean;
    menus: MenuDatum[];
  }) => {
    const [hasAnalytics, setHasAnalytics] = useState(false);
    const $creationState = useStore(creationStateStore);
    const [isSaving, setIsSaving] = useState(false);
    const thisId = slug !== `create` ? id : $creationState.id ? $creationState.id : `error`;
    const $showAnalytics = useStore(showAnalytics);
    const $analyticsDuration = useStore(analyticsDuration);
    const duration = $analyticsDuration;
    const $storyFragmentTitle = useStore(storyFragmentTitle, {
      keys: [thisId],
    });
    const $paneTitle = useStore(paneTitle, { keys: [thisId] });
    const $paneSlug = useStore(paneSlug, { keys: [thisId] });
    const $editMode = useStore(editModeStore);
    const $unsavedChanges = useStore(unsavedChangesStore);
    const $storyFragmentPaneIds = useStore(storyFragmentPaneIds, {
      keys: [thisId],
    });
    const $paneFragmentIds = useStore(paneFragmentIds, { keys: [thisId] });
    const isHome = slug && slug === import.meta.env.PUBLIC_HOME;

    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const $viewportSet = useStore(viewportSetStore);
    const $viewport = useStore(viewportStore);
    const $viewportKey = useStore(viewportKeyStore);
    const viewport = $viewport.value;
    const viewportKey = $viewportKey.value;
    const { value: toolMode } = useStore(toolModeStore);
    const toolAddModeRef = useRef<HTMLSelectElement>(null);
    const $uncleanData = useStore(uncleanDataStore, { keys: [thisId] });
    const $paneInit = useStore(paneInit, { keys: [thisId] });
    const $storyFragmentInit = useStore(storyFragmentInit, { keys: [thisId] });
    const $storyFragmentSlug = useStore(storyFragmentSlug, { keys: [thisId] });
    const [isClient, setIsClient] = useState(false);
    const headerRef = useRef<HTMLDivElement>(null);
    const $contentMap = useStore(contentMap);
    const usedSlugs = [
      ...$contentMap.filter((item) => item.slug !== slug).map((item) => item.slug),
      ...Object.keys($paneSlug).map((s) => $paneSlug[s].current),
      ...Object.keys($storyFragmentSlug).map((s) => $storyFragmentSlug[s].current),
    ];
    const { isEditing, updateStoreField, handleEditingChange, handleUndo } = useStoryKeepUtils(
      thisId,
      usedSlugs
    );
    const [untitled, setUntitled] = useState<boolean>(
      $storyFragmentTitle[thisId]?.current === `` ||
        typeof $storyFragmentTitle[thisId]?.current === `undefined`
    );

    const setViewport = (newViewport: "auto" | "mobile" | "tablet" | "desktop") => {
      const newViewportKey =
        newViewport !== `auto`
          ? newViewport
          : typeof window !== "undefined" && window.innerWidth >= 1368
            ? "desktop"
            : typeof window !== "undefined" && window.innerWidth >= 768
              ? "tablet"
              : "mobile";
      viewportSetStore.set(newViewport !== `auto`);
      viewportStore.set({ value: newViewport });
      viewportKeyStore.set({ value: newViewportKey });
    };

    const setToolMode = (newToolMode: ToolMode) => {
      editModeStore.set(null);
      toolModeStore.set({ value: newToolMode });
    };

    const setToolAddMode = (newToolAddMode: ToolAddMode) => {
      toolAddModeStore.set({ value: newToolAddMode });
    };

    useEffect(() => {
      if (
        untitled &&
        $storyFragmentTitle[id]?.current !== `` &&
        ![`create`, ``].includes($storyFragmentSlug[id]?.current ?? ``)
      ) {
        setUntitled(false);
      }
    }, [isContext, $storyFragmentTitle, $storyFragmentSlug, untitled]);

    useEffect(() => {
      fetchAnalytics();
    }, [duration]);

    async function fetchAnalytics() {
      try {
        const type = isContext ? `pane` : `storyfragment`;
        const response = await fetch(
          `/api/concierge/storykeep/analytics?id=${encodeURIComponent(id)}&type=${encodeURIComponent(type)}&duration=${encodeURIComponent(duration)}`
        );
        const data = await response.json();
        if (data.success) {
          storedAnalytics.set(processedAnalytics(data.data));
          if (Object.keys(data.data?.pie || {}).length || Object.keys(data.data?.line || {}).length)
            setHasAnalytics(true);
        }
      } catch (error) {
        console.error("Error fetching analytics data:", error);
      }
    }

    const handleSave = () => {
      setIsSaving(true);
    };

    const handleSaveComplete = (slug: string) => {
      setIsSaving(false);
      // reload to re-bootstrap from turso (& keep things clean)
      if (!isContext) navigate(`/${slug}/edit`);
      else navigate(`/context/${slug}/edit`);
    };

    useEffect(() => {
      const storyFragmentChanges = Object.values($unsavedChanges[thisId] || {}).some(Boolean);
      const paneIds = isContext ? [thisId] : $storyFragmentPaneIds[thisId]?.current;
      const paneChanges = paneIds?.some((paneId) =>
        Object.values($unsavedChanges[paneId] || {}).some(Boolean)
      );
      const paneFragmentChanges = paneIds?.some((paneId) => {
        const fragmentIds = $paneFragmentIds[paneId]?.current || [];
        return fragmentIds.some((fragmentId) =>
          Object.values($unsavedChanges[fragmentId] || {}).some(Boolean)
        );
      });
      setHasUnsavedChanges(storyFragmentChanges || paneChanges || paneFragmentChanges);
    }, [$unsavedChanges, thisId, $storyFragmentPaneIds, $paneFragmentIds]);

    const handleEditModeToggle = () => {
      if (
        $editMode?.mode === `settings` &&
        $editMode?.type === `storyfragment` &&
        $editMode?.id === thisId
      ) {
        editModeStore.set(null);
      } else {
        editModeStore.set({
          id: thisId,
          mode: `settings`,
          type: `storyfragment`,
        });
      }
    };

    const handleInterceptEdit = (storeKey: StoreKey, editing: boolean) => {
      if (
        !isContext &&
        [`storyFragmentTitle`, `storyFragmentSlug`].includes(storeKey) &&
        [``, `create`].includes($storyFragmentSlug[thisId].current)
      ) {
        const clean = hasContentReady
          ? findUniqueSlug(
              cleanString($storyFragmentTitle[thisId].current).substring(0, 20),
              contentMapSlugs
            )
          : `hello`;
        temporaryErrorsStore.setKey(thisId, {
          ...(temporaryErrorsStore.get()[thisId] || {}),
          [`storyFragmentTitle`]: false,
          [`storyFragmentSlug`]: false,
        });
        uncleanDataStore.setKey(thisId, {
          ...(uncleanDataStore.get()[thisId] || {}),
          [`storyFragmentTitle`]: false,
          [`storyFragmentSlug`]: false,
        });

        storyFragmentSlug.setKey(thisId, {
          current: clean,
          original: clean,
          history: [],
        });
      } else if (
        isContext &&
        [`paneTitle`, `paneSlug`].includes(storeKey) &&
        [``, `create`].includes($paneSlug[thisId].current)
      ) {
        const clean = findUniqueSlug(
          cleanString($paneTitle[thisId].current).substring(0, 20),
          contentMapSlugs
        );
        temporaryErrorsStore.setKey(thisId, {
          ...(temporaryErrorsStore.get()[thisId] || {}),
          [`paneTitle`]: false,
          [`paneSlug`]: false,
        });
        uncleanDataStore.setKey(thisId, {
          ...(uncleanDataStore.get()[thisId] || {}),
          [`paneTitle`]: false,
          [`paneSlug`]: false,
        });
        paneSlug.setKey(thisId, {
          current: clean,
          original: clean,
          history: [],
        });
      }
      return handleEditingChange(storeKey, editing);
    };

    useEffect(() => {
      if (
        (!isContext && $storyFragmentInit[thisId]?.init) ||
        (isContext && $paneInit[thisId]?.init) ||
        (slug === `create` && $creationState.isInitialized)
      ) {
        setIsClient(true);
      }
    }, [thisId, $storyFragmentInit, $paneInit]);

    useEffect(() => {
      if (toolMode === "insert" && toolAddModeRef.current) {
        toolAddModeRef.current.focus();
      }
    }, [toolMode]);

    const toggleAnalytics = () => {
      showAnalytics.set(!$showAnalytics);
    };

    if (!isClient) return <div>Loading...</div>;

    return (
      <div className="w-full shadow-md" ref={headerRef}>
        <div className="w-full my-2 px-4">
          <div className={`flex flex-wrap items-center gap-y-2 gap-x-2.5 justify-around`}>
            <div className={`flex flex-wrap items-center gap-y-2 gap-x-2.5 justify-around`}>
              <ToolModeSelector
                toolMode={toolMode}
                setToolMode={setToolMode}
                isContext={isContext}
              />
              <AddElementsPanel setToolAddMode={setToolAddMode} setToolMode={setToolMode} />
              {/*{toolMode === `insert` ? (*/}
              {/*  <div className="ml-4">*/}
              {/*    <ToolAddModeSelector*/}
              {/*      ref={toolAddModeRef}*/}
              {/*      toolAddMode={toolAddMode}*/}
              {/*      setToolAddMode={setToolAddMode}*/}
              {/*    />*/}
              {/*  </div>*/}
              {/*) : null}*/}
            </div>
            <ViewportSelector
              viewport={viewport}
              viewportKey={viewportKey}
              auto={!$viewportSet}
              setViewport={setViewport}
            />

            <div className="flex flex-nowrap gap-x-2">
              {!isContext ? (
                <button
                  type="button"
                  className="my-1 rounded bg-myblue px-2 py-1 text-lg text-white shadow-sm hover:bg-myorange/50 hover:text-black hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-myorange"
                  onClick={handleEditModeToggle}
                  title="Page Settings"
                >
                  <AdjustmentsVerticalIcon className="h-6 w-6" />
                </button>
              ) : null}

              {id !== `create` && hasUnsavedChanges ? (
                <a
                  data-astro-reload
                  href={
                    slug === `create`
                      ? `/storykeep`
                      : !isContext
                        ? `/${slug}/edit`
                        : `/context/${slug}/edit`
                  }
                  className="inline-block my-1 rounded bg-mydarkgrey px-2 py-1 text-lg text-white shadow-sm hover:bg-myorange/50 hover:text-black hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-myorange"
                >
                  Reset
                </a>
              ) : id !== `create` ? (
                <a
                  data-astro-reload
                  href={!isContext ? `/${slug}` : `/context/${slug}`}
                  className="inline-block my-1 rounded bg-mydarkgrey px-2 py-1 text-lg text-white shadow-sm hover:bg-myorange/50 hover:text-black hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-myorange"
                  title="Visit Page"
                >
                  <CursorArrowRippleIcon className="h-6 w-6" />
                </a>
              ) : null}

              {!hasUnsavedChanges && (
                <a
                  className="inline-flex items-center justify-center my-1 rounded bg-myblue/20 px-2 py-1 text-lg text-black shadow-sm hover:bg-myorange/50 hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-myorange"
                  href="/storykeep"
                  title="Story Keep Dashboard"
                >
                  <RectangleGroupIcon className="h-6 w-6" />
                </a>
              )}

              <button
                type="button"
                onClick={toggleAnalytics}
                disabled={!hasAnalytics}
                title={hasAnalytics ? `See Engagement Analytics` : `No Analytics yet...`}
                className={classNames(
                  "my-1 rounded px-2 py-1 text-lg shadow-sm disabled:opacity-50",
                  $showAnalytics ? `bg-myorange text-white` : `bg-myorange/20 text-black`
                )}
              >
                <PresentationChartBarIcon className="h-6 w-6" />
              </button>

              {user.isOpenDemo || !hasTurso ? (
                <button
                  type="button"
                  title="Changes will not be saved! Have fun!"
                  className="my-1 rounded px-2 py-1 text-lg shadow-sm bg-myoffwhite/50 text-black"
                  disabled={true}
                >
                  Demo Mode
                </button>
              ) : hasUnsavedChanges ? (
                <button
                  type="button"
                  onClick={handleSave}
                  className="my-1 rounded bg-myorange px-2 py-1 text-lg text-white shadow-sm hover:bg-myorange/50 hover:text-black hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-myblack disabled:hidden"
                  disabled={Object.values($uncleanData[thisId] || {}).some(Boolean)}
                  title="Save Changes"
                >
                  <CheckIcon className="h-6 w-6" />
                </button>
              ) : null}
              <a
                href="/storykeep"
                className="my-1 rounded bg-mydarkgrey px-2 py-1 text-lg text-white shadow-sm hover:bg-myorange/50 hover:text-black hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-myblack disabled:hidden"
                title="Cancel and Close Page"
              >
                <XMarkIcon className="h-6 w-6" />
              </a>
              {isSaving && (
                <SaveProcessModal
                  id={thisId}
                  isContext={isContext}
                  onClose={handleSaveComplete}
                  originalData={originalData}
                />
              )}
            </div>
          </div>
          <div>
            {(($editMode?.type === `storyfragment` && $editMode?.mode === `settings`) ||
              untitled) &&
            !isContext ? (
              <>
                <StoryFragmentTitle
                  id={thisId}
                  isEditing={isEditing}
                  handleEditingChange={handleInterceptEdit}
                  updateStoreField={updateStoreField}
                  handleUndo={handleUndo}
                />
                {!isHome &&
                  hasContentReady &&
                  ![`create`, ``].includes($storyFragmentSlug[thisId]?.current) && (
                    <StoryFragmentSlug
                      id={thisId}
                      isEditing={isEditing}
                      handleEditingChange={handleInterceptEdit}
                      updateStoreField={updateStoreField}
                      handleUndo={handleUndo}
                    />
                  )}
              </>
            ) : isContext ? (
              <>
                <PaneTitle
                  id={thisId}
                  handleEditingChange={handleInterceptEdit}
                  updateStoreField={updateStoreField}
                  handleUndo={handleUndo}
                  isEditing={isEditing}
                  isContext={isContext}
                />
                {![`create`, ``].includes($paneSlug[thisId]?.current) && (
                  <PaneSlug
                    id={thisId}
                    handleEditingChange={handleInterceptEdit}
                    updateStoreField={updateStoreField}
                    handleUndo={handleUndo}
                    isEditing={isEditing}
                    isContext={isContext}
                  />
                )}
              </>
            ) : null}
            {$editMode?.type === `storyfragment` && $editMode?.mode === `settings` && (
              <>
                <StoryFragmentSettings id={$editMode.id} menus={menus} />
                <button
                  type="button"
                  className="my-1 rounded bg-myblue px-2 py-1 text-lg text-white shadow-sm hover:bg-myorange/50 hover:text-black hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-myorange"
                  onClick={handleEditModeToggle}
                >
                  Close Panel
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }
);
