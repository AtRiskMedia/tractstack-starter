import { useStore } from "@nanostores/react";
import { activeHelpTemplateStore } from "@/store/storykeep";
import { useEffect, useRef, useState } from "react";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import exampleTemplate from "@/lib/page-templates/example.json";
import type { Config } from "@/types";
import type { LoadData } from "@/store/nodesSerializer.ts";
import { NodesContext } from "@/store/nodes";
import Node from "@/components/compositor-nodes/Node";

/*
 *
 example usage:
import HelpModal from "@/components/templates/HelpModal"
<HelpModal templateId="example" config={config} client:load  />
 *
 */

function getTemplate(templateId: string) {
  switch (templateId) {
    case "example":
      return exampleTemplate;
    default:
      return exampleTemplate;
  }
}

// Convert template to LoadData format
function templateToLoadData(template: any): LoadData {
  // Create a proper LoadData object
  return {
    tractstackNodes: template.tractstackNodes || [],
    storyfragmentNodes: template.storyfragmentNodes || [],
    paneNodes: template.paneNodes || [],
    childNodes: template.childNodes || [],
    fileNodes: template.fileNodes || [],
    menuNodes: template.menuNodes || [],
  };
}

interface HelpModalProps {
  config: Config;
}

export function HelpModal({ config }: HelpModalProps) {
  const activeTemplateId = useStore(activeHelpTemplateStore);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [initialized, setInitialized] = useState(false);
  const [localCtx] = useState<NodesContext>(() => new NodesContext());
  const [rootId, setRootId] = useState<string>("");

  useEffect(() => {
    if (activeTemplateId) {
      const template = getTemplate(activeTemplateId);
      const loadData = templateToLoadData(template);

      localCtx.clearAll();
      // Build nodes with proper LoadData format
      localCtx.buildNodesTreeFromRowDataMadeNodes(loadData);
      // Set tmp rootNodeId after building the nodes
      localCtx.rootNodeId.set("tmp");
      localCtx.isTemplate.set(true);
      localCtx.toolModeValStore.set({ value: "text" });

      if (template.storyfragmentNodes && template.storyfragmentNodes.length > 0) {
        const sfNode = template.storyfragmentNodes[0];
        setRootId(sfNode.id);
      }

      setInitialized(true);

      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 100);

      document.body.style.overflow = "hidden";

      return () => {
        document.body.style.overflow = "";
        localCtx.clearAll();
      };
    }
  }, [activeTemplateId, localCtx]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && activeTemplateId) {
        closeModal();
      }
    };

    if (activeTemplateId) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [activeTemplateId]);

  const closeModal = () => {
    activeHelpTemplateStore.set(null);
    setInitialized(false);
  };

  if (!activeTemplateId) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black bg-opacity-50 flex items-center justify-center overflow-y-auto p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-modal-title"
      ref={modalRef}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 id="help-modal-title" className="text-2xl font-bold text-mydarkgrey">
            {exampleTemplate.name || "Template Example"}
          </h2>
          <button
            ref={closeButtonRef}
            onClick={closeModal}
            className="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-myblue rounded-md"
            aria-label="Close"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="overflow-y-auto flex-grow p-6">
          <div className="bg-white rounded-md p-4">
            {initialized && rootId && (
              <div className="preview-container" style={{ pointerEvents: "none" }}>
                <Node nodeId={rootId} ctx={localCtx} config={config} first={true} />
              </div>
            )}
            {!initialized && (
              <div className="p-8 text-center">
                <p className="text-mydarkgrey">Loading...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default HelpModal;
