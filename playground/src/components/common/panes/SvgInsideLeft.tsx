import { SvgPanes } from "../../../utils/common/shapes";

export const SvgInsideLeft = ({
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
  const height = shapeData.viewBox[1];
  const cut = shapeData && typeof shapeData.cut === `number` ? shapeData.cut : thisWidth * 0.5;
  const paddingTop = 0;
  const paddingLeft = 0;
  const leftMaskSvg = `<svg id="svg__${id}--shape-outside-left-mask"
      data-name="svg-shape-outside-mask__${shapeName}-left--${viewportKey}"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      viewBox="0 0 ${cut} ${height}"
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
        <g>
          <path d="${shapeData.path}" />
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
    WebKitShapeOutside: `url(${leftMask})`,
    MozShapeOutside: `url(${leftMask})`,
  };

  return (
    <svg
      id={`svg__${id}--shape-outside-left`}
      data-name={`svg-shape-outside__${shapeName}--${viewportKey}`}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      viewBox={`0 0 ${cut} ${height}`}
      style={style}
      className="float-left fill-none"
    >
      <desc id="desc">decorative background</desc>
      <g>
        <path d={shapeData.path} />
      </g>
    </svg>
  );
};
