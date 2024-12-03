import TractStackModal from "@/components/storykeep/components/TractStackModal.tsx";
import { useState } from "react";
import { Switch } from "@headlessui/react";

export type ChangeLayoutModalProps = {
  onClose: () => void;
}

const ChangeLayoutModal = (props: ChangeLayoutModalProps) => {
  const [isOddPanes, setIsOddPanes] = useState(false);

  return (
    <TractStackModal
      widthProvider={() => "max-w-[80%]"}
      header={
        <div className="flex justify-between">
          <h2 className="text-2xl font-bold mb-4">Generating Page</h2>
          <button className="bg-red-400 h-fit px-2 rounded-md" onClick={() => props.onClose()}>
            X
          </button>
        </div>
      }
      body={
        <div className="flex flex-col">
          <Switch.Group>
            <div className="flex items-center gap-x-6 py-4">
              <Switch
                checked={isOddPanes}
                onChange={setIsOddPanes}
                className={`${
                  isOddPanes ? "bg-blue-600" : "bg-gray-200"
                } relative inline-flex h-6 w-11 items-center rounded-full`}
              >
                <span className="sr-only">Odd Panes</span>
                <span
                  className={`${
                    isOddPanes ? "translate-x-6" : "translate-x-1"
                  } inline-block h-4 w-4 transform rounded-full bg-white transition`}
                />
              </Switch>
              <Switch.Label className="mr-4">Enable Odd Panes</Switch.Label>
            </div>
          </Switch.Group>
          <p>Changing layout...</p>
          <p>Changing layout...</p>
          <p>Changing layout...</p>
          <p>Changing layout...</p>
          <p>Changing layout...</p>
          <p>Changing layout...</p>
          <p>Changing layout...</p>
          <p>Changing layout...</p>
        </div>
      }
    />
  );
};

export default ChangeLayoutModal;