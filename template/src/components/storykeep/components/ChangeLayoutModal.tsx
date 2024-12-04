import TractStackModal from "@/components/storykeep/components/TractStackModal.tsx";
import { useState } from "react";
import { Switch } from "@headlessui/react";
import { classNames } from "@/utils/helpers.ts";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import { paneFragmentDesignType } from "@/store/storykeep.ts";
import { paneDesigns } from "@/assets/paneDesigns.ts";
import PreviewPane from "@/components/storykeep/components/PreviewPane.tsx";
import type { ViewportAuto } from "@/types.ts";

export type ChangeLayoutModalProps = {
  slug: string;
  isContext: boolean;
  paneId: string;
  viewportKey: ViewportAuto;
  onClose: () => void;
};

const ChangeLayoutModal = (props: ChangeLayoutModalProps) => {
  const [isOddPanes, setIsOddPanes] = useState(false);

  const paneType = paneFragmentDesignType.get()[props.paneId];
  return (
    <TractStackModal
      widthProvider={() => "max-w-[80%]"}
      header={
        <div className="flex justify-between">
          <h2 className="text-2xl font-bold mb-4">Generating Page</h2>
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
        <div className="flex flex-col h-full">
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
          <div className="flex justify-center flex-1 gap-x-8">
            {paneType && paneDesigns()
              .filter((x) => x.designType === paneType.current)
              .map((design) => (
                <div className="border-2 border-black rounded-md">
                  <PreviewPane
                    design={design}
                    viewportKey={props.viewportKey}
                    slug={props.slug}
                    isContext={props.isContext}
                  />
                </div>
              ))}
          </div>
        </div>
      }
    />
  );
};

export default ChangeLayoutModal;
