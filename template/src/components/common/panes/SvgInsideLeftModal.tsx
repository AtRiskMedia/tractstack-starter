import { SvgModals } from "../../../utils/common/shapes";

export const SvgInsideLeftModal = ({
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
  const cut =
    shapeData && typeof shapeData.cut === `number` ? shapeData.cut * multiplier : thisWidth * 0.5;
  const paddingTop = modalPayload.paddingTop * multiplier;
  const paddingLeft = modalPayload.paddingLeft * multiplier;
  const leftMaskSvg = `<svg id="svg__${id}--shape-outside-left-mask"
      data-name="svg-shape-outside-mask__${shapeName}-left--${viewportKey}"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      viewBox="${-paddingLeft} ${-paddingTop} ${cut + paddingLeft} ${paneHeight}"
    >
      <desc id="desc">decorative background</desc>
      <mask id="svg__${id}--shape-outside-left-mask-cutout">
        <rect
          fill="white"
          x="${-paddingLeft}"
          y="${-paddingTop}"
          width="${cut + paddingLeft}"
          height="${paneHeight + paddingTop}"
        ></rect>
         <g transform="scale(${multiplier} ${multiplier})">
          <path d="${shapeData.innerPath}" />
        </g>
      </mask>
      <rect
        mask="url(#svg__${id}--shape-outside-left-mask-cutout)"
        x="${-paddingLeft}"
        y="${-paddingTop}"
        width="${cut + paddingLeft}"
        height="${paneHeight + paddingTop}"
      ></rect>
    </svg>`;
  const b64Left = btoa(leftMaskSvg);
  const leftMask = `data:image/svg+xml;base64,${b64Left}`;
  const style = {
    width: `calc(var(--scale)*${cut + paddingLeft}px)`,
    height: `calc(var(--scale)*${paneHeight}px)`,
    shapeOutside: `url(${leftMask})`,
    WebkitShapeOutside: `url(${leftMask})`,
    MozShapeOutside: `url(${leftMask})`,
  };

  return (
    <svg
      id={`svg__${id}--shape-outside-left`}
      data-name={`svg-shape-outside__${shapeName}--${viewportKey}`}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      viewBox={`${-paddingLeft} ${-paddingTop} ${cut + paddingLeft} ${paneHeight}`}
      style={style}
      className="float-left fill-none"
    >
      <desc id="desc">decorative background</desc>
      <g transform={`scale(${multiplier} ${multiplier})`}>
        <path d={shapeData.innerPath} />
      </g>
    </svg>
  );
};
