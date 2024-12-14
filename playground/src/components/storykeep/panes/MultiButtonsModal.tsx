import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import TractStackModal from "@/components/storykeep/panes/TractStackModal.tsx";
import { classNames } from "@/utils/common/helpers.ts";

export type ButtonProps = {
  text: string;
  styles?: string;
  onClick: () => void;
}

export type MultiButtonsModalProps = {
  header: string;
  body?: string;
  buttons: ButtonProps[];
  onClose: () => void;
};

const DEFAULT_BUTTON_STYLE: string = "bg-brand-3 xs:inline-flex items-center px-6 py-3 font-bold text-white rounded-lg transition-colors hover:bg-brand-4";

const MultiButtonsModal = (props: MultiButtonsModalProps) => {
  const getBtnStyles = (btnProps: ButtonProps): string => {
    if(!btnProps.styles) return DEFAULT_BUTTON_STYLE;
    return btnProps.styles;
  }

  return (
    <TractStackModal
      header={
        <div className="flex justify-between">
          <h2 className="text-2xl font-bold mb-4">{props.header}</h2>
          <button
            className={classNames(
              "h-fit right-0 top-1/2 transform -translate-y-1/2",
              "bg-black hover:bg-myorange text-white rounded-full p-2 shadow-lg",
              "transition-all duration-300 ease-in-out"
            )}
            title="Cancel"
            onClick={() => props.onClose()}
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
      }
      body={
        <div className="flex flex-col h-fit w-full">
          {props.body && <span>{props.body}</span>}
          <div className="flex justify-center gap-x-6 h-fit w-full">
            {props.buttons.map((btn, idx) => (
              <button className={getBtnStyles(btn)} key={idx} onClick={btn.onClick}>
                <span>{btn.text}</span>
              </button>
            ))}
          </div>
        </div>
      }
    />
  );
}

export default MultiButtonsModal;