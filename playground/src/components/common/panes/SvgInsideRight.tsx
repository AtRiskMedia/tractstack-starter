import { SvgPanes } from "../../../utils/common/shapes";

export const SvgInsideRight = ({
  shapeName,
  viewportKey,
  id,
  paneHeight,
}: {
  shapeName: string;
  viewportKey: string;
  id: string;
  paneHeight: number;
}) => {
  const shapeData =
    typeof SvgPanes[shapeName] !== `undefined` &&
    typeof SvgPanes[shapeName][viewportKey] !== `undefined`
      ? SvgPanes[shapeName][viewportKey]
      : null;
  if (!shapeData) return <></>;
  const thisWidth = viewportKey === `mobile` ? 600 : viewportKey === `tablet` ? 1080 : 1920;
  const width = shapeData.viewBox[0];
  const height = shapeData.viewBox[1];
  const cut = shapeData && typeof shapeData.cut === `number` ? shapeData.cut : thisWidth * 0.5;
  const paddingTop = 0;
  const paddingLeft = 0;
  const rightMaskSvg = `<svg
      id="svg__${id}--shape-outside-right-mask"
      data-name="svg-shape-outside-mask__${shapeName}-right--${viewportKey}"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      viewBox="${cut} 0 ${width - cut} ${height}"
    >
      <desc id="desc">decorative background</desc>
      <mask id="svg__${id}--shape-outside-right-mask-cutout">
        <rect
          fill="white"
          x="${cut}"
          y="${-paddingTop}"
          width="${thisWidth - cut}"
          height="${paneHeight + paddingTop}"
        ></rect>
        <g>
          <path d="${shapeData.path}" />
        </g>
      </mask>
      <rect
        mask="url(#svg__${id}--shape-outside-right-mask-cutout)"
        x="${cut}"
        y="${-paddingTop}"
          width="${thisWidth - cut}"
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
      viewBox={`0 0 ${cut} ${height}`}
      style={style}
      className="float-right fill-none"
    >
      <desc id="desc">decorative background</desc>
      <g>
        <path d={shapeData.path} />
      </g>
    </svg>
  );
};
