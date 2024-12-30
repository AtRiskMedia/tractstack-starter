import { useStore } from "@nanostores/react";
import { Listbox } from "@headlessui/react";
import ArrowUturnLeftIcon from "@heroicons/react/24/outline/ArrowUturnLeftIcon";
import ArrowUturnRightIcon from "@heroicons/react/24/outline/ArrowUturnRightIcon";
import ChevronUpDownIcon from "@heroicons/react/24/outline/ChevronUpDownIcon";
import CogIcon from "@heroicons/react/24/outline/CogIcon";
import PresentationChartBarIcon from "@heroicons/react/24/outline/PresentationChartBarIcon";
import { viewportStore, viewportKeyStore, viewportSetStore } from "../../../store/storykeep";
import ViewportSelector from "../header/ViewportSelector";
import { useState } from "react";

const scaleOptions = [
  { value: 25, label: "25%" },
  { value: 50, label: "50%" },
  { value: 100, label: "100%" },
  { value: 125, label: "125%" },
  { value: 150, label: "150%" },
];

const StoryKeepHeader = (isContext: boolean) => {
  const $viewportSet = useStore(viewportSetStore);
  const $viewport = useStore(viewportStore);
  const $viewportKey = useStore(viewportKeyStore);
  const viewport = $viewport.value;
  const viewportKey = $viewportKey.value;
  const [selectedScale, setSelectedScale] = useState(scaleOptions[2]); // Default to 100%

  const setViewport = (newViewport: "auto" | "mobile" | "tablet" | "desktop") => {
    const newViewportKey =
      newViewport !== `auto`
        ? newViewport
        : typeof window !== "undefined" && window.innerWidth >= 1368
          ? "desktop"
          : typeof window !== "undefined" && window.innerWidth >= 768
            ? "tablet"
            : "mobile";
    viewportSetStore.set(newViewport !== `auto`);
    viewportStore.set({ value: newViewport });
    viewportKeyStore.set({ value: newViewportKey });
  };

  const handleResize = (option: (typeof scaleOptions)[0]) => {
    setSelectedScale(option);
    // Add your resize logic here
    console.log("Resize to:", option.value);
  };

  return (
    <div className="p-4 flex items-center gap-6">
      <ViewportSelector
        viewport={viewport}
        viewportKey={viewportKey}
        auto={!$viewportSet}
        setViewport={setViewport}
      />
      <div className="p-2 flex items-center gap-2">
        <ArrowUturnLeftIcon
          title="Undo"
          className="w-6 h-6 rounded-xl bg-white text-myblue hover:bg-myblue/50 hover:text-white"
        />
        <ArrowUturnRightIcon
          title="Redo"
          className="w-6 h-6 rounded-xl bg-white text-myblue hover:bg-myblue/50 hover:text-white"
        />
      </div>
      <div className="relative w-24">
        <Listbox value={selectedScale} onChange={handleResize}>
          <Listbox.Button className="relative w-full h-8 px-2 rounded-xl bg-white text-myblue border border-myblue hover:bg-myblue/50 hover:text-white focus:outline-none focus:ring-2 focus:ring-myblue flex items-center justify-between">
            <span>{selectedScale.label}</span>
            <ChevronUpDownIcon className="h-4 w-4" />
          </Listbox.Button>
          <Listbox.Options className="absolute z-10 mt-1 w-full rounded-md bg-white shadow-lg border border-myblue focus:outline-none">
            {scaleOptions.map((option) => (
              <Listbox.Option
                key={option.value}
                value={option}
                className={({ active, selected }) =>
                  `${active ? "bg-myblue/50 text-white" : "text-myblue"}
                  ${selected ? "bg-myblue text-white" : ""}
                  cursor-pointer select-none relative py-2 px-4`
                }
              >
                {option.label}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Listbox>
      </div>

      <div className="bg-white text-myblue hover:underline font-action font-bold">Save</div>
      <div className="bg-white text-myblue hover:underline font-action font-bold">Cancel</div>
      <CogIcon
        title="Advanced Settings"
        className="w-6 h-6 rounded-xl bg-white text-myblue hover:bg-myblue hover:text-white"
      />
      <PresentationChartBarIcon
        title="Toggle Interaction Analytics"
        className="w-6 h-6 rounded-xl bg-white text-myblue hover:bg-myblue hover:text-white"
      />
    </div>
  );
};

export default StoryKeepHeader;
