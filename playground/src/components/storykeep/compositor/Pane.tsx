import { useRef, memo, useMemo, useState, useEffect, useCallback } from "react";
import { useStore } from "@nanostores/react";
import { classNames } from "../../../utils/common/helpers";
import {
  paneInit,
  paneSlug,
  paneHeightOffsetDesktop,
  paneHeightOffsetMobile,
  paneHeightOffsetTablet,
  paneHeightRatioDesktop,
  paneHeightRatioMobile,
  paneHeightRatioTablet,
  paneFragmentIds,
  paneFragmentMarkdown,
  paneMarkdownFragmentId,
  paneFragmentBgPane,
  paneFragmentBgColour,
  paneHasOverflowHidden,
  paneHasMaxHScreen,
  paneFiles,
  editModeStore,
} from "../../../store/storykeep";
import BgPane from "./BgPane";
import MarkdownWrapper from "../panes/MarkdownWrapper";
import { StylesWrapper } from "../panes/StylesWrapper";
import type {
  BgColourDatum,
  BgPaneDatum,
  MarkdownEditDatum,
  ToolMode,
  ToolAddMode,
  ViewportAuto,
  Config,
} from "../../../types";

type FragmentType = MarkdownEditDatum | BgPaneDatum | BgColourDatum;

const Pane = (props: {
  id: string;
  slug: string;
  isContext: boolean;
  toolMode: ToolMode;
  toolAddMode: ToolAddMode;
  viewportKey: ViewportAuto;
  config: Config;
}) => {
  const { id, isContext, toolMode, toolAddMode, viewportKey, config } = props;
  const [isClient, setIsClient] = useState(false);
  const $paneInit = useStore(paneInit, { keys: [id] });
  const $paneSlug = useStore(paneSlug, { keys: [id] });
  const $paneHeightOffsetDesktop = useStore(paneHeightOffsetDesktop, {
    keys: [id],
  });
  const $paneHeightOffsetTablet = useStore(paneHeightOffsetTablet, {
    keys: [id],
  });
  const $paneHeightOffsetMobile = useStore(paneHeightOffsetMobile, {
    keys: [id],
  });
  const $paneHeightRatioDesktop = useStore(paneHeightRatioDesktop, {
    keys: [id],
  });
  const $paneHeightRatioTablet = useStore(paneHeightRatioTablet, {
    keys: [id],
  });
  const $paneHeightRatioMobile = useStore(paneHeightRatioMobile, {
    keys: [id],
  });
  const $paneFragmentIds = useStore(paneFragmentIds, { keys: [id] });
  const $paneMarkdownFragmentId = useStore(paneMarkdownFragmentId, {
    keys: [id],
  });
  const markdownFragmentId = $paneMarkdownFragmentId[id]?.current;
  const $paneHasOverflowHidden = useStore(paneHasOverflowHidden, {
    keys: [id],
  });
  const $paneHasMaxHScreen = useStore(paneHasMaxHScreen, { keys: [id] });
  const $paneFiles = useStore(paneFiles, { keys: [id] });

  const fragmentIds = $paneFragmentIds[id]?.current || [];
  const $paneFragmentMarkdown = useStore(paneFragmentMarkdown, {
    keys: [markdownFragmentId],
  });
  const $paneFragmentBgPane = useStore(paneFragmentBgPane, {
    keys: fragmentIds,
  });
  const $paneFragmentBgColour = useStore(paneFragmentBgColour, {
    keys: fragmentIds,
  });

  const [isUpdating, setIsUpdating] = useState(false);
  const updateQueue = useRef<Array<{ id: string; updateFn: () => void }>>([]);
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});
  const memoizedPaneData = useMemo(
    () => ({
      slug: $paneSlug[id]?.current,
      files: $paneFiles[id]?.current,
      hasOverflowHidden: $paneHasOverflowHidden[id]?.current,
      hasMaxHScreen: $paneHasMaxHScreen[id]?.current,
      paneHeight: [
        Math.floor((600 * Number($paneHeightRatioMobile[id]?.current)) / 100),
        Math.floor((1080 * Number($paneHeightRatioTablet[id]?.current)) / 100),
        Math.floor((1920 * Number($paneHeightRatioDesktop[id]?.current)) / 100),
      ] as [number, number, number],
      bgColour:
        fragmentIds
          .map((fragmentId) => $paneFragmentBgColour[fragmentId]?.current)
          .find((fragment) => fragment && fragment.type === "bgColour")?.bgColour || null,
      fragments: fragmentIds.map((fragmentId) => {
        const markdown = $paneFragmentMarkdown[fragmentId]?.current;
        const bgPane = $paneFragmentBgPane[fragmentId]?.current;
        return markdown || bgPane;
      }),
      markdownFragmentId: $paneMarkdownFragmentId[id]?.current,
      paneFragmentIds: $paneFragmentIds[id]?.current,
    }),
    [
      id,
      $paneSlug[id]?.current,
      $paneFiles[id]?.current,
      $paneHasOverflowHidden[id]?.current,
      $paneHasMaxHScreen[id]?.current,
      $paneHeightRatioMobile[id]?.current,
      $paneHeightRatioTablet[id]?.current,
      $paneHeightRatioDesktop[id]?.current,
      $paneHeightOffsetMobile[id]?.current,
      $paneHeightOffsetTablet[id]?.current,
      $paneHeightOffsetDesktop[id]?.current,
      $paneFragmentIds[id]?.current,
      $paneMarkdownFragmentId[id]?.current,
      $paneFragmentMarkdown[markdownFragmentId]?.current,
      $paneFragmentBgColour,
      $paneFragmentBgPane,
    ]
  );

  useEffect(() => {
    if ($paneInit[id]?.init) setIsClient(true);
  }, [id, $paneInit]);

  const processQueue = useCallback(() => {
    const updates = new Map<string, () => void>();
    updateQueue.current.forEach(({ id, updateFn }) => {
      updates.set(id, updateFn);
    });
    updates.forEach((updateFn) => {
      updateFn();
    });
    updateQueue.current = [];
    setIsUpdating(false);
  }, []);

  const queueUpdate = useCallback(
    (id: string, updateFn: () => void) => {
      if (debounceTimers.current[id]) {
        clearTimeout(debounceTimers.current[id]);
      }
      debounceTimers.current[id] = setTimeout(() => {
        updateQueue.current.push({ id, updateFn });
        if (!isUpdating) {
          setIsUpdating(true);
          processQueue();
        }
      }, 300);
    },
    [isUpdating, processQueue]
  );

  const renderFragment = useCallback(
    (fragment: FragmentType, index: number) => {
      if (!fragment?.type) return null;
      switch (fragment.type) {
        case "markdown":
          //console.log(
          //  $paneSlug[id].current,
          //  JSON.stringify(fragment.payload.optionsPayload.classNamesPayload)
          //);
          //console.log(``);
          //console.log(JSON.stringify(fragment.payload.optionsPayload.buttons));
          return (
            <div
              key={`markdown-${index}`}
              className="relative w-full h-auto justify-self-start"
              style={{ gridArea: "1/1/1/1" }}
            >
              <MarkdownWrapper
                readonly={false}
                payload={fragment.payload}
                markdown={fragment.markdown!}
                files={memoizedPaneData.files}
                paneHeight={memoizedPaneData.paneHeight}
                paneId={id}
                paneFragmentIds={memoizedPaneData.paneFragmentIds}
                markdownFragmentId={memoizedPaneData.markdownFragmentId}
                slug={memoizedPaneData.slug}
                isContext={isContext}
                queueUpdate={queueUpdate}
                toolMode={toolMode}
                toolAddMode={toolAddMode}
                viewportKey={viewportKey}
                config={config}
              />
            </div>
          );
        case "bgPane":
          return (
            <StylesWrapper key={`bgpane-${index}`} paneId={id} outerIdx={index} idx={null}>
              <div
                className="relative w-full h-auto justify-self-start"
                style={{ gridArea: "1/1/1/1" }}
              >
                <BgPane payload={fragment} viewportKey={viewportKey} />
                {toolMode === "styles" && (
                  <div
                    onClick={onClick}
                    className="absolute inset-0 w-full h-full z-103 hover:bg-mylightgrey hover:bg-opacity-50 hover:outline-white
                   outline outline-2 outline-solid outline-white/10 outline-offset-[-2px]
                   mix-blend-exclusion cursor-pointer"
                  />
                )}
              </div>
            </StylesWrapper>
          );
        default:
          return null;
      }
    },
    [id, memoizedPaneData, queueUpdate, viewportKey, toolMode, toolAddMode]
  );

  const onClick = () => {
    editModeStore.set({
      id: id,
      type: `pane`,
      mode: `break`,
    });
  };

  if (!isClient) return null;

  return (
    <div
      key={memoizedPaneData.bgColour}
      id={`pane-inner-${id}`}
      style={{
        backgroundColor: memoizedPaneData.bgColour || `transparent`,
      }}
      className={classNames(
        memoizedPaneData.hasMaxHScreen ? `max-h-screen` : ``,
        memoizedPaneData.hasOverflowHidden ? `overflow-hidden` : ``,
        `grid`
      )}
    >
      {memoizedPaneData.fragments.map(renderFragment)}
    </div>
  );
};

export default memo(Pane);
