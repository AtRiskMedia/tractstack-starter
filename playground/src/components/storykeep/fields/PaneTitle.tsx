import ExclamationCircleIcon from "@heroicons/react/24/outline/ExclamationCircleIcon";
import ChevronDoubleLeftIcon from "@heroicons/react/24/outline/ChevronDoubleLeftIcon";
import ContentEditableField from "./ContentEditableField";
import { useStore } from "@nanostores/react";
import { paneTitle, uncleanDataStore, temporaryErrorsStore } from "../../../store/storykeep";
import type { StoreKey } from "../../../types";

interface PaneTitleProps {
  id: string;
  handleEditingChange: (storeKey: StoreKey, editing: boolean) => void;
  updateStoreField: (storeKey: StoreKey, newValue: string) => boolean;
  handleUndo: (storeKey: StoreKey, id: string) => void;
  isEditing?: Partial<Record<StoreKey, boolean>>;
  isContext?: boolean;
}

const PaneTitle = ({
  id,
  handleEditingChange,
  updateStoreField,
  handleUndo,
  isEditing,
  isContext = false,
}: PaneTitleProps) => {
  const $paneTitle = useStore(paneTitle, { keys: [id] });
  const $uncleanData = useStore(uncleanDataStore, { keys: [id] });
  const $temporaryErrors = useStore(temporaryErrorsStore, { keys: [id] });
  return (
    <>
      <div className="flex items-center space-x-4 py-1.5">
        <span
          id="paneTitle-label"
          className="flex items-center text-md text-mydarkgrey flex-shrink-0"
        >
          Pane Title
        </span>
        <div className="flex-grow relative">
          <ContentEditableField
            id="paneTitle"
            value={$paneTitle[id]?.current || ""}
            onChange={(newValue) => updateStoreField("paneTitle", newValue)}
            onEditingChange={(editing) => handleEditingChange("paneTitle", editing)}
            placeholder="Enter pane title"
            className="block w-full rounded-md border-0 px-2.5 py-1.5 pr-12 text-myblack ring-1 ring-inset ring-mygreen placeholder:text-mydarkgrey focus:ring-2 focus:ring-inset focus:ring-mygreen xs:text-sm xs:leading-6"
          />
          {($uncleanData[id]?.paneTitle || $temporaryErrors[id]?.paneTitle) && (
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <ExclamationCircleIcon aria-hidden="true" className="h-5 w-5 text-red-500" />
            </div>
          )}
        </div>
        <button
          onClick={() => handleUndo("paneTitle", id)}
          className="disabled:hidden ml-2"
          disabled={$paneTitle[id]?.history.length === 0}
        >
          <ChevronDoubleLeftIcon
            className="h-8 w-8 text-myblack rounded bg-mygreen/50 px-1 hover:bg-myorange hover:text-white"
            title="Undo"
          />
        </button>
      </div>
      {isContext &&
        ($paneTitle[id]?.current === `` || isEditing?.paneTitle || $uncleanData[id]?.paneTitle) && (
          <ul className="text-black bg-mygreen/20 rounded mt-2 font-lg flex flex-wrap px-4 py-2">
            <li className="pr-6 py-2">Short and sweet: max 50-60 characters.</li>
            <li className="pr-6 py-2">Be descriptive and make it unique.</li>
            <li className="pr-6 py-2">Include your most important keyword.</li>
            <li className="pr-6 py-2">Include your brand name.</li>
          </ul>
        )}
    </>
  );
};

export default PaneTitle;
