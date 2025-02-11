import { type ReactNode, useEffect, useState } from "react";

export type PopupProps = {
  open: boolean;
  title: string;
  children?: ReactNode;
  onClose?: () => void;
};

export const Popup = (props: PopupProps) => {
  const [open, setOpen] = useState(props.open);

  useEffect(() => setOpen(props.open), [props.open]);

  const getRootClass = (): string => {
    if (open) {
      return "modal fixed w-full h-full top-0 left-0 flex items-center justify-center";
    }
    return "hidden";
  };

  const close = () => {
    setOpen(false);
    if (props.onClose) {
      props.onClose();
    }
  };

  return (
    <div className={getRootClass()}>
      <div
        className="modal-overlay absolute w-full h-full bg-gray-900 opacity-50"
        onClick={() => close()}
      ></div>
      <div className="modal-container bg-white w-[800px] h-[600px] mx-auto rounded shadow-lg z-50 overflow-y-auto">
        <div className="modal-content py-4 text-left px-6">
          <div className="flex justify-between items-center pb-3">
            <p className="text-2xl font-bold">{props.title}</p>
            <div className="modal-close cursor-pointer z-50">
              <svg
                className="fill-current text-black"
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 18 18"
              >
                <path d="M1.39 1.393l15.318 15.314m-15.318 0L16.706 1.393" />
              </svg>
            </div>
            <button
              className="px-4 bg-purple-500 p-3 ml-3 rounded-lg text-white hover:bg-purple-400"
              onClick={() => close()}
            >
              Close
            </button>
          </div>
          {props?.children}
        </div>
      </div>
    </div>
  );
};
