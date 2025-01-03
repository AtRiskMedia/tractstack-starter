import { useStore } from "@nanostores/react";
import { settingsPanelStore } from "../../../store/storykeep";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";

const SettingsPanel = () => {
  const $settingsPanelSignal = useStore(settingsPanelStore);

  if (!$settingsPanelSignal) return <></>;

  return (
    <div className="fixed bottom-0 right-0 flex flex-col items-start">
      <button
        onClick={() => settingsPanelStore.set(null)}
        className="mb-2 p-2 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors"
        aria-label="Close settings panel"
      >
        <XMarkIcon className="w-6 h-6" />
      </button>

      <div className="bg-white shadow-lg w-full md:w-[500px] rounded-t-xl">
        <div className="overflow-y-auto" style={{ maxHeight: `50vh` }}>
          <div className="p-6">
            <h2 className="text-xl font-bold mb-4">Edit Panel conditionally rendered here</h2>
            <div className="space-y-4">
              <div className="h-auto py-2 px-4 bg-gray-200 rounded-xl">
                {JSON.stringify($settingsPanelSignal, null, 2)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
