import { SvgPanes, SvgBreaks, SvgModals } from "../../assets/shapes";
import type { SvgPaneDatum, SvgBreaksDatum, SvgModalDatum } from "../../assets/shapes";

export const SvgString = (shapeName: string, viewportKey: string, id: string) => {
  const shapeData =
    typeof SvgPanes[shapeName] !== `undefined` &&
    typeof SvgPanes[shapeName][viewportKey] !== `undefined`
      ? (SvgPanes[shapeName][viewportKey] as SvgPaneDatum)
      : typeof SvgBreaks[shapeName] !== `undefined`
        ? (SvgBreaks[shapeName] as SvgBreaksDatum)
        : typeof SvgModals[shapeName] !== `undefined`
          ? (SvgModals[shapeName] as SvgModalDatum)
          : null;
  if (!shapeData) return null;
  return `<svg id="svg__${id}" data-name="svg__${shapeName}--${viewportKey}"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 ${shapeData.viewBox[0]} ${shapeData.viewBox[1]}"
        className="svg svg__${shapeName} svg__${shapeName}--${viewportKey}"
      >
        <desc id="desc">decorative background</desc>
        <g>
          <path d="${shapeData.path}" />
        </g>
      </svg>`;
};
