import { useStore } from "@nanostores/react";
import { settingsPanelStore } from "../../../store/storykeep";

const SettingsPanel = () => {
  const $settingsPanelSignal = useStore(settingsPanelStore);
  if (!$settingsPanelSignal) return <></>;

  return (
    <div className="z-20 fixed bottom-0 right-0 bg-white shadow-lg w-full md:w-[500px]">
      <div className="overflow-y-auto" style={{ maxHeight: `50vh` }}>
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Edit Panel conditionally rendered here</h2>
          <div className="space-y-4">
            <div className="h-auto p-2 bg-gray-200 rounded">
              {JSON.stringify($settingsPanelSignal, null, 2)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
