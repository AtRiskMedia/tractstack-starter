import { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import { Switch } from "@headlessui/react";
import ArrowUpIcon from "@heroicons/react/20/solid/ArrowUpIcon";
import ArrowDownIcon from "@heroicons/react/20/solid/ArrowDownIcon";
import XMarkIcon from "@heroicons/react/20/solid/XMarkIcon";
import CheckIcon from "@heroicons/react/20/solid/CheckIcon";
import PaneTitle from "../fields/PaneTitle";
import PaneSlug from "../fields/PaneSlug";
import PaneHeightOffset from "../fields/PaneHeightOffset";
import PaneHeightRatio from "../fields/PaneHeightRatio";
import PaneImpression from "../fields/PaneImpression";
import PaneBeliefs from "../fields/PaneBeliefs";
import PaneBgColour from "../fields/PaneBgColour";
import CodeHookSettings from "../fields/CodeHookSettings";
import { MoveDirection, movePane, removePane, useStoryKeepUtils } from "../../../utils/storykeep";
import {
  editModeStore,
  paneCodeHook,
  paneHasMaxHScreen,
  paneHasOverflowHidden,
  paneIsHiddenPane,
  paneSlug,
  paneTitle,
  storyFragmentPaneIds,
  storyFragmentSlug,
} from "../../../store/storykeep";
import { contentMap } from "../../../store/events";
import { classNames, cleanString } from "../../../utils/helpers";
import type { StoreKey } from "../../../types";

export const PaneSettings = (props: { id: string; storyFragmentId: string }) => {
  const { id, storyFragmentId } = props;
  const [confirmRemoval, setConfirmRemoval] = useState(false);
  const $contentMap = useStore(contentMap);
  const $storyFragmentSlug = useStore(storyFragmentSlug, {
    keys: [storyFragmentId],
  });
  const $paneTitle = useStore(paneTitle, { keys: [id] });
  const $paneSlug = useStore(paneSlug, { keys: [id] });
  const usedSlugs = [
    ...$contentMap.map((item) => item.slug),
    ...Object.keys($paneSlug).map((s) => $paneSlug[s].current),
    ...Object.keys($storyFragmentSlug).map((s) => $storyFragmentSlug[s].current),
  ];
  const { updateStoreField, handleEditingChange, handleUndo } = useStoryKeepUtils(id, usedSlugs);
  const $paneHasMaxHScreen = useStore(paneHasMaxHScreen, { keys: [id] });
  const $paneCodeHook = useStore(paneCodeHook, { keys: [id] });
  const $paneIsHiddenPane = useStore(paneIsHiddenPane, { keys: [id] });
  const $paneHasOverflowHidden = useStore(paneHasOverflowHidden, {
    keys: [id],
  });
  const hasCodeHook = $paneCodeHook[id].current;
  const $storyFragmentPaneIds = useStore(storyFragmentPaneIds, {
    keys: [storyFragmentId],
  });
  const tabs = [`settings`, `advanced`, `beliefs`, `impression`];
  if (hasCodeHook) tabs.unshift(`codeHook`);
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [isFirstPane, setIsFirstPane] = useState(false);
  const [isLastPane, setIsLastPane] = useState(false);

  useEffect(() => {
    const paneIds = $storyFragmentPaneIds[storyFragmentId]?.current || [];
    setIsFirstPane(paneIds[0] === id);
    setIsLastPane(paneIds[paneIds.length - 1] === id);
  }, [$storyFragmentPaneIds, storyFragmentId, id]);

  const handleUpdateStoreField = (storeKey: StoreKey, newValue: string) => {
    return updateStoreField(storeKey, newValue);
  };

  const handleInterceptEdit = (storeKey: StoreKey, editing: boolean) => {
    if (storeKey === `paneTitle` && $paneSlug[id].current === ``) {
      const clean = cleanString($paneTitle[id].current).substring(0, 50);
      const newVal = !usedSlugs.includes(clean) ? clean : ``;
      updateStoreField(`paneSlug`, newVal);
    }
    return handleEditingChange(storeKey, editing);
  };

  const handleMoveUp = () => {
    const updatedPanes = movePane(
      $storyFragmentPaneIds[storyFragmentId].current,
      id,
      MoveDirection.UP
    );
    updateStoreField("storyFragmentPaneIds", updatedPanes, storyFragmentId);
  };

  const handleMoveDown = () => {
    const updatedPanes = movePane(
      $storyFragmentPaneIds[storyFragmentId].current,
      id,
      MoveDirection.DOWN
    );
    updateStoreField("storyFragmentPaneIds", updatedPanes, storyFragmentId);
  };

  const handleRemove = () => {
    if (confirmRemoval) {
      const updatedIds = removePane($storyFragmentPaneIds[storyFragmentId].current, id);
      updateStoreField("storyFragmentPaneIds", updatedIds, storyFragmentId);

      editModeStore.set(null);
      setConfirmRemoval(false);
    } else setConfirmRemoval(true);
  };

  return (
    <div>
      <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center space-y-2 xs:space-y-0">
        <nav aria-label="Tabs" className="flex space-x-4 mt-4 mb-1 mr-6">
          {tabs.map((tab: string, idx: number) => (
            <button
              key={idx}
              aria-current={tab === activeTab ? "page" : undefined}
              onClick={() => {
                setActiveTab(tab);
              }}
              className={classNames(
                tab === activeTab
                  ? "text-black font-bold"
                  : "text-mydarkgrey hover:text-black underline",
                "text-md"
              )}
            >
              {tab === `settings`
                ? `Pane Settings`
                : tab === `advanced`
                  ? `Advanced Settings`
                  : tab === `impression`
                    ? `Add Impression`
                    : tab === `beliefs`
                      ? `Add Magic Paths`
                      : tab === `codeHook`
                        ? `Manage Code Hook`
                        : tab === `buttons`
                          ? `Images`
                          : ``}
            </button>
          ))}
        </nav>
      </div>
      <hr className="w-full" />
      {activeTab === `settings` ? (
        <div className="my-4">
          <div className="flex flex-wrap gap-x-16 gap-y-2">
            <div className="flex flex-wrap w-80">
              <div className="flex-grow w-80">
                <PaneTitle
                  id={id}
                  handleEditingChange={handleInterceptEdit}
                  updateStoreField={handleUpdateStoreField}
                  handleUndo={handleUndo}
                />
              </div>
              <div className="flex-grow w-80">
                <PaneSlug
                  id={id}
                  handleEditingChange={handleEditingChange}
                  updateStoreField={handleUpdateStoreField}
                  handleUndo={handleUndo}
                />
              </div>
              <p className="text-sm my-2 text-mydarkgrey italic">
                Note: title + slug used for analytics and as part of the "fast travel" map shown to
                users (if enabled).
              </p>
            </div>

            <PaneBgColour paneId={id} />
            <div className="flex flex-col">
              <div className="flex-shrink">
                <button
                  title="Move up"
                  onClick={handleMoveUp}
                  disabled={isFirstPane}
                  className={`my-0.5 py-1 rounded-md px-2 shadow-sm bg-myorange/20 hover:bg-myorange hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-myorange ${isFirstPane ? "disabled:hidden" : ""}`}
                >
                  <ArrowUpIcon className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-shrink">
                <button
                  title="Move down"
                  onClick={handleMoveDown}
                  disabled={isLastPane}
                  className={`my-0.5 py-1 rounded-md px-2 shadow-sm bg-myorange/20 hover:bg-myorange hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-myorange ${isLastPane ? "disabled:hidden" : ""}`}
                >
                  <ArrowDownIcon className="w-5 h-5" />
                </button>
              </div>
              {confirmRemoval ? (
                <div className="flex flex-nowrap space-x-2">
                  <span>Are you sure?</span>
                  <button
                    title="Remove pane"
                    onClick={handleRemove}
                    className="my-0.5 py-1 rounded-md px-2 shadow-sm bg-myorange/20 hover:bg-myorange hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-myorange"
                  >
                    <CheckIcon className="w-5 h-5" />
                  </button>
                  <button
                    title="Cancel and keep pane"
                    onClick={() => setConfirmRemoval(false)}
                    className="my-0.5 py-1 rounded-md px-2 shadow-sm bg-myorange/20 hover:bg-myorange hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-myorange"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button
                  title="Remove pane"
                  onClick={handleRemove}
                  className="my-0.5 py-1 rounded-md px-2 shadow-sm bg-myorange/20 hover:bg-myorange hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-myorange"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      ) : activeTab === `advanced` ? (
        <div className="flex flex-wrap gap-x-16 gap-y-6 my-4">
          <div className="flex-grow">
            <PaneHeightOffset id={id} />
          </div>
          <div className="flex-grow">
            <PaneHeightRatio id={id} />
          </div>
          <div className="w-fit-contents flex flex-col gap-y-6">
            <div className="flex items-center">
              <Switch
                checked={$paneHasOverflowHidden[id].current}
                onChange={(newValue) => updateStoreField("paneHasOverflowHidden", newValue)}
                className={`${
                  $paneHasOverflowHidden[id].current ? "bg-myorange" : "bg-mydarkgrey"
                } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-myorange focus:ring-offset-2`}
              >
                <span
                  className={`${
                    $paneHasOverflowHidden[id].current ? "translate-x-6" : "translate-x-1"
                  } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                />
              </Switch>
              <div className="ml-3">
                <div className="text-md text-black font-bold">
                  {$paneHasOverflowHidden[id].current
                    ? `Apply overflow hidden`
                    : `No overflow hidden applied`}
                </div>
              </div>
            </div>

            <div className="flex items-center">
              <Switch
                checked={$paneHasMaxHScreen[id].current}
                onChange={(newValue) => updateStoreField("paneHasMaxHScreen", newValue)}
                className={`${
                  $paneHasMaxHScreen[id].current ? "bg-myorange" : "bg-mydarkgrey"
                } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-myorange focus:ring-offset-2`}
              >
                <span
                  className={`${
                    $paneHasMaxHScreen[id].current ? "translate-x-6" : "translate-x-1"
                  } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                />
              </Switch>
              <div className="ml-3">
                <div className="text-md text-black font-bold">
                  {$paneHasMaxHScreen[id].current
                    ? `Apply Max height screen`
                    : `No max height applied`}
                </div>
              </div>
            </div>

            <div className="flex items-center">
              <Switch
                checked={$paneIsHiddenPane[id].current}
                onChange={(newValue) => updateStoreField("paneIsHiddenPane", newValue)}
                className={`${
                  $paneIsHiddenPane[id].current ? "bg-myorange" : "bg-mydarkgrey"
                } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-myorange focus:ring-offset-2`}
              >
                <span
                  className={`${
                    $paneIsHiddenPane[id].current ? "translate-x-6" : "translate-x-1"
                  } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                />
              </Switch>
              <div className="ml-3">
                <div className="text-md text-black font-bold">
                  {$paneIsHiddenPane[id].current
                    ? `Hidden or decorative pane`
                    : `Monitor engagement`}
                </div>
                <div className="text-md text-mydarkgrey">
                  {$paneIsHiddenPane[id].current
                    ? `No pane analytics will be collected`
                    : `Pane analytics will be collected`}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === `beliefs` ? (
        <div className="flex flex-wrap gap-x-16 gap-y-6 my-4">
          <PaneBeliefs id={id} />
        </div>
      ) : activeTab === `impression` ? (
        <div className="flex flex-wrap gap-x-16 gap-y-6 my-4">
          <PaneImpression id={id} />
        </div>
      ) : activeTab === `codeHook` ? (
        <div className="flex flex-wrap gap-x-16 gap-y-6 my-4">
          <CodeHookSettings id={id} />
        </div>
      ) : null}
    </div>
  );
};
