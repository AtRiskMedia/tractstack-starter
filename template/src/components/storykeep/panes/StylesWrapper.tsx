import { useStore } from "@nanostores/react";
import { editModeStore } from "../../../store/storykeep";
import type { ReactNode } from "react";

interface Props {
  paneId: string;
  outerIdx: number;
  idx: number | null;
  children: ReactNode;
  span?: boolean;
}

export const StylesWrapper = ({ paneId, outerIdx, idx, children, span = false }: Props) => {
  const $editMode = useStore(editModeStore);
  const isActive =
    $editMode?.type === "pane" &&
    (($editMode.mode === "break" && $editMode.id === paneId) ||
      ($editMode.mode === "styles" &&
        $editMode.id === paneId &&
        $editMode.targetId?.outerIdx === outerIdx &&
        $editMode.targetId?.idx === idx));
  if (!isActive) return children;

  const WrapperTag = span ? "span" : "div";

  return (
    <WrapperTag className="relative">
      {children}
      <WrapperTag
        className="absolute inset-0 w-full h-full z-101 pointer-events-none
                   outline-2 outline-dashed outline-myorange outline-offset-[-2px]
                   mix-blend-exclusion"
      />
    </WrapperTag>
  );
};

export const wrapWithStylesIndicator = (
  content: ReactNode,
  span: boolean = false,
  paneId: string,
  outerIdx: number,
  idx: number | null
) => {
  return (
    <StylesWrapper paneId={paneId} outerIdx={outerIdx} idx={idx} span={span}>
      {content}
    </StylesWrapper>
  );
};
