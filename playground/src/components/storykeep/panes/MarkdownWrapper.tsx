import { useMemo } from "react";
import MarkdownPane from "./MarkdownPane";
import MarkdownInsidePane from "./MarkdownInsidePane";
import Modal from "./Modal";
import MarkdownInsideModal from "./MarkdownInsideModal";
import { classNames } from "../../../utils/common/helpers";
import { generateMarkdownLookup } from "../../../utils/compositor/generateMarkdownLookup";
import InsertWrapper from "./InsertWrapper";
import type {
  MarkdownDatum,
  MarkdownPaneDatum,
  FileNode,
  BgPaneDatum,
  ToolAddMode,
  ToolMode,
  ViewportAuto,
  Config,
} from "../../../types";

interface Props {
  readonly: boolean;
  payload: MarkdownPaneDatum | BgPaneDatum;
  markdown: MarkdownDatum;
  files: FileNode[];
  paneHeight: [number, number, number];
  paneId: string;
  paneFragmentIds: string[];
  markdownFragmentId: string | null;
  slug: string;
  isContext: boolean;
  queueUpdate: (id: string, updateFn: () => void) => void;
  viewportKey: ViewportAuto;
  toolMode: ToolMode;
  toolAddMode: ToolAddMode;
  config: Config;
}

const MarkdownWrapper = ({
  readonly,
  payload,
  markdown,
  files,
  paneHeight,
  paneId,
  paneFragmentIds,
  markdownFragmentId,
  slug,
  isContext,
  queueUpdate,
  viewportKey,
  toolMode,
  toolAddMode,
  config,
}: Props) => {
  const thisPayload = payload as MarkdownPaneDatum;
  const thisModalPayload =
    thisPayload.isModal && typeof thisPayload?.optionsPayload?.modal !== `undefined`
      ? thisPayload.optionsPayload.modal
      : null;
  const hasHidden =
    payload.hiddenViewports.includes(`desktop`) ||
    payload.hiddenViewports.includes(`tablet`) ||
    payload.hiddenViewports.includes(`mobile`);
  const hidden = hasHidden
    ? ``.concat(
        payload.hiddenViewports.includes(`desktop`) ? `xl:hidden` : `xl:grid`,
        payload.hiddenViewports.includes(`tablet`) ? `md:hidden` : `md:grid`,
        payload.hiddenViewports.includes(`mobile`) ? `hidden` : `grid`
      )
    : `grid`;
  const paneFragmentStyle = {
    gridArea: "1/1/1/1",
    height:
      viewportKey === `mobile` && paneHeight[0] === 0
        ? `auto`
        : viewportKey === `mobile`
          ? `calc(var(--scale)*${paneHeight[0]}px)`
          : viewportKey === `tablet` && paneHeight[1] === 0
            ? `auto`
            : viewportKey === `tablet`
              ? `calc(var(--scale)*${paneHeight[1]}px)`
              : viewportKey === `desktop` && paneHeight[2] === 0
                ? `auto`
                : viewportKey === `desktop`
                  ? `calc(var(--scale)*${paneHeight[2]}px)`
                  : `auto`,
  };

  const isEmptyMarkdown = markdown.body === ``;
  const mustIntercept = isEmptyMarkdown && toolMode === `insert`;

  const isModal = thisPayload.isModal && typeof thisPayload?.optionsPayload?.modal !== `undefined`;

  const hasTextShapeOutside =
    thisPayload.textShapeOutsideMobile !== `none` ||
    thisPayload.textShapeOutsideTablet !== `none` ||
    thisPayload.textShapeOutsideDesktop !== `none`;

  const markdownLookup = useMemo(
    () => markdown?.htmlAst && generateMarkdownLookup(markdown.htmlAst),
    [markdown?.htmlAst]
  );

  const renderContent = () => {
    if (isModal && thisModalPayload && markdownFragmentId) {
      return (
        <MarkdownInsideModal
          readonly={readonly}
          payload={thisPayload}
          markdown={markdown}
          files={files}
          paneHeight={paneHeight}
          modalPayload={thisModalPayload}
          paneId={paneId}
          paneFragmentIds={paneFragmentIds}
          markdownFragmentId={markdownFragmentId}
          slug={slug}
          isContext={isContext}
          markdownLookup={markdownLookup}
          toolMode={toolMode}
          toolAddMode={toolAddMode}
          viewportKey={viewportKey}
          queueUpdate={queueUpdate}
          config={config}
        />
      );
    } else if (!isModal && hasTextShapeOutside) {
      return (
        <MarkdownInsidePane
          readonly={readonly}
          payload={thisPayload}
          markdown={markdown}
          files={files}
          paneHeight={paneHeight}
          paneId={paneId}
          paneFragmentIds={paneFragmentIds}
          markdownFragmentId={markdownFragmentId}
          slug={slug}
          isContext={isContext}
          markdownLookup={markdownLookup}
          toolMode={toolMode}
          toolAddMode={toolAddMode}
          viewportKey={viewportKey}
          queueUpdate={queueUpdate}
          config={config}
        />
      );
    } else if (!isModal && !hasTextShapeOutside && markdownFragmentId) {
      return (
        <MarkdownPane
          readonly={readonly}
          payload={thisPayload}
          markdown={markdown}
          files={files}
          paneId={paneId}
          paneFragmentIds={paneFragmentIds}
          markdownFragmentId={markdownFragmentId}
          slug={slug}
          isContext={isContext}
          markdownLookup={markdownLookup}
          toolMode={toolMode}
          toolAddMode={toolAddMode}
          viewportKey={viewportKey}
          queueUpdate={queueUpdate}
          config={config}
        />
      );
    }
    return null;
  };

  // if there's no content; but it's a markdown pane show InsertWrapper
  return (
    <>
      {mustIntercept && markdownFragmentId ? (
        <InsertWrapper
          isEmpty={isEmptyMarkdown}
          fragmentId={markdownFragmentId}
          paneId={paneId}
          outerIdx={0}
          idx={null}
          queueUpdate={queueUpdate}
          toolAddMode={toolAddMode}
          markdownLookup={markdownLookup}
        />
      ) : (
        <div
          className={classNames(hidden, `h-fit-contents`)}
          id={`t8k-${markdownFragmentId}-modal-container`}
        >
          {isModal && thisModalPayload && (
            <div className="relative w-full h-full justify-self-start" style={paneFragmentStyle}>
              <Modal
                payload={thisPayload}
                modalPayload={thisModalPayload}
                viewportKey={viewportKey}
              />
            </div>
          )}
          <div className="relative w-full h-full justify-self-start" style={paneFragmentStyle}>
            {renderContent()}
          </div>
        </div>
      )}
    </>
  );
};

export default MarkdownWrapper;
