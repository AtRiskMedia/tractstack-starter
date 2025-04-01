import { SvgPanes, SvgBreaks } from "../../../utils/common/shapes";

export const Svg = ({
  shapeName,
  viewportKey,
  id,
}: {
  shapeName: string;
  viewportKey: string;
  id: string;
}) => {
  const shapeData =
    typeof SvgPanes[shapeName] !== `undefined` &&
    typeof SvgPanes[shapeName][viewportKey] !== `undefined`
      ? SvgPanes[shapeName][viewportKey]
      : typeof SvgBreaks[shapeName] !== `undefined`
        ? SvgBreaks[shapeName]
        : null;
  if (!shapeData) return <></>;
  return (
    <svg
      id={`svg__${id}`}
      data-name={`svg__${shapeName}--${viewportKey}`}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${shapeData.viewBox[0]} ${shapeData.viewBox[1]}`}
      className={`svg svg__${shapeName} svg__${shapeName}--${viewportKey}`}
    >
      <desc>decorative background</desc>
      <g>
        <path d={shapeData.path} />
      </g>
    </svg>
  );
};
