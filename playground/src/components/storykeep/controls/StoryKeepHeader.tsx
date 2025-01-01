import { useEffect } from "react";
import { useStore } from "@nanostores/react";
import ArrowUturnLeftIcon from "@heroicons/react/24/outline/ArrowUturnLeftIcon";
import ArrowUturnRightIcon from "@heroicons/react/24/outline/ArrowUturnRightIcon";
import CogIcon from "@heroicons/react/24/outline/CogIcon";
import PresentationChartBarIcon from "@heroicons/react/24/outline/PresentationChartBarIcon";
import { viewportStore, viewportKeyStore, viewportSetStore } from "../../../store/storykeep";
import ViewportSelector from "../header/ViewportSelector";

const getViewportFromWidth = (width: number): "mobile" | "tablet" | "desktop" => {
  if (width >= 1368) return "desktop";
  if (width >= 801) return "tablet";
  return "mobile";
};

const StoryKeepHeader = () => {
  const $viewportSet = useStore(viewportSetStore);
  const $viewport = useStore(viewportStore);
  const $viewportKey = useStore(viewportKeyStore);

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

  const setViewport = (newViewport: "auto" | "mobile" | "tablet" | "desktop") => {
    const isAuto = newViewport === "auto";
    viewportSetStore.set(!isAuto);
    viewportStore.set({ value: newViewport });

    const newViewportKey = isAuto ? getViewportFromWidth(window.innerWidth) : newViewport;
    viewportKeyStore.set({ value: newViewportKey });
  };

  const iconClassName =
    "w-6 h-6 text-myblue hover:text-white hover:bg-myblue/50 rounded-xl bg-white";

  return (
    <div className="p-2 flex flex-wrap justify-center items-center gap-y-2 gap-x-6">
      <ViewportSelector
        viewport={$viewport.value}
        viewportKey={$viewportKey.value}
        auto={!$viewportSet}
        setViewport={setViewport}
      />

      <div className="flex items-center gap-2">
        <ArrowUturnLeftIcon title="Undo" className={iconClassName} />
        <ArrowUturnRightIcon title="Redo" className={iconClassName} />
      </div>

      <div className="flex items-center gap-4">
        <button className="bg-white text-myblue hover:underline font-action font-bold">Save</button>
        <button className="bg-white text-myblue hover:underline font-action font-bold">
          Cancel
        </button>
      </div>

      <div className="flex items-center gap-2">
        <CogIcon title="Advanced Settings" className={iconClassName} />
        <PresentationChartBarIcon title="Toggle Interaction Analytics" className={iconClassName} />
      </div>
    </div>
  );
};

export default StoryKeepHeader;
