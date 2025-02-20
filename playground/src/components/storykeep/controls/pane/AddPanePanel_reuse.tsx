import { Fragment, useState, useEffect } from "react";
import { Combobox, Transition } from "@headlessui/react";
import { ChevronUpDownIcon, CheckIcon } from "@heroicons/react/20/solid";
import { contentMap } from "@/store/events";
import { NodesContext, getCtx } from "@/store/nodes";
import { NodesSnapshotRenderer, type SnapshotData } from "@/utils/nodes/NodesSnapshotRenderer";
import { createEmptyStorykeep } from "@/utils/common/nodesHelper";
import { PaneAddMode } from "@/types";
import type { PaneContentMap, StoryFragmentNode } from "@/types";

interface AddPaneReUsePanelProps {
  nodeId: string;
  first: boolean;
  setMode: (mode: PaneAddMode) => void;
}

const AddPaneReUsePanel = ({ nodeId, first, setMode }: AddPaneReUsePanelProps) => {
  const [selected, setSelected] = useState<PaneContentMap | null>(null);
  const [previews, setPreviews] = useState<{ ctx: NodesContext; snapshot?: SnapshotData }[]>([]);
  const [query, setQuery] = useState("");
  const [availablePanes, setAvailablePanes] = useState<PaneContentMap[]>([]);

  useEffect(() => {
    const ctx = getCtx();
    const storyfragmentId = ctx.getClosestNodeTypeFromId(nodeId, "StoryFragment");
    const storyfragmentNode = ctx.allNodes.get().get(storyfragmentId) as StoryFragmentNode;
    const usedPaneIds = storyfragmentNode?.paneIds || [];

    const allPanes = contentMap
      .get()
      .filter((item): item is PaneContentMap => item.type === "Pane");
    const unusedPanes = allPanes.filter((pane) => !usedPaneIds.includes(pane.id));
    setAvailablePanes(unusedPanes);
  }, [nodeId]);

  const filteredPanes =
    query === ""
      ? availablePanes
      : availablePanes.filter(
          (pane) =>
            pane.title.toLowerCase().includes(query.toLowerCase()) ||
            pane.slug.toLowerCase().includes(query.toLowerCase())
        );

  useEffect(() => {
    if (!selected) {
      setPreviews([]);
      return;
    }

    const fetchPanePreview = async () => {
      try {
        const response = await fetch("/api/turso/getPaneTemplateNode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: selected.id }),
        });
        const result = await response.json();
        if (!result.success || !result.data.data.templatePane) {
          console.error("Failed to fetch pane:", result.error);
          return;
        }

        // Create new context
        const ctx = new NodesContext();

        // Add root node
        ctx.addNode(createEmptyStorykeep("tmp"));

        // Get the full template pane with all its content
        const template = result.data.data.templatePane;

        // Add the template to the context properly
        ctx.addTemplatePane("tmp", template);

        // Update previews with new context
        setPreviews([{ ctx }]);
      } catch (error) {
        console.error("Error fetching pane preview:", error);
        setPreviews([]); // Clear previews on error
      }
    };

    fetchPanePreview();
  }, [selected]);

  const handlePaneReuse = async (selectedPaneId: string, nodeId: string, first: boolean) => {
    if (!selectedPaneId) return;

    try {
      // Fetch the pane template
      const response = await fetch("/api/turso/getPaneTemplateNode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedPaneId }),
      });
      const result = await response.json();
      if (!result.success || !result.data.data.templatePane) {
        console.error("Failed to fetch pane:", result.error);
        return;
      }

      // Get the template
      const template = result.data.data.templatePane;

      // Get context and insert the pane
      const ctx = getCtx();
      const ownerId = ctx.getClosestNodeTypeFromId(nodeId, "StoryFragment");
      const newPaneId = ctx.addTemplatePane(ownerId, template, nodeId, first ? "before" : "after");

      if (newPaneId) {
        ctx.notifyNode(`root`);
        setMode(PaneAddMode.DEFAULT); // Close the panel after insertion
      }
    } catch (error) {
      console.error("Error reusing pane:", error);
    }
  };

  return (
    <div className="p-0.5 shadow-inner">
      <div className="p-1.5 bg-white rounded-md w-full">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-2 min-w-[200px]">
            <button
              onClick={() => setMode(PaneAddMode.DEFAULT)}
              className="flex-none w-fit px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 focus:bg-gray-200 transition-colors"
            >
              ← Go Back
            </button>

            <div className="flex-none px-2 py-2.5 text-sm rounded text-cyan-700 font-bold font-action shadow-sm">
              Re-use Existing Pane
            </div>
          </div>

          <div className="flex-1 min-w-[300px]">
            <Combobox value={selected} onChange={setSelected}>
              <div className="relative">
                <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left border border-gray-200 focus-within:border-cyan-500 transition-colors">
                  <Combobox.Input
                    autoComplete="off"
                    className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:ring-0"
                    displayValue={(pane: PaneContentMap) => pane?.title || ""}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search for a pane..."
                  />
                  <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </Combobox.Button>
                </div>
                <Transition
                  as={Fragment}
                  leave="transition ease-in duration-100"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                  afterLeave={() => setQuery("")}
                >
                  <Combobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-50">
                    {filteredPanes.length === 0 && query !== "" ? (
                      <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                        Nothing found.
                      </div>
                    ) : (
                      filteredPanes.map((pane) => (
                        <Combobox.Option
                          key={pane.id}
                          className={({ active }) =>
                            `relative cursor-default select-none py-2 pl-10 pr-4 ${
                              active ? "bg-cyan-600 text-white" : "text-gray-900"
                            }`
                          }
                          value={pane}
                        >
                          {({ selected, active }) => (
                            <>
                              <span
                                className={`block truncate ${
                                  selected ? "font-bold" : "font-normal"
                                }`}
                              >
                                {pane.title}
                              </span>
                              {selected ? (
                                <span
                                  className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                                    active ? "text-white" : "text-cyan-600"
                                  }`}
                                >
                                  <CheckIcon className="h-5 w-5" aria-hidden="true" />
                                </span>
                              ) : null}
                              <span
                                className={`block truncate text-sm ${
                                  active ? "text-cyan-100" : "text-gray-500"
                                }`}
                              >
                                {pane.slug}
                              </span>
                            </>
                          )}
                        </Combobox.Option>
                      ))
                    )}
                  </Combobox.Options>
                </Transition>
              </div>
            </Combobox>
          </div>

          {selected && (
            <div className="flex flex-wrap gap-2 min-w-[200px]">
              <button
                onClick={() => {
                  if (selected) {
                    handlePaneReuse(selected.id, nodeId, first);
                  }
                }}
                className="px-3 py-2 bg-cyan-600 text-white text-sm rounded hover:bg-cyan-700 focus:bg-cyan-700 transition-colors"
              >
                Use Selected Pane
              </button>
              <button
                onClick={() => setSelected(null)}
                className="px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 focus:bg-gray-200 transition-colors"
              >
                Clear Selection
              </button>
            </div>
          )}
        </div>
      </div>

      {selected && (
        <div className="mt-4">
          <h3 className="px-3.5 pt-4 pb-1.5 font-bold text-black text-xl font-action">
            Preview of selected pane:
          </h3>
          <div className="grid grid-cols-1 gap-4 p-2">
            {previews.map((preview, index) => (
              <div
                key={index}
                className="group bg-mywhite shadow-inner relative w-full rounded-sm cursor-pointer transition-all duration-200"
                style={{
                  ...(!preview.snapshot ? { minHeight: "200px" } : {}),
                }}
              >
                {!preview.snapshot && (
                  <NodesSnapshotRenderer
                    ctx={preview.ctx}
                    forceRegenerate={false}
                    onComplete={(data) => {
                      setPreviews((prev) =>
                        prev.map((p, i) => (i === index ? { ...p, snapshot: data } : p))
                      );
                    }}
                  />
                )}
                {preview.snapshot && (
                  <div className="p-0.5">
                    <img
                      src={preview.snapshot.imageData}
                      alt={`Preview of ${selected.title}`}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AddPaneReUsePanel;
