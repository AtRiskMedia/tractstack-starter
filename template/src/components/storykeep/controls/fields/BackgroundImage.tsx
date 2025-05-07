import { useState, useRef, useEffect, useMemo } from "react";
import type { ChangeEvent } from "react";
import { Combobox } from "@ark-ui/react";
import { createListCollection } from "@ark-ui/react/collection";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import ArrowUpTrayIcon from "@heroicons/react/24/outline/ArrowUpTrayIcon";
import FolderIcon from "@heroicons/react/24/outline/FolderIcon";
import CheckIcon from "@heroicons/react/24/outline/CheckIcon";
import ChevronUpDownIcon from "@heroicons/react/24/outline/ChevronUpDownIcon";
import { getCtx } from "@/store/nodes.ts";
import { isDemoModeStore } from "@/store/storykeep.ts";
import { cloneDeep } from "@/utils/common/helpers.ts";
import { ulid } from "ulid";
import type { ImageFileNode, BgImageNode, PaneNode } from "@/types";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export interface BackgroundImageProps {
  paneId: string;
  onUpdate: () => void;
}

const BackgroundImage = ({ paneId, onUpdate }: BackgroundImageProps) => {
  const isDemoMode = isDemoModeStore.get();
  const ctx = getCtx();
  const allNodes = ctx.allNodes.get();
  const paneNode = allNodes.get(paneId) as PaneNode;
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<ImageFileNode[]>([]);
  const [isSelectingFile, setIsSelectingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<ImageFileNode | null>(null);
  const [query, setQuery] = useState("");
  const [bgImageNode, setBgImageNode] = useState<BgImageNode | null>(null);
  const [objectFit, setObjectFit] = useState<"cover" | "contain" | "fill">("cover");
  const [hiddenViewports, setHiddenViewports] = useState({
    mobile: false,
    tablet: false,
    desktop: false,
  });
  const [localAltDescription, setLocalAltDescription] = useState<string>("");

  useEffect(() => {
    const loadFiles = async () => {
      try {
        const response = await fetch("/api/turso/getAllFiles");
        if (!response.ok) throw new Error("Failed to fetch files");
        const { data } = await response.json();
        setFiles(data);
      } catch (error) {
        console.error("[BackgroundImage] Error loading files:", error);
      }
    };
    loadFiles();
  }, []);

  useEffect(() => {
    if (paneNode) {
      const childNodes = ctx.getChildNodeIDs(paneNode.id);
      const bgNode = childNodes
        .map((id) => allNodes.get(id))
        .find(
          (node) =>
            node?.nodeType === "BgPane" && "type" in node && node.type === "background-image"
        ) as BgImageNode | undefined;

      if (bgNode) {
        setBgImageNode(bgNode);
        setObjectFit(bgNode.objectFit || "cover");
        setHiddenViewports({
          mobile: !!bgNode.hiddenViewportMobile,
          tablet: !!bgNode.hiddenViewportTablet,
          desktop: !!bgNode.hiddenViewportDesktop,
        });
        // Use nullish coalescing to ensure we always set a string
        setLocalAltDescription(bgNode.alt || "");
      } else {
        setBgImageNode(null);
        setObjectFit("cover");
        setHiddenViewports({ mobile: false, tablet: false, desktop: false });
        setLocalAltDescription("");
      }
    }
  }, [paneNode, allNodes]);

  const deleteExistingBgNodes = () => {
    const childNodes = ctx.getChildNodeIDs(paneNode.id);
    const bgNodes = childNodes
      .map((id) => allNodes.get(id))
      .filter((node) => node?.nodeType === "BgPane");

    bgNodes.forEach((node) => {
      if (node) ctx.deleteNode(node.id);
    });
  };

  const handleFileSelect = (details: { value: string[] }) => {
    const fileId = details.value[0];
    if (!fileId) return;

    const file = files.find((f) => f.id === fileId);
    if (!file) return;

    setSelectedFile(file);
    setIsSelectingFile(false);
    deleteExistingBgNodes();

    const bgNodeId = ulid();
    const defaultAlt = file.filename
      ? `Decorative Image - ${file.filename.split(".").slice(0, -1).join(".")}`
      : "Decorative Image";
    const updatedBgNode: BgImageNode = {
      id: bgNodeId,
      nodeType: "BgPane",
      parentId: paneId,
      type: "background-image",
      fileId: file.id,
      src: file.src,
      srcSet: file.srcSet,
      alt: file.altDescription || defaultAlt,
      objectFit: "cover",
      isChanged: true,
    };
    ctx.addNode(updatedBgNode);
    const updatedPaneNode = cloneDeep(paneNode);
    updatedPaneNode.isChanged = true;
    ctx.modifyNodes([updatedPaneNode]);
    setBgImageNode(updatedBgNode);
    // Use nullish coalescing to ensure we always set a string
    setLocalAltDescription(updatedBgNode.alt || "");
    onUpdate();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setImageError(null);

    try {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setImageError("Please upload only JPG, PNG, or WebP files");
        return;
      }

      const fileId = `file-${ulid()}`;
      const monthPath = new Date().toISOString().slice(0, 7);
      const fileExtension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filename = `${fileId}.${fileExtension}`;

      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = (e) => resolve(e.target?.result as string);
      });
      reader.readAsDataURL(file);
      const base64 = await base64Promise;

      const response = await fetch("/api/fs/saveImage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: `/images/${monthPath}`,
          filename,
          data: base64,
        }),
      });

      if (!response.ok) throw new Error("Failed to upload image");
      const { path: savedPath } = await response.json();

      await fetch("/api/turso/upsertFileNode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: fileId,
          nodeType: "File",
          parentId: null,
          filename,
          altDescription: `Decorative Image - ${filename.split(".").slice(0, -1).join(".")}`,
          src: savedPath,
        }),
      });

      deleteExistingBgNodes();

      const bgNodeId = ulid();
      const defaultAlt = `Decorative Image - ${filename.split(".").slice(0, -1).join(".")}`;
      const updatedBgNode: BgImageNode = {
        id: bgNodeId,
        nodeType: "BgPane",
        parentId: paneId,
        type: "background-image",
        fileId: fileId,
        src: savedPath,
        alt: defaultAlt,
        objectFit: "cover",
        isChanged: true,
      };
      ctx.addNode(updatedBgNode);
      const updatedPaneNode = cloneDeep(paneNode);
      updatedPaneNode.isChanged = true;
      ctx.modifyNodes([updatedPaneNode]);
      setBgImageNode(updatedBgNode);
      setLocalAltDescription(defaultAlt);
      onUpdate(); // Tell wrapper to re-render
    } catch (err) {
      setImageError("Failed to process image");
      console.error("[BackgroundImage] Error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveImage = () => {
    if (!bgImageNode) return;
    ctx.deleteNode(bgImageNode.id);
    const updatedPaneNode = cloneDeep(paneNode);
    updatedPaneNode.isChanged = true;
    ctx.modifyNodes([updatedPaneNode]);
    setBgImageNode(null);
    setLocalAltDescription("");
    onUpdate(); // Tell wrapper to re-render
  };

  const handleAltDescriptionBlur = () => {
    if (bgImageNode && localAltDescription !== bgImageNode.alt) {
      const updatedBgNode = cloneDeep(bgImageNode);
      updatedBgNode.alt = localAltDescription;
      updatedBgNode.isChanged = true;
      const updatedPaneNode = cloneDeep(paneNode);
      updatedPaneNode.isChanged = true;
      ctx.modifyNodes([updatedBgNode, updatedPaneNode]);
    }
  };

  const handleObjectFitChange = (newObjectFit: "cover" | "contain" | "fill") => {
    setObjectFit(newObjectFit);
    if (bgImageNode) {
      const updatedBgNode = cloneDeep(bgImageNode);
      updatedBgNode.objectFit = newObjectFit;
      updatedBgNode.isChanged = true;
      const updatedPaneNode = cloneDeep(paneNode);
      updatedPaneNode.isChanged = true;
      ctx.modifyNodes([updatedBgNode, updatedPaneNode]);
    }
  };

  const handleViewportVisibilityChange = (
    viewport: "mobile" | "tablet" | "desktop",
    hidden: boolean
  ) => {
    setHiddenViewports((prev) => ({ ...prev, [viewport]: hidden }));
    if (bgImageNode) {
      const updatedBgNode = cloneDeep(bgImageNode);
      if (viewport === "mobile") updatedBgNode.hiddenViewportMobile = hidden;
      if (viewport === "tablet") updatedBgNode.hiddenViewportTablet = hidden;
      if (viewport === "desktop") updatedBgNode.hiddenViewportDesktop = hidden;
      updatedBgNode.isChanged = true;
      const updatedPaneNode = cloneDeep(paneNode);
      updatedPaneNode.isChanged = true;
      ctx.modifyNodes([updatedBgNode, updatedPaneNode]);
    }
  };

  // Create collection for Ark UI Combobox
  const collection = useMemo(() => {
    const filteredFiles =
      query === ""
        ? files
        : files.filter(
            (file) =>
              file.filename.toLowerCase().includes(query.toLowerCase()) ||
              (file.altDescription &&
                file.altDescription.toLowerCase().includes(query.toLowerCase()))
          );

    return createListCollection({
      items: filteredFiles,
      itemToValue: (item) => item.id,
      itemToString: (item) => item.altDescription || item.filename,
    });
  }, [files, query]);

  // CSS to properly style the combobox items with hover and selection
  const comboboxItemStyles = `
    .file-item[data-highlighted] {
      background-color: #0891b2; /* bg-cyan-600 */
      color: white;
    }
    .file-item[data-highlighted] .file-indicator {
      color: white;
    }
    .file-item[data-state="checked"] .file-indicator {
      display: flex;
    }
    .file-item .file-indicator {
      display: none;
    }
    .file-item[data-state="checked"] {
      font-weight: bold;
    }
  `;

  return (
    <div className="space-y-6 w-full">
      <div className="w-full flex flex-col space-y-4">
        {bgImageNode && bgImageNode.src ? (
          <div
            className="relative border border-gray-300 rounded-md overflow-hidden bg-gray-100"
            style={{ width: "100%", height: "160px" }}
          >
            <div
              className="w-full h-full"
              style={{
                backgroundImage: `url(${bgImageNode.src})`,
                backgroundSize: objectFit,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
              }}
            ></div>
            <button
              onClick={handleRemoveImage}
              disabled={isProcessing}
              className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md hover:bg-mylightgrey disabled:opacity-50"
            >
              <XMarkIcon className="w-4 h-4 text-mydarkgrey" />
            </button>
          </div>
        ) : null}

        <div className="flex justify-between items-center">
          <div className="flex space-x-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing || isDemoMode}
              title={isDemoMode ? `Disabled in demo mode` : ``}
              className={`flex items-center text-sm text-myblue ${isDemoMode ? `line-through` : `hover:text-cyan-600`}`}
            >
              <ArrowUpTrayIcon className="w-4 h-4 mr-1" />
              {isProcessing
                ? "Processing..."
                : bgImageNode?.src
                  ? "Replace Image"
                  : "Upload Background Image"}
            </button>

            <button
              onClick={() => setIsSelectingFile(true)}
              className="flex items-center text-sm text-myblue hover:text-cyan-600"
            >
              <FolderIcon className="w-4 h-4 mr-1" />
              Select Image
            </button>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
          />
          {imageError && <p className="mt-2 text-sm text-red-600">{imageError}</p>}
        </div>
      </div>

      {bgImageNode && (
        <>
          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700">Object Fit</label>
            <div className="flex space-x-4">
              {["cover", "contain", "fill"].map((fit) => (
                <label key={fit} className="inline-flex items-center">
                  <input
                    type="radio"
                    name="objectFit"
                    value={fit}
                    checked={objectFit === fit}
                    onChange={() => handleObjectFitChange(fit as "cover" | "contain" | "fill")}
                    className="focus:ring-myblue h-4 w-4 text-myblue border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700 capitalize">{fit}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700">Hide on Viewport</label>
            <div className="flex flex-wrap gap-4">
              {["mobile", "tablet", "desktop"].map((viewport) => (
                <label key={viewport} className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={hiddenViewports[viewport as keyof typeof hiddenViewports]}
                    onChange={(e) =>
                      handleViewportVisibilityChange(
                        viewport as "mobile" | "tablet" | "desktop",
                        e.target.checked
                      )
                    }
                    className="focus:ring-myblue h-4 w-4 text-myblue border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700 capitalize">{viewport}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700">Alt Description</label>
            <input
              type="text"
              value={localAltDescription}
              onChange={(e) => setLocalAltDescription(e.target.value)}
              onBlur={handleAltDescriptionBlur}
              className="w-full border border-gray-300 rounded-md p-2"
              placeholder="Enter alt description"
            />
          </div>
        </>
      )}

      {isSelectingFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg w-full max-w-md">
            <style>{comboboxItemStyles}</style>
            <h3 className="text-lg font-bold mb-2">Select a file</h3>

            <Combobox.Root
              collection={collection}
              value={selectedFile ? [selectedFile.id] : []}
              onValueChange={handleFileSelect}
              onInputValueChange={(details) => setQuery(details.inputValue)}
              loopFocus={true}
              openOnKeyPress={true}
              composite={true}
            >
              <div className="relative mt-1">
                <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-cyan-600 sm:text-sm">
                  <Combobox.Input
                    className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-myblack focus:ring-0"
                    placeholder="Search files..."
                    autoComplete="off"
                  />
                  <Combobox.Trigger className="absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronUpDownIcon className="h-5 w-5 text-mydarkgrey" />
                  </Combobox.Trigger>
                </div>

                <Combobox.Content className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                  {collection.items.length === 0 ? (
                    <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                      No files found.
                    </div>
                  ) : (
                    collection.items.map((file) => (
                      <Combobox.Item
                        key={file.id}
                        item={file}
                        className="file-item relative cursor-default select-none py-2 pl-10 pr-4 text-myblack"
                      >
                        <span className="block truncate">
                          {file.altDescription || file.filename}
                        </span>
                        <span className="file-indicator absolute inset-y-0 left-0 flex items-center pl-3 text-cyan-600">
                          <CheckIcon className="h-5 w-5" />
                        </span>
                      </Combobox.Item>
                    ))
                  )}
                </Combobox.Content>
              </div>
            </Combobox.Root>

            <button
              className="mt-4 bg-mylightgrey px-4 py-2 rounded-md text-sm text-myblack hover:bg-cyan-600 hover:text-white"
              onClick={() => setIsSelectingFile(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackgroundImage;
