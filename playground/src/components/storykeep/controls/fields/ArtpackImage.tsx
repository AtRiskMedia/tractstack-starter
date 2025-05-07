import { useState, useEffect, useMemo } from "react";
import { Combobox } from "@ark-ui/react";
import { createListCollection } from "@ark-ui/react/collection";
import { Dialog } from "@headlessui/react";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import SwatchIcon from "@heroicons/react/24/outline/SwatchIcon";
import ChevronUpDownIcon from "@heroicons/react/24/outline/ChevronUpDownIcon";
import CheckIcon from "@heroicons/react/24/outline/CheckIcon";
import { getCtx } from "@/store/nodes.ts";
import { hasArtpacksStore } from "@/store/storykeep.ts";
import { cloneDeep } from "@/utils/common/helpers.ts";
import { ulid } from "ulid";
import type { ArtpackImageNode, PaneNode } from "@/types";

export interface ArtpackImageProps {
  paneId: string;
  onUpdate: () => void;
}

const ArtpackImage = ({ paneId, onUpdate }: ArtpackImageProps) => {
  const ctx = getCtx();
  const allNodes = ctx.allNodes.get();
  const paneNode = allNodes.get(paneId) as PaneNode;
  const $artpacks = hasArtpacksStore.get();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<string>("t8k");
  const [availableImages, setAvailableImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [query, setQuery] = useState("");
  const [artpackNode, setArtpackNode] = useState<ArtpackImageNode | null>(null);
  const [objectFit, setObjectFit] = useState<"cover" | "contain" | "fill">("cover");
  const [hiddenViewports, setHiddenViewports] = useState({
    mobile: false,
    tablet: false,
    desktop: false,
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (paneNode) {
      const childNodes = ctx.getChildNodeIDs(paneNode.id);
      const artNode = childNodes
        .map((id) => allNodes.get(id))
        .find(
          (node) => node?.nodeType === "BgPane" && "type" in node && node.type === "artpack-image"
        ) as ArtpackImageNode | undefined;

      if (artNode) {
        setArtpackNode(artNode);
        setObjectFit(artNode.objectFit || "cover");
        setHiddenViewports({
          mobile: !!artNode.hiddenViewportMobile,
          tablet: !!artNode.hiddenViewportTablet,
          desktop: !!artNode.hiddenViewportDesktop,
        });
        if ("collection" in artNode && "image" in artNode) {
          setSelectedCollection(artNode.collection || "");
          setSelectedImage(artNode.image || "");
          if (artNode.collection && artNode.image) {
            setPreviewUrl(`/artpacks/${artNode.collection}/${artNode.image}_1080px.webp`);
          }
        }
      } else {
        setArtpackNode(null);
        setObjectFit("cover");
        setHiddenViewports({ mobile: false, tablet: false, desktop: false });
        setPreviewUrl(null);
      }
    }
  }, [paneNode, allNodes]);

  useEffect(() => {
    if (selectedCollection && $artpacks && $artpacks[selectedCollection]) {
      setIsLoading(true);
      const images = $artpacks[selectedCollection];
      setAvailableImages(images);
      setTimeout(() => setIsLoading(false), 0);
    } else {
      setAvailableImages([]);
      setIsLoading(false);
    }
  }, [selectedCollection, $artpacks]);

  // Create collection for Ark UI Combobox
  const collection = useMemo(() => {
    const filteredCollections =
      query === ""
        ? Object.keys($artpacks || {})
        : Object.keys($artpacks || {}).filter((collection) =>
            collection.toLowerCase().includes(query.toLowerCase())
          );

    return createListCollection({
      items: filteredCollections,
      itemToValue: (item) => item,
      itemToString: (item) => item,
    });
  }, [$artpacks, query]);

  const buildImageSrcSet = (collection: string, image: string): string => {
    return [
      `/artpacks/${collection}/${image}_1920px.webp 1920w`,
      `/artpacks/${collection}/${image}_1080px.webp 1080w`,
      `/artpacks/${collection}/${image}_600px.webp 600w`,
    ].join(", ");
  };

  const deleteExistingBgNodes = () => {
    const childNodes = ctx.getChildNodeIDs(paneNode.id);
    const bgNodes = childNodes
      .map((id) => allNodes.get(id))
      .filter((node) => node?.nodeType === "BgPane");

    bgNodes.forEach((node) => {
      if (node) ctx.deleteNode(node.id);
    });
  };

  const handleSelectArtpackImage = (collection: string, image: string) => {
    const src = `/artpacks/${collection}/${image}_1920px.webp`;
    const srcSet = buildImageSrcSet(collection, image);

    setSelectedCollection(collection);
    setSelectedImage(image);
    setPreviewUrl(`/artpacks/${collection}/${image}_1080px.webp`);

    deleteExistingBgNodes();

    const artNodeId = ulid();
    const updatedArtNode: ArtpackImageNode = {
      id: artNodeId,
      nodeType: "BgPane",
      parentId: paneId,
      type: "artpack-image",
      collection,
      image,
      src,
      srcSet,
      alt: `Artpack image from ${collection} collection`,
      objectFit: "cover",
      isChanged: true,
    };
    ctx.addNode(updatedArtNode);
    const updatedPaneNode = cloneDeep(paneNode);
    updatedPaneNode.isChanged = true;
    ctx.modifyNodes([updatedPaneNode]);
    setArtpackNode(updatedArtNode);
    setIsModalOpen(false);
    onUpdate();
  };

  const handleRemoveImage = () => {
    if (!artpackNode) return;
    ctx.deleteNode(artpackNode.id);
    const updatedPaneNode = cloneDeep(paneNode);
    updatedPaneNode.isChanged = true;
    ctx.modifyNodes([updatedPaneNode]);
    setArtpackNode(null);
    setSelectedCollection("");
    setSelectedImage("");
    setPreviewUrl(null);
    onUpdate();
  };

  const handleObjectFitChange = (newObjectFit: "cover" | "contain" | "fill") => {
    setObjectFit(newObjectFit);
    if (artpackNode) {
      const updatedArtNode = cloneDeep(artpackNode);
      updatedArtNode.objectFit = newObjectFit;
      updatedArtNode.isChanged = true;
      const updatedPaneNode = cloneDeep(paneNode);
      updatedPaneNode.isChanged = true;
      ctx.modifyNodes([updatedArtNode, updatedPaneNode]);
    }
  };

  const handleViewportVisibilityChange = (
    viewport: "mobile" | "tablet" | "desktop",
    hidden: boolean
  ) => {
    setHiddenViewports((prev) => ({ ...prev, [viewport]: hidden }));
    if (artpackNode) {
      const updatedArtNode = cloneDeep(artpackNode);
      if (viewport === "mobile") updatedArtNode.hiddenViewportMobile = hidden;
      if (viewport === "tablet") updatedArtNode.hiddenViewportTablet = hidden;
      if (viewport === "desktop") updatedArtNode.hiddenViewportDesktop = hidden;
      updatedArtNode.isChanged = true;
      const updatedPaneNode = cloneDeep(paneNode);
      updatedPaneNode.isChanged = true;
      ctx.modifyNodes([updatedArtNode, updatedPaneNode]);
    }
  };

  const handleCollectionSelect = (details: { value: string[] }) => {
    const newCollection = details.value[0] || "";
    if (newCollection) {
      setIsLoading(true);
      setSelectedCollection(newCollection);
    }
  };

  // CSS to properly style the combobox items with hover and selection
  const comboboxItemStyles = `
    .collection-item[data-highlighted] {
      background-color: #0891b2; /* bg-cyan-600 */
      color: white;
    }
    .collection-item[data-highlighted] .collection-indicator {
      color: white;
    }
    .collection-item[data-state="checked"] .collection-indicator {
      display: flex;
    }
    .collection-item .collection-indicator {
      display: none;
    }
    .collection-item[data-state="checked"] {
      font-weight: bold;
    }
  `;

  return (
    <div className="space-y-6 w-full">
      <style>{comboboxItemStyles}</style>
      <div className="w-full flex flex-col space-y-4">
        {previewUrl && (
          <div
            className="relative border border-gray-300 rounded-md overflow-hidden bg-gray-100"
            style={{ width: "100%", height: "160px" }}
          >
            <div
              className="w-full h-full"
              style={{
                backgroundImage: `url(${previewUrl})`,
                backgroundSize: objectFit,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
              }}
            ></div>
            <button
              onClick={handleRemoveImage}
              className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md hover:bg-mylightgrey"
            >
              <XMarkIcon className="w-4 h-4 text-mydarkgrey" />
            </button>
          </div>
        )}

        <div className="flex justify-between items-center">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center text-sm text-myblue hover:text-cyan-600"
          >
            <SwatchIcon className="w-4 h-4 mr-1" />
            {previewUrl ? "Change Artpack Image" : "Use Artpack Image"}
          </button>
        </div>
      </div>

      {artpackNode && (
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
        </>
      )}

      <Dialog
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        className="relative"
        style={{ zIndex: "10010" }}
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-3xl rounded bg-white p-6 shadow-xl">
            <Dialog.Title className="text-lg font-bold mb-4">Select Artpack Image</Dialog.Title>
            {Object.keys($artpacks || {}).length === 0 ? (
              <div className="text-center py-8">
                <p className="text-mydarkgrey">No artpack collections available.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-mydarkgrey mb-2">
                    Select Collection
                  </label>
                  <Combobox.Root
                    collection={collection}
                    value={selectedCollection ? [selectedCollection] : []}
                    onValueChange={handleCollectionSelect}
                    onInputValueChange={(details) => setQuery(details.inputValue)}
                    loopFocus={true}
                    openOnKeyPress={true}
                    composite={true}
                  >
                    <div className="relative">
                      <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left border border-gray-300 shadow-sm focus-within:border-myblue focus-within:ring-1 focus-within:ring-myblue">
                        <Combobox.Input
                          className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-mydarkgrey focus:ring-0"
                          placeholder="Select a collection..."
                          autoComplete="off"
                        />
                        <Combobox.Trigger className="absolute inset-y-0 right-0 flex items-center pr-2">
                          <ChevronUpDownIcon
                            className="h-5 w-5 text-mydarkgrey"
                            aria-hidden="true"
                          />
                        </Combobox.Trigger>
                      </div>
                      <Combobox.Content className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                        {collection.items.length === 0 ? (
                          <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                            No collections found.
                          </div>
                        ) : (
                          collection.items.map((item) => (
                            <Combobox.Item
                              key={item}
                              item={item}
                              className="collection-item relative cursor-default select-none py-2 pl-10 pr-4 text-mydarkgrey"
                            >
                              <span className="block truncate">{item}</span>
                              <span className="collection-indicator absolute inset-y-0 left-0 flex items-center pl-3 text-cyan-600">
                                <CheckIcon className="h-5 w-5" aria-hidden="true" />
                              </span>
                            </Combobox.Item>
                          ))
                        )}
                      </Combobox.Content>
                    </div>
                  </Combobox.Root>
                </div>

                {!isLoading && selectedCollection && availableImages.length > 0 ? (
                  <div>
                    <label className="block text-sm font-bold text-mydarkgrey mb-2">
                      Select Image from {selectedCollection}
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-60 overflow-y-auto p-2">
                      {availableImages.map((image) => (
                        <div
                          key={image}
                          className={`relative cursor-pointer border rounded overflow-hidden hover:border-cyan-600 transition-colors ${
                            selectedImage === image ? "ring-2 ring-cyan-600" : "border-gray-200"
                          }`}
                          onClick={() => handleSelectArtpackImage(selectedCollection, image)}
                        >
                          <img
                            src={`/artpacks/${selectedCollection}/${image}_600px.webp`}
                            alt={`${image} from ${selectedCollection}`}
                            className="w-full aspect-video object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 hover:bg-opacity-20 transition-opacity">
                            <span className="px-2 py-1 bg-white bg-opacity-80 text-xs text-mydarkgrey rounded truncate max-w-full">
                              {image}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : isLoading ? (
                  <div className="text-center py-4">
                    <p className="text-mydarkgrey">Loading images...</p>
                  </div>
                ) : null}

                <div className="flex justify-end space-x-3 mt-4">
                  <button
                    className="px-4 py-2 bg-mylightgrey text-mydarkgrey rounded hover:bg-gray-300"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
};

export default ArtpackImage;
