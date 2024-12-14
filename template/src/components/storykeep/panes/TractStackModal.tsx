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
    <div className="z-10000 left-0 fixed bg-mylightgrey bg-opacity-50 w-full h-full top-0 flex items-center justify-center">
      <div className={`bg-white p-8 rounded-lg shadow-xl ${getContentWidth()} w-full`}>
        {props.header}
        <div className="overflow-y-scroll px-4 pb-4 h-fit max-h-[85vh]">
          {props.body}
        </div>
      </div>
    </div>
  );
};

export default TractStackModal;