import { useMemo } from "react";
import PaneFromAst from "./PaneFromAst";
import { SvgInsideLeft } from "../../panes/SvgInsideLeft";
import { SvgInsideRight } from "../../panes/SvgInsideRight";
import { classNames } from "../../../utils/helpers";
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
} from "../../../types";

interface Props {
  readonly: boolean;
  payload: MarkdownPaneDatum;
  markdown: MarkdownDatum;
  files: FileNode[];
  paneHeight: [number, number, number];
  paneId: string;
  paneFragmentIds: string[];
  markdownFragmentId: string | null;
  slug: string;
  isContext: boolean;
  markdownLookup: MarkdownLookup;
  toolMode: ToolMode;
  toolAddMode: ToolAddMode;
  viewportKey: ViewportAuto;
  queueUpdate: (id: string, updateFn: () => void) => void;
}

const MarkdownInsidePane = ({
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
  markdownLookup,
  toolMode,
  toolAddMode,
  viewportKey,
  queueUpdate,
}: Props) => {
  if (!markdownFragmentId) return null;
  const optionsPayload = payload.optionsPayload;
  const optionsPayloadDatum: OptionsPayloadDatum = useMemo(
    () => optionsPayload && reduceClassNamesPayload(optionsPayload),
    [optionsPayload]
  );

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
        <SvgInsideLeft
          shapeName={shapeName || ``}
          viewportKey={viewportKey}
          id={`markdown-${paneId}`}
          paneHeight={paneHeight[viewportKey === `desktop` ? 2 : viewportKey === `tablet` ? 1 : 0]}
        />
        <SvgInsideRight
          shapeName={shapeName || ``}
          viewportKey={viewportKey}
          id={`markdown-${paneId}`}
          paneHeight={paneHeight[viewportKey === `desktop` ? 2 : viewportKey === `tablet` ? 1 : 0]}
        />
        {astPayload.ast
          /* eslint-disable @typescript-eslint/no-explicit-any */
          .filter((e: any) => !(e?.type === `text` && e?.value === `\n`))
          .map((thisAstPayload: any, idx: number) => (
            <PaneFromAst
              readonly={readonly}
              key={idx}
              payload={{
                ...astPayload,
                ast: [thisAstPayload],
              }}
              markdown={markdown}
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
            />
          ))}
      </div>
    </div>
  );
};

export default MarkdownInsidePane;
