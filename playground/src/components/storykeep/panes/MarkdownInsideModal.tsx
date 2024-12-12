import PaneFromAst from "../compositor/PaneFromAst";
import { SvgInsideLeftModal } from "../../common/panes/SvgInsideLeftModal";
import { SvgInsideRightModal } from "../../common/panes/SvgInsideRightModal";
import { classNames } from "../../../utils/common/helpers";
import { reduceClassNamesPayload } from "../../../utils/compositor/reduceClassNamesPayload";
import type {
  FileNode,
  MarkdownDatum,
  MarkdownPaneDatum,
  MarkdownLookup,
  OptionsPayloadDatum,
  ViewportAuto,
  ToolMode,
  ToolAddMode,
  Config,
} from "../../../types";

interface Props {
  readonly: boolean;
  payload: MarkdownPaneDatum;
  markdown: MarkdownDatum;
  files: FileNode[];
  paneHeight: [number, number, number];
  modalPayload: {
    [key: string]: {
      zoomFactor: number;
      paddingLeft: number;
      paddingTop: number;
    };
  };
  paneId: string;
  paneFragmentIds: string[];
  markdownFragmentId: string;
  slug: string;
  isContext: boolean;
  markdownLookup: MarkdownLookup;
  toolMode: ToolMode;
  toolAddMode: ToolAddMode;
  viewportKey: ViewportAuto;
  queueUpdate: (id: string, updateFn: () => void) => void;
  config: Config;
}

const MarkdownInsideModal = ({
  readonly,
  payload,
  markdown,
  files,
  paneHeight,
  modalPayload,
  paneId,
  paneFragmentIds,
  markdownFragmentId,
  slug,
  isContext,
  markdownLookup,
  toolMode,
  toolAddMode,
  viewportKey,
  queueUpdate,
  config,
}: Props) => {
  if (!markdownFragmentId) return null;
  const optionsPayload = payload.optionsPayload;
  const optionsPayloadDatum: OptionsPayloadDatum =
    optionsPayload && reduceClassNamesPayload(optionsPayload);

  if (payload.hiddenViewports.includes(viewportKey)) return null;

  const shapeName =
    viewportKey === `desktop`
      ? payload.textShapeOutsideDesktop
      : viewportKey === `tablet`
        ? payload.textShapeOutsideTablet
        : viewportKey === `mobile`
          ? payload.textShapeOutsideMobile
          : null;

  const astPayload = {
    ast: markdown.htmlAst.children,
    buttonData: optionsPayload?.buttons || {},
    imageData: files,
  };

  const injectClassNames =
    (optionsPayloadDatum?.classNames && optionsPayloadDatum?.classNames[viewportKey]) ||
    optionsPayloadDatum?.classNames?.all ||
    optionsPayload?.classNames?.all ||
    {};

  const classNamesParentRaw =
    (optionsPayloadDatum?.classNamesParent && optionsPayloadDatum?.classNamesParent[viewportKey]) ||
    optionsPayloadDatum?.classNamesParent?.all ||
    optionsPayload?.classNamesParent?.all ||
    ``;

  const classNamesParent = Array.isArray(classNamesParentRaw)
    ? classNamesParentRaw
    : [classNamesParentRaw];

  return (
    <div
      className={classNames(
        Array.isArray(classNamesParent) ? classNamesParent.join(` `) : ``,
        `h-fit-contents`
      )}
    >
      <div className="relative w-full h-full justify-self-start" style={{ gridArea: "1/1/1/1" }}>
        <SvgInsideLeftModal
          shapeName={shapeName || ``}
          viewportKey={viewportKey}
          id={`markdown-${paneId}`}
          paneHeight={paneHeight[viewportKey === `desktop` ? 2 : viewportKey === `tablet` ? 1 : 0]}
          modalPayload={modalPayload[viewportKey]}
        />
        <SvgInsideRightModal
          shapeName={shapeName || ``}
          viewportKey={viewportKey}
          id={`markdown-${paneId}`}
          paneHeight={paneHeight[viewportKey === `desktop` ? 2 : viewportKey === `tablet` ? 1 : 0]}
          modalPayload={modalPayload[viewportKey]}
        />
        {astPayload.ast
          /* eslint-disable @typescript-eslint/no-explicit-any */
          .filter((e: any) => !(e?.type === `text` && e?.value === `\n`))
          .map((thisAstPayload: any, idx: number) => (
            <PaneFromAst
              readonly={readonly}
              key={idx}
              markdown={markdown}
              payload={{
                ...astPayload,
                ast: [thisAstPayload],
              }}
              thisClassNames={
                injectClassNames as {
                  [key: string]: string | string[];
                }
              }
              paneId={paneId}
              paneFragmentIds={paneFragmentIds}
              markdownFragmentId={markdownFragmentId}
              slug={slug}
              isContext={isContext}
              idx={null}
              outerIdx={idx}
              markdownLookup={markdownLookup}
              toolMode={toolMode}
              toolAddMode={toolAddMode}
              queueUpdate={queueUpdate}
              config={config}
            />
          ))}
      </div>
    </div>
  );
};

export default MarkdownInsideModal;
