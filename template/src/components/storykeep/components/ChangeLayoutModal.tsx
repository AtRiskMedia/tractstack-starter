import TractStackModal from "@/components/storykeep/components/TractStackModal.tsx";
import { useMemo, useState } from "react";
import { Switch } from "@headlessui/react";
import { classNames } from "@/utils/helpers.ts";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import { paneDesignType } from "@/store/storykeep.ts";
import { paneDesigns } from "@/assets/paneDesigns.ts";
import { type DesignType, type PaneDesign, type Theme, themes, type ViewportAuto } from "@/types.ts";
import PanePreview from "@/components/storykeep/components/PanePreview.tsx";
import { applyLayoutChange } from "@/utils/autoLayout.ts";

export type ChangeLayoutModalProps = {
  slug: string;
  isContext: boolean;
  paneId: string;
  viewportKey: ViewportAuto;
  onClose: () => void;
};

type PaneDesignResult = {
  theme: Theme;
  panes: PaneDesign[]
}

const getPaneDesigns = (paneType: DesignType, isOdd: boolean): PaneDesignResult[] => {
  console.log("get pane designs");
  const designs: PaneDesignResult[] = [];
  themes.forEach((theme) => {
    const filteredDesigns = paneDesigns(theme, "default", isOdd).filter(
      (x) => x.designType === paneType
    );
    if (filteredDesigns.length > 0) {
      designs.push({ theme, panes: filteredDesigns });
    }
  });
  return designs;
}

const ChangeLayoutModal = (props: ChangeLayoutModalProps) => {
  const [isOddPanes, setIsOddPanes] = useState(false);

  const paneType = useMemo<DesignType>(() => {
    const type = paneDesignType.get()[props.paneId]?.current || "copy";
    console.log(type);
    if(type === "unknown") {
      return "copy";
    }
    return type;
  }, [props.paneId]);

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
        <div className="flex flex-col h-fit w-full">
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
          <div className="grid items-stretch justify-stretch overflow-y-scroll grid-cols-6 gap-4 w-full">
            {getPaneDesigns(paneType, isOddPanes)
              .map((designs) => (
                designs.panes.map(design => (
                  <PanePreview
                    key={`${design.id}-${isOddPanes}`}
                    isSelected={false}
                    onClick={() => {
                      applyLayoutChange(props.paneId, design)
                      props.onClose?.();
                    }}
                    theme={designs.theme}
                    design={design}
                  />
                ))
              ))
            }
          </div>
        </div>
      }
    />
  );
};

export default ChangeLayoutModal;
