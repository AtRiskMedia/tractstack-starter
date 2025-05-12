import { useState, useRef, useEffect, useCallback } from "react";
import { useStore } from "@nanostores/react";
import ClipboardIcon from "@heroicons/react/24/outline/ClipboardIcon";
import CheckIcon from "@heroicons/react/24/outline/CheckIcon";
import { getCtx, ROOT_NODE_NAME } from "@/store/nodes";
import { keyboardAccessible } from "@/store/storykeep.ts";
import {
  contextToTemplateData,
  parseTemplateJson,
  formatTemplateJson,
} from "@/utils/templates/templateUtils";
import { ReactNodesWrapper } from "@/components/compositor-nodes/ReactNodesWrapper";
import { stopLoadingAnimation, debounce } from "@/utils/common/helpers";
import ViewportSelector from "@/components/storykeep/controls/state/ViewportSelector";
import { viewportStore, viewportKeyStore, viewportSetStore } from "@/store/storykeep";
import type { LoadData } from "@/store/nodesSerializer";
import type { Config, ViewportAuto, ViewportKey } from "@/types";

const offset = 64 + 16 + 16;
const getViewportFromWidth = (width: number): "mobile" | "tablet" | "desktop" => {
  if (width >= 1368 + offset) return "desktop";
  if (width >= 801 + offset) return "tablet";
  return "mobile";
};

interface TemplateEditorProps {
  initialData: LoadData;
  config: Config;
}

