import { useState, useRef, useEffect } from "react";
import type { ChangeEvent } from "react";
import { Combobox } from "@headlessui/react";
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
  onUpdate?: (hasImage: boolean) => void;
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

  useEffect(() => {
    const loadFiles = async () => {
      const response = await fetch("/api/turso/getAllFiles");
      const { data } = await response.json();
      setFiles(data);
    };
    loadFiles();
  }, []);

  // Find existing background image node
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
      } else {
        // Reset state when no background image node exists
        setBgImageNode(null);
        setObjectFit("cover");
        setHiddenViewports({
          mobile: false,
          tablet: false,
          desktop: false,
        });
      }
    }
  }, [paneNode, allNodes]);

  const handleFileSelect = (file: ImageFileNode) => {
    setSelectedFile(file);
    setIsSelectingFile(false);
    const allNodes = ctx.allNodes.get();
    const paneNode = allNodes.get(paneId) as PaneNode;
    const childNodes = ctx.getChildNodeIDs(paneNode.id);
    const existingBgNodes = childNodes
      .map((id) => allNodes.get(id))
      .filter(
        (node) => node?.nodeType === "BgPane" && "type" in node && node.type === "background-image"
      ) as BgImageNode[];

    const existingBgNode = existingBgNodes[0];
    const updatedPaneNode = { ...paneNode, isChanged: true };
    let updatedBgNode: BgImageNode;

    if (existingBgNode) {
      updatedBgNode = {
        ...existingBgNode,
        fileId: file.id,
        src: file.src,
        srcSet: file.srcSet,
        alt: file.altDescription || "Background image",
        isChanged: true,
      };
      ctx.modifyNodes([updatedBgNode, updatedPaneNode]);
    } else {
      const bgNodeId = ulid();
      updatedBgNode = {
        id: bgNodeId,
        nodeType: "BgPane",
        parentId: paneId,
        type: "background-image",
        fileId: file.id,
        src: file.src,
        srcSet: file.srcSet,
        alt: file.altDescription || "Background image",
        objectFit: "cover",
        isChanged: true,
      };
      ctx.addNode(updatedBgNode);
      ctx.notifyNode(updatedPaneNode.id);
    }
    setBgImageNode(updatedBgNode);
  };

  const filteredFiles =
    query === ""
      ? files
      : files.filter((file) => file.filename.toLowerCase().includes(query.toLowerCase()));

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setImageError(null);

    try {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setImageError("Please upload only JPG, PNG, or WebP files");
        setIsProcessing(false);
        return;
      }

      // Generate a unique file ID
      const fileId = `file-${ulid()}`;
      const monthPath = new Date().toISOString().slice(0, 7);
      const fileExtension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filename = `${fileId}.${fileExtension}`;

      // Convert file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = (e) => resolve(e.target?.result as string);
      });
      reader.readAsDataURL(file);
      const base64 = await base64Promise;

      // Save file to server
      const response = await fetch("/api/fs/saveImage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: `/images/${monthPath}`,
          filename,
          data: base64,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to upload image");
      }

      const { path: savedPath } = await response.json();

      // Create file entry in database
      const fileResponse = await fetch("/api/turso/upsertFileNode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: fileId,
          nodeType: "File",
          parentId: null,
          filename: filename,
          altDescription: "Background image",
          src: savedPath,
        }),
      });

      if (!fileResponse.ok) {
        throw new Error("Failed to save file metadata");
      }

      // Get a unique ID for the background node
      const bgNodeId = bgImageNode?.id || ulid();
      let updatedBgNode: BgImageNode;

      if (bgImageNode) {
        // Update existing node
        updatedBgNode = cloneDeep(bgImageNode);
        updatedBgNode.fileId = fileId;
        updatedBgNode.src = savedPath;
        updatedBgNode.alt = "Decorative background image";
        updatedBgNode.isChanged = true;
      } else {
        // Create new node
        updatedBgNode = {
          id: bgNodeId,
          nodeType: "BgPane",
          parentId: paneId,
          type: "background-image",
          fileId: fileId,
          src: savedPath,
          alt: "Decorative background image",
          objectFit: objectFit,
          hiddenViewportMobile: hiddenViewports.mobile,
          hiddenViewportTablet: hiddenViewports.tablet,
          hiddenViewportDesktop: hiddenViewports.desktop,
          isChanged: true,
        };
      }

      const updatedPaneNode = cloneDeep(paneNode);
      updatedPaneNode.isChanged = true;

      if (!bgImageNode) {
        ctx.addNode(updatedBgNode);
        ctx.modifyNodes([updatedPaneNode]);
      }
      // Update nodes
      else ctx.modifyNodes([updatedBgNode, updatedPaneNode]);
      setBgImageNode(updatedBgNode);

      // Notify parent component
      if (onUpdate) {
        onUpdate(true);
      }
    } catch (err) {
      setImageError("Failed to process image");
      console.error("Error uploading image:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveImage = () => {
    if (!bgImageNode) return;

    try {
      // Mark pane as changed
      const updatedPaneNode = cloneDeep(paneNode);
      updatedPaneNode.isChanged = true;

      // Delete the background image node
      ctx.deleteNode(bgImageNode.id);

      // Update pane node
      ctx.modifyNodes([updatedPaneNode]);

      // Update local state
      setBgImageNode(null);

      // Notify parent component
      if (onUpdate) {
        onUpdate(false);
      }
    } catch (error) {
      console.error("Error removing background image:", error);
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
    setHiddenViewports((prev) => ({
      ...prev,
      [viewport]: hidden,
    }));

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
              className={`flex items-center text-sm text-myblue ${isDemoMode ? `line-through` : `hover:text-myorange`}`}
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
              className="flex items-center text-sm text-myblue hover:text-myorange"
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
            <label className="block text-sm font-medium text-gray-700">Object Fit</label>
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
            <label className="block text-sm font-medium text-gray-700">Hide on Viewport</label>
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
        </>
      )}

      {isSelectingFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-bold mb-2">Select a file</h3>
            <Combobox value={selectedFile} onChange={handleFileSelect}>
              <div className="relative mt-1">
                <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-myorange sm:text-sm">
                  <Combobox.Input
                    className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-myblack focus:ring-0"
                    displayValue={(file: ImageFileNode) =>
                      file?.altDescription || file?.filename || ""
                    }
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search files..."
                    autoComplete="off"
                  />
                  <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronUpDownIcon className="h-5 w-5 text-mydarkgrey" />
                  </Combobox.Button>
                </div>
                <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                  {filteredFiles.length === 0 && query !== "" ? (
                    <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                      No files found.
                    </div>
                  ) : (
                    filteredFiles.map((file) => (
                      <Combobox.Option
                        key={file.id}
                        value={file}
                        className={({ active }) =>
                          `relative cursor-default select-none py-2 pl-10 pr-4 ${
                            active ? "bg-myorange text-white" : "text-myblack"
                          }`
                        }
                      >
                        {({ selected, active }) => (
                          <>
                            <span
                              className={`block truncate ${selected ? "font-bold" : "font-normal"}`}
                            >
                              {file.altDescription || file.filename}
                            </span>
                            {selected && (
                              <span
                                className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                                  active ? "text-white" : "text-myorange"
                                }`}
                              >
                                <CheckIcon className="h-5 w-5" />
                              </span>
                            )}
                          </>
                        )}
                      </Combobox.Option>
                    ))
                  )}
                </Combobox.Options>
              </div>
            </Combobox>
            <button
              className="mt-4 bg-mylightgrey px-4 py-2 rounded-md text-sm text-myblack hover:bg-myorange hover:text-white"
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
