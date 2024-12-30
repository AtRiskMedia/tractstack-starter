import { useStore } from "@nanostores/react";
import { Listbox } from "@headlessui/react";
import ArrowUturnLeftIcon from "@heroicons/react/24/outline/ArrowUturnLeftIcon";
import ArrowUturnRightIcon from "@heroicons/react/24/outline/ArrowUturnRightIcon";
import ChevronUpDownIcon from "@heroicons/react/24/outline/ChevronUpDownIcon";
import CogIcon from "@heroicons/react/24/outline/CogIcon";
import PresentationChartBarIcon from "@heroicons/react/24/outline/PresentationChartBarIcon";
import {
  viewportStore,
  viewportKeyStore,
  viewportSetStore,
  scaleStore,
} from "../../../store/storykeep";
import ViewportSelector from "../header/ViewportSelector";
import { useEffect } from "react";

const scaleOptions = [
  { value: 25, label: "25%" },
  { value: 50, label: "50%" },
  { value: 100, label: "100%" },
  { value: 125, label: "125%" },
  { value: 150, label: "150%" },
] as const;

const getViewportFromWidth = (width: number): "mobile" | "tablet" | "desktop" => {
  if (width >= 1368) return "desktop";
  if (width >= 801) return "tablet";
  return "mobile";
};

const StoryKeepHeader = () => {
  const $viewportSet = useStore(viewportSetStore);
  const $viewport = useStore(viewportStore);
  const $viewportKey = useStore(viewportKeyStore);
  const $scale = useStore(scaleStore);

  useEffect(() => {
    const updateViewportKey = () => {
      if (!$viewportSet && $viewport.value === "auto") {
        const newViewportKey = getViewportFromWidth(window.innerWidth);
        if (newViewportKey !== $viewportKey.value) {
          viewportKeyStore.set({ value: newViewportKey });
        }
      }
    };

    updateViewportKey();
    window.addEventListener("resize", updateViewportKey);
    return () => window.removeEventListener("resize", updateViewportKey);
  }, [$viewportSet, $viewport.value, $viewportKey.value]);

  const getScaleOption = (scaleValue: number) =>
    scaleOptions.find((option) => option.value === scaleValue) || scaleOptions[2];

  const setViewport = (newViewport: "auto" | "mobile" | "tablet" | "desktop") => {
    const isAuto = newViewport === "auto";
    viewportSetStore.set(!isAuto);
    viewportStore.set({ value: newViewport });

    const newViewportKey = isAuto ? getViewportFromWidth(window.innerWidth) : newViewport;

    viewportKeyStore.set({ value: newViewportKey });
  };

  const handleResize = (option: (typeof scaleOptions)[number]) => {
    scaleStore.set({ value: option.value });
  };

  return (
    <div className="p-4 flex flex-wrap justify-center items-start gap-y-2 gap-x-6">
      <ViewportSelector
        viewport={$viewport.value}
        viewportKey={$viewportKey.value}
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
        <Listbox value={getScaleOption($scale.value)} onChange={handleResize}>
          <Listbox.Button className="relative w-full h-8 px-2 rounded-xl bg-white text-myblue border border-myblue hover:bg-myblue/50 hover:text-white focus:outline-none focus:ring-2 focus:ring-myblue flex items-center justify-between">
            <span>{getScaleOption($scale.value).label}</span>
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
