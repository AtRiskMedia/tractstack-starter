import { useMemo } from "react";
import SvgModal from "./SvgModal";
import { classNames } from "../../../utils/common/helpers";
import { reduceClassNamesPayload } from "../../../utils/compositor/reduceClassNamesPayload";
import type {
  //  ClassNamesPayloadValue,
  OptionsPayloadDatum,
  MarkdownPaneDatum,
  ViewportKey,
  ClassNamesPayloadResult,
} from "../../../types";

interface ModalOptionsDatum {
  id: string;
  classes: string;
  shapeName: string;
}

interface Props {
  payload: MarkdownPaneDatum;
  modalPayload: {
    [key: string]: {
      zoomFactor: number;
      paddingLeft: number;
      paddingTop: number;
    };
  };
  viewportKey: ViewportKey;
}

//const getClassString = (
//  classNameInput: string | { classes: ClassNamesPayloadValue }
//): string => {
//  console.log(classNameInput)
//  if (typeof classNameInput === "string") {
//    return classNameInput;
//  }
//  if (typeof classNameInput === "object" && "classes" in classNameInput) {
//    return Object.values(classNameInput.classes).join(" ");
//  }
//  return "";
//};

const Modal = ({ payload, modalPayload, viewportKey }: Props) => {
  const optionsPayload = payload.optionsPayload;
  const optionsPayloadDatum: OptionsPayloadDatum = useMemo(
    () => optionsPayload && reduceClassNamesPayload(optionsPayload),
    [optionsPayload]
  );
  const baseClasses: { [key: string]: string } = {
    mobile: viewportKey === "mobile" ? "grid" : viewportKey ? "hidden" : "md:hidden",
    tablet: viewportKey === "tablet" ? "grid" : viewportKey ? "hidden" : "hidden md:grid xl:hidden",
    desktop: viewportKey === "desktop" ? "grid" : viewportKey ? "hidden" : "hidden xl:grid",
  };

  // Prepare options for each breakpoint
  const viewportLookup =
    viewportKey && [`mobile`, `tablet`, `desktop`].includes(viewportKey)
      ? [viewportKey]
      : ["mobile", "tablet", "desktop"];
  const options = viewportLookup.map((_viewportKey: string): ModalOptionsDatum => {
    const shapeName =
      _viewportKey === `desktop`
        ? payload.textShapeOutsideDesktop
        : _viewportKey === `tablet`
          ? payload.textShapeOutsideTablet
          : _viewportKey === `mobile`
            ? payload.textShapeOutsideMobile
            : null;
    const thisId = `${_viewportKey}-${shapeName}-modal`;

    const injectClassNamesRaw =
      (viewportKey &&
        optionsPayloadDatum?.classNamesModal &&
        optionsPayloadDatum?.classNamesModal[viewportKey as keyof ClassNamesPayloadResult]) ||
      optionsPayloadDatum?.classNamesModal?.all ||
      optionsPayload?.classNamesModal?.all ||
      ``;
    const injectClassNames =
      typeof injectClassNamesRaw === `string` ? injectClassNamesRaw : injectClassNamesRaw.at(0);

    return {
      id: thisId,
      classes: classNames(baseClasses[_viewportKey], injectClassNames || ``),
      shapeName: shapeName ?? "",
    };
  });

  return (
    <>
      {options.map((option, i) => {
        if (option) {
          return (
            <div key={option.id} className={option.classes}>
              <SvgModal
                shapeName={option.shapeName}
                viewportKey={viewportLookup[i]}
                id={option.id}
                modalPayload={modalPayload[viewportLookup[i]]}
              />
            </div>
          );
        }
        return null;
      })}
    </>
  );
};

export default Modal;
