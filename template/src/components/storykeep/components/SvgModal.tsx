import { SvgModals } from "../../../assets/shapes";

interface SvgModalProps {
  shapeName: string;
  viewportKey: string;
  id: string;
  modalPayload: {
    zoomFactor: number;
    paddingLeft: number;
    paddingTop: number;
  };
}

const SvgModal = ({ shapeName, viewportKey, id, modalPayload }: SvgModalProps) => {
  const shapeData = typeof SvgModals[shapeName] !== "undefined" ? SvgModals[shapeName] : null;
  const multiplier = modalPayload.zoomFactor;
  const width = shapeData?.viewBox && shapeData?.viewBox[0] && shapeData.viewBox[0] * multiplier;
  const paddingTop = modalPayload.paddingTop * multiplier;
  const paddingLeft = modalPayload.paddingLeft * multiplier;
  const style = {
    width: `calc(var(--scale)*${width}px)`,
    marginLeft: `calc(var(--scale)*${paddingLeft}px)`,
    marginTop: `calc(var(--scale)*${paddingTop}px)`,
  };

  if (!shapeData) return null;

  return (
    <svg
      id={`svg__${id}`}
      data-name={`svg__${shapeName}--${viewportKey}`}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${shapeData.viewBox[0]} ${shapeData.viewBox[1]}`}
      style={style}
    >
      <desc id="desc">decorative background</desc>
      <g>
        <path d={shapeData.path} />
      </g>
    </svg>
  );
};

export default SvgModal;
