import { useEffect, useMemo, useRef } from "react";
import PaneFromAst from "../compositor/PaneFromAst";
import { classNames } from "../../../utils/common/helpers";
import { reduceClassNamesPayload } from "../../../utils/compositor/reduceClassNamesPayload";
import type {
  FileNode,
  MarkdownPaneDatum,
  MarkdownDatum,
  MarkdownLookup,
  OptionsPayloadDatum,
  ViewportAuto,
  ToolMode,
  ToolAddMode,
  Config,
} from "../../../types";
import type { Nodes } from "hast";
import { useStore } from "@nanostores/react";
import { dragHandleStore, recordExitPane } from "@/store/storykeep.ts";
import { isNonZeroMagnitude, isPosInsideRect } from "@/utils/math.ts";

interface Props {
  readonly: boolean;
  payload: MarkdownPaneDatum;
  markdown: MarkdownDatum;
  files: FileNode[];
  paneId: string;
  paneFragmentIds: string[];
  markdownFragmentId: string;
  slug: string;
  isContext: boolean;
  markdownLookup: MarkdownLookup;
  toolMode: ToolMode;
  toolAddMode: ToolAddMode;
  viewportKey: ViewportAuto;
  config: Config;
  queueUpdate: (id: string, updateFn: () => void) => void;
}

const MarkdownPane = ({
  readonly,
  payload,
  markdown,
  files,
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
  const dragState = useStore(dragHandleStore);
  const self = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if(self.current && !dragState.hoverElement && !dragState.elDropState && isNonZeroMagnitude(dragState.pos)) {
      const rect = self.current.getBoundingClientRect();
      if (!isPosInsideRect(rect, dragState.pos)) {
        recordExitPane(paneId);
      }
    }
  }, [dragState]);

  const hasHidden =
    payload.hiddenViewports.includes(`desktop`) ||
    payload.hiddenViewports.includes(`tablet`) ||
    payload.hiddenViewports.includes(`mobile`);
  const hidden =
    hasHidden && viewportKey
      ? `${payload.hiddenViewports.includes(viewportKey) && viewportKey === `desktop` ? `hidden` : `grid`}`
      : hasHidden
        ? ``.concat(
            payload.hiddenViewports.includes(`desktop`)
              ? `xl:hidden`
              : `xl:grid`,
            payload.hiddenViewports.includes(`tablet`)
              ? `md:hidden`
              : `md:grid`,
            payload.hiddenViewports.includes(`mobile`) ? `hidden` : `grid`
          )
        : ``;
  const optionsPayload = payload.optionsPayload;
  const astPayload = {
    ast: markdown.htmlAst.children,
    buttonData: optionsPayload?.buttons || {},
    imageData: files,
  };
  const optionsPayloadDatum: OptionsPayloadDatum = useMemo(
    () => optionsPayload && reduceClassNamesPayload(optionsPayload),
    [optionsPayload]
  );
  const injectClassNames: { [key: string]: string | string[] } =
    ((viewportKey &&
      optionsPayloadDatum?.classNames &&
      optionsPayloadDatum?.classNames[viewportKey]) ||
      optionsPayloadDatum?.classNames?.all ||
      optionsPayload?.classNames?.all || { all: `` }) as {
      [key: string]: string | string[];
    };
  const classNamesParentRaw =
    (viewportKey &&
      optionsPayloadDatum?.classNamesParent &&
      optionsPayloadDatum?.classNamesParent[viewportKey]) ||
    optionsPayloadDatum?.classNamesParent?.all ||
    optionsPayload?.classNamesParent?.all ||
    ``;
  const classNamesParent =
    typeof classNamesParentRaw === `string`
      ? [classNamesParentRaw]
      : classNamesParentRaw;
  const parentClasses = Array.isArray(classNamesParent)
    ? classNamesParent
    : [classNamesParent];
  const content = astPayload.ast
    .filter((e: Nodes) => !(e?.type === `text` && e?.value === `\n`))
    .map((thisAstPayload: Nodes, idx: number) => (
      <PaneFromAst
        readonly={readonly}
        key={idx}
        payload={{
          ...astPayload,
          ast: [thisAstPayload],
        }}
        markdown={markdown}
        thisClassNames={injectClassNames}
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
    ));

  return (
    <>
      {(parentClasses as string[])
        .slice()
        .reverse()
        .reduce(
          (accContent: JSX.Element, cssClass: string) => (
            <div className={classNames(hidden, cssClass)}>{accContent}</div>
          ),
          <>{content}</>
        )}
    </>
  );
};

export default MarkdownPane;
