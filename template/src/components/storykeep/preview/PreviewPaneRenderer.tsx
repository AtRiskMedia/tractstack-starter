import { useMemo } from "react";
import BgPane from "../compositor//BgPane";
import MarkdownWrapper from "../panes/MarkdownWrapper";
import { classNames } from "@/utils/common/helpers.ts";
import type {
  PaneDatum,
  BgPaneDatum,
  MarkdownPaneDatum,
  BgColourDatum,
  ViewportAuto,
  ToolMode,
  ToolAddMode,
  Config,
} from "@/types.ts";

interface PreviewPaneRendererProps {
  paneData: PaneDatum;
  viewportKey: ViewportAuto;
  toolMode: ToolMode;
  toolAddMode: ToolAddMode;
  slug: string;
  isContext: boolean;
  config: Config;
}

const PreviewPaneRenderer = ({
  paneData,
  viewportKey,
  toolMode,
  toolAddMode,
  slug,
  isContext,
  config,
}: PreviewPaneRendererProps) => {
  const {
    id,
    optionsPayload,
    heightRatioMobile,
    heightRatioTablet,
    heightRatioDesktop,
    markdown,
    files,
  } = paneData;

  const paneHeight = useMemo(
    () =>
      [
        Math.floor((600 * Number(heightRatioMobile)) / 100),
        Math.floor((1080 * Number(heightRatioTablet)) / 100),
        Math.floor((1920 * Number(heightRatioDesktop)) / 100),
      ] as const,
    [heightRatioMobile, heightRatioTablet, heightRatioDesktop]
  );

  const bgColourFragment = optionsPayload.paneFragmentsPayload?.find(
    (fragment): fragment is BgColourDatum => fragment.type === "bgColour"
  );

  const bgColourStyle = bgColourFragment ? { backgroundColor: bgColourFragment.bgColour } : {};

  return (
    <div
      id={`pane-inner-${id}`}
      style={bgColourStyle}
      className={classNames(
        optionsPayload.maxHScreen ? `max-h-screen` : ``,
        optionsPayload.overflowHidden ? `overflow-hidden` : ``,
        `grid`,
        bgColourFragment ? `bg-[${bgColourFragment.bgColour}]` : ""
      )}
    >
      {optionsPayload.paneFragmentsPayload?.map(
        (fragment: BgColourDatum | BgPaneDatum | MarkdownPaneDatum, idx: number) => {
          if (fragment.type === `bgPane`) {
            return (
              <div
                key={idx}
                className="relative w-full h-auto justify-self-start"
                style={{ gridArea: "1/1/1/1" }}
              >
                <BgPane payload={fragment} viewportKey={viewportKey} />
              </div>
            );
          } else if (fragment.type === `markdown` && markdown) {
            return (
              <div
                key={idx}
                className="relative w-full h-auto justify-self-start"
                style={{ gridArea: "1/1/1/1" }}
              >
                <MarkdownWrapper
                  readonly={true}
                  payload={fragment}
                  markdown={markdown}
                  files={files}
                  paneHeight={[...paneHeight]}
                  paneId={id}
                  paneFragmentIds={optionsPayload.paneFragmentsPayload?.map((f) => f.id) || []}
                  markdownFragmentId={markdown.id}
                  slug={slug}
                  queueUpdate={() => {}} // Mock function, as we don't need real updates in preview
                  toolMode={toolMode}
                  toolAddMode={toolAddMode}
                  viewportKey={viewportKey}
                  isContext={isContext}
                  config={config}
                />
              </div>
            );
          }
          return null;
        }
      )}
    </div>
  );
};

export default PreviewPaneRenderer;
