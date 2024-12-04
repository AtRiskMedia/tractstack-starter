import type { ReactElement } from "react";

export type TractStackModalProps = {
  header: ReactElement;
  body: ReactElement;
  widthProvider?: () => string|number;
};

const TractStackModal = (props: TractStackModalProps) => {
  const getContentWidth = (): string|number => {
    return props.widthProvider?.() || "max-w-md";
  }

  return (
    <div className="z-104 fixed inset-0 bg-mylightgrey bg-opacity-50 overflow-y-scroll h-full w-full flex items-center justify-center">
      <div className={`bg-white p-8 rounded-lg shadow-xl ${getContentWidth()} w-full`}>
        {props.header}
        {props.body}
      </div>
    </div>
  );
};

export default TractStackModal;