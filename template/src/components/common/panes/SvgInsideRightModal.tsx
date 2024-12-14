import { SvgModals } from "../../../utils/common/shapes";

export const SvgInsideRightModal = ({
  shapeName,
  viewportKey,
  id,
  paneHeight,
  modalPayload,
}: {
  shapeName: string;
  viewportKey: string;
  id: string;
  paneHeight: number;
  modalPayload: { zoomFactor: number; paddingLeft: number; paddingTop: number };
}) => {
  const shapeData = typeof SvgModals[shapeName] !== `undefined` ? SvgModals[shapeName] : null;
  if (!shapeData) return <></>;
  const multiplier = modalPayload.zoomFactor;
  const thisWidth = viewportKey === `mobile` ? 600 : viewportKey === `tablet` ? 1080 : 1920;
  const width = shapeData.viewBox[0] * multiplier;
  const cut =
    shapeData && typeof shapeData.cut === `number` ? shapeData.cut * multiplier : thisWidth * 0.5;
  const paddingTop = modalPayload.paddingTop * multiplier;
  const paddingLeft = modalPayload.paddingLeft * multiplier;
  const rightMaskSvg = `<svg
      id="svg__${id}--shape-outside-right-mask"
      data-name="svg-shape-outside-mask__${shapeName}-right--${viewportKey}"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      viewBox="${cut} ${-paddingTop} ${thisWidth - (width - cut + paddingLeft)} ${paneHeight}"
    >
      <desc id="desc">decorative background</desc>
      <mask id="svg__${id}--shape-outside-right-mask-cutout">
        <rect
          fill="white"
          x="${cut}"
          y="${-paddingTop}"
          width="${thisWidth - (width - cut + paddingLeft)}"
          height="${paneHeight + paddingTop}"
        ></rect>
         <g transform="scale(${multiplier} ${multiplier})">
          <path d="${shapeData.innerPath}" />
        </g>
      </mask>
      <rect
        mask="url(#svg__${id}--shape-outside-right-mask-cutout)"
        x="${cut}"
        y="${-paddingTop}"
          width="${thisWidth - (width - cut + paddingLeft)}"
        height="${paneHeight + paddingTop}"
      ></rect>
    </svg>`;
  const b64Right = btoa(rightMaskSvg);
  const rightMask = `data:image/svg+xml;base64,${b64Right}`;
  const style = {
    width: `calc(var(--scale)*${thisWidth - (cut + paddingLeft)}px)`,
    height: `calc(var(--scale)*${paneHeight}px)`,
    shapeOutside: `url(${rightMask})`,
    WebkitShapeOutside: `url(${rightMask})`,
    MozShapeOutside: `url(${rightMask})`,
  };

  return (
    <svg
      id={`svg__${id}--shape-outside-right`}
      data-name={`svg-shape-outside__${shapeName}--${viewportKey}`}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      viewBox={`${cut} ${-paddingTop} ${thisWidth - (width - cut + paddingLeft)} ${paneHeight}`}
      style={style}
      className="float-right fill-none"
    >
      <desc id="desc">decorative background</desc>
      <g transform={`scale(${multiplier} ${multiplier})`}>
        <path d={shapeData.innerPath} />
      </g>
    </svg>
  );
};