const TemplateSetup = ({
  onCreateNew,
  onImportJson,
}: {
  onCreateNew: () => void;
  onImportJson: (data: LoadData) => void;
}) => {
  const [jsonInput, setJsonInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleImport = () => {
    if (!jsonInput.trim()) {
      setError("Please enter template JSON");
      return;
    }

    try {
      const result = parseTemplateJson(jsonInput);
      if (!result.success || !result.data) {
        setError(result.error || "Invalid template data");
        return;
      }

      onImportJson(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse JSON");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-mylightgrey">
      <div className="w-full max-w-4xl p-8 bg-white rounded-lg shadow-md">
        <h1 className="mb-6 text-3xl font-bold text-center">Template Editor</h1>

        <div className="mb-8">
          <h2 className="mb-4 text-xl font-bold">Create New Template</h2>
          <p className="mb-4">Start with a blank template and build it from scratch.</p>
          <button
            onClick={onCreateNew}
            className="px-6 py-2 text-white bg-myblue rounded hover:bg-myblue/80"
          >
            Create New Template
          </button>
        </div>

        <div className="pt-8 border-t border-gray-200">
          <h2 className="mb-4 text-xl font-bold">Import Existing Template</h2>
          <p className="mb-4">Paste template JSON below to import and edit.</p>

          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            className="w-full p-4 mb-4 border border-gray-300 rounded h-64 font-mono text-sm"
            placeholder="Paste template JSON here..."
          />

          {error && (
            <div className="p-3 mb-4 text-red-700 bg-red-100 border border-red-300 rounded">
              {error}
            </div>
          )}

          <button
            onClick={handleImport}
            className="px-6 py-2 text-white bg-myblue rounded hover:bg-myblue/80"
          >
            Import Template
          </button>
        </div>
      </div>
    </div>
  );
};

const ExportModal = ({ templateJson, onClose }: { templateJson: string; onClose: () => void }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [copied, setCopied] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-5xl p-6 bg-white rounded-lg max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Template JSON</h2>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-700">
            Close
          </button>
        </div>

        <p className="mb-4">Copy this JSON to import the template or save to your codebase:</p>

        <textarea
          ref={textareaRef}
          value={templateJson}
          readOnly
          className="w-full flex-grow p-4 mb-4 border border-gray-300 rounded font-mono text-sm overflow-auto"
        />

        <div className="flex justify-end">
          <button
            onClick={async () => {
              if (textareaRef.current) {
                try {
                  await navigator.clipboard.writeText(templateJson);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
                } catch (err) {
                  console.error("Failed to copy to clipboard:", err);
                }
              }
            }}
            className={`flex items-center px-6 py-2 text-white rounded transition-colors ${
              copied ? "bg-green-500" : "bg-myblue hover:bg-myblue/80"
            } mr-2`}
          >
            {copied ? (
              <>
                <CheckIcon className="w-5 h-5 mr-2" />
                Copied
              </>
            ) : (
              <>
                <ClipboardIcon className="w-5 h-5 mr-2" />
                Copy to Clipboard
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-800 bg-gray-200 rounded hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const TemplateHeader = ({
  onExport,
  viewport,
  viewportKey,
  auto,
  setViewport,
  hasPanes,
}: {
  onExport: () => void;
  viewport: ViewportKey;
  viewportKey: ViewportAuto;
  auto: boolean;
  setViewport: (viewport: "auto" | "mobile" | "tablet" | "desktop") => void;
  hasPanes: boolean;
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 bg-mywhite z-[8999] drop-shadow">
      <div className="p-2 flex justify-between items-center">
        <div className="text-xl font-bold">Template Editor</div>
        <div className="flex items-center gap-4">
          {hasPanes && (
            <ViewportSelector
              viewport={viewport}
              viewportKey={viewportKey}
              auto={auto}
              setViewport={setViewport}
            />
          )}
          <div className="flex gap-2">
            <button
              onClick={onExport}
              className="px-4 py-2 text-white bg-myblue rounded hover:bg-myblue/80"
            >
              Export Template
            </button>
            <a
              href="/storykeep"
              className="px-4 py-2 text-gray-800 bg-gray-200 rounded hover:bg-gray-300"
            >
              Exit
            </a>
          </div>
        </div>
      </div>
    </header>
  );
};

const TemplateEditorContent = ({
  editorData,
  config,
  onExport,
  viewport,
  viewportKey,
  auto,
  setViewport,
}: {
  editorData: LoadData;
  config: Config;
  onExport: () => void;
  viewport: ViewportKey;
  viewportKey: ViewportAuto;
  auto: boolean;
  setViewport: (viewport: "auto" | "mobile" | "tablet" | "desktop") => void;
}) => {
  const [initialized, setInitialized] = useState(false);
  const hasPanes = useStore(getCtx().hasPanes);

  // Find the root story fragment ID - needed for ReactNodesWrapper
  const rootId = editorData.storyfragmentNodes?.[0]?.id || "root";

  // Set up the nodes context with our data and proper notification handling
  useEffect(() => {
    const ctx = getCtx();

    // Clear existing nodes and stop any active animations
    ctx.clearAll();
    ctx.isTemplate.set(true);
    stopLoadingAnimation();

    // Build the nodes tree from our data
    ctx.buildNodesTreeFromRowDataMadeNodes(editorData);

    // Ensure that the root node ID is set to the StoryFragment
    if (editorData.storyfragmentNodes && editorData.storyfragmentNodes.length > 0) {
      ctx.rootNodeId.set(editorData.storyfragmentNodes[0].id);
    }

    // Subscribe to root notifications to handle updates
    const unsubscribe = ctx.notifications.subscribe(ROOT_NODE_NAME, () => {
      setTimeout(() => stopLoadingAnimation(), 160);
    });

    setInitialized(true);

    return () => {
      unsubscribe();
      stopLoadingAnimation();
    };
  }, [editorData]);

  // Don't render until we're ready
  if (!initialized) {
    return (
      <div className="flex justify-center items-center min-h-screen">Initializing editor...</div>
    );
  }

  return (
    <>
      <TemplateHeader
        onExport={onExport}
        viewport={viewport}
        viewportKey={viewportKey}
        auto={auto}
        setViewport={setViewport}
        hasPanes={hasPanes}
      />
      <div id="headerSpacer" className="h-16"></div>

      <div className="min-h-screen bg-mylightgrey pt-4">
        <ReactNodesWrapper id={rootId} nodes={editorData} config={config} />
      </div>
    </>
  );
};

const TemplateEditor = ({ initialData, config }: TemplateEditorProps) => {
  const [editorMode, setEditorMode] = useState<"setup" | "edit">("setup");
  const [loadData, setLoadData] = useState<LoadData | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportedJson, setExportedJson] = useState("");
  const [mounted, setMounted] = useState(false);

  const $viewport = useStore(viewportStore);
  const $viewportKey = useStore(viewportKeyStore);
  const $viewportSet = useStore(viewportSetStore);

  const rafId = useRef<number | null>(null);

  useEffect(() => {
    keyboardAccessible.set(config.init?.KEYBOARD_ACCESSIBLE || false);
  }, [config]);

  useEffect(() => {
    setMounted(true);
    const ctx = getCtx();
    ctx.isTemplate.set(true);
    return () => {
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }
      ctx.isTemplate.set(false);
    };
  }, []);

  const setViewport = useCallback(
    (newViewport: "auto" | "mobile" | "tablet" | "desktop") => {
      const isAuto = newViewport === "auto";
      viewportSetStore.set(!isAuto);
      viewportStore.set({ value: newViewport });
      if (mounted) {
        const newViewportKey = isAuto ? getViewportFromWidth(window.innerWidth) : newViewport;
        requestAnimationFrame(() => {
          viewportKeyStore.set({ value: newViewportKey });
        });
      }
    },
    [mounted]
  );

  const updateViewportKey = useCallback(() => {
    if (!mounted || $viewportSet || $viewport.value !== "auto") return;
    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      const newViewportKey = getViewportFromWidth(window.innerWidth);
      if (newViewportKey !== $viewportKey.value) {
        viewportKeyStore.set({ value: newViewportKey });
      }
    });
  }, [mounted, $viewportSet, $viewport.value, $viewportKey.value]);

  const debouncedUpdateViewportKey = useCallback(debounce(updateViewportKey, 100), [
    updateViewportKey,
  ]);

  // Set up resize listener
  useEffect(() => {
    if (!mounted) return;
    updateViewportKey();
    window.addEventListener("resize", debouncedUpdateViewportKey);
    return () => {
      window.removeEventListener("resize", debouncedUpdateViewportKey);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [mounted, debouncedUpdateViewportKey, updateViewportKey]);

  // Ensure loading animation is stopped on mount and unmount
  useEffect(() => {
    stopLoadingAnimation();
    return () => stopLoadingAnimation();
  }, []);

  // Handle creating a new template
  const handleCreateNew = () => {
    stopLoadingAnimation();
    setLoadData(initialData);
    setEditorMode("edit");
  };

  // Handle importing an existing template
  const handleImportJson = (data: LoadData) => {
    stopLoadingAnimation();
    setLoadData(data);
    setEditorMode("edit");
  };

  // Export the current template as JSON
  const handleExport = () => {
    const ctx = getCtx();

    const allNodes = Array.from(ctx.allNodes.get().values());
    const storyFragment = allNodes.find((node) => node.nodeType === "StoryFragment");
    const templateName =
      storyFragment && "title" in storyFragment && storyFragment.title
        ? storyFragment.title
        : "Unnamed Template";
    const description = `Template for ${templateName}`;
    const templateData = contextToTemplateData(ctx, String(templateName), String(description));
    const formattedJson = formatTemplateJson(templateData);
    setExportedJson(formattedJson);
    setShowExportModal(true);
  };

  // If we're in setup mode, show the setup screen
  if (editorMode === "setup") {
    return <TemplateSetup onCreateNew={handleCreateNew} onImportJson={handleImportJson} />;
  }

  // Otherwise, show the editor
  return (
    <>
      {loadData && (
        <TemplateEditorContent
          editorData={loadData}
          config={config}
          onExport={handleExport}
          viewport={$viewport.value}
          viewportKey={$viewportKey.value}
          auto={!$viewportSet}
          setViewport={setViewport}
        />
      )}

      {showExportModal && (
        <ExportModal templateJson={exportedJson} onClose={() => setShowExportModal(false)} />
      )}
    </>
  );
};

export default TemplateEditor;
