import { useState, useEffect, useCallback, useRef } from "react";
import { ulid } from "ulid";
import { useStore } from "@nanostores/react";
import { Combobox } from "@headlessui/react";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import ArrowUpTrayIcon from "@heroicons/react/24/outline/ArrowUpTrayIcon";
import FolderIcon from "@heroicons/react/24/outline/FolderIcon";
import CheckIcon from "@heroicons/react/24/outline/CheckIcon";
import ChevronUpDownIcon from "@heroicons/react/24/outline/ChevronUpDownIcon";
import imageCompression from "browser-image-compression";
import {
  paneMarkdownFragmentId,
  paneFragmentMarkdown,
  lastInteractedTypeStore,
  lastInteractedPaneStore,
  paneFiles,
} from "../../../store/storykeep";
import { useStoryKeepUtils } from "../../../utils/storykeep/StoryKeep_utils";
import ContentEditableField from "./ContentEditableField";
import { useDropdownDirection } from "../../../utils/storykeep/useDropdownDirection";
import {
  markdownToHtmlAst,
  updateMarkdownElement,
  findImageNode,
} from "../../../utils/compositor/markdownUtils";
import type { Root, Properties } from "hast";
import type { ChangeEvent } from "react";
import type { FileDatum } from "../../../types";

const TARGET_WIDTH = 1920;

const generateRandomFilename = () => {
  const characters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 10; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

const ImageMeta = (props: {
  paneId: string;
  outerIdx: number;
  idx: number;
  files: FileDatum[];
}) => {
  const { paneId, outerIdx, idx, files } = props;
  const $paneMarkdownFragmentId = useStore(paneMarkdownFragmentId, {
    keys: [paneId],
  });
  const markdownFragmentId = $paneMarkdownFragmentId[paneId]?.current;
  const $paneFragmentMarkdown = useStore(paneFragmentMarkdown, {
    keys: [markdownFragmentId],
  });
  const markdownFragment = $paneFragmentMarkdown[markdownFragmentId]?.current;
  const $paneFiles = useStore(paneFiles, { keys: [paneId] });
  const thisPaneFiles = $paneFiles[paneId]?.current;
  const { updateStoreField } = useStoryKeepUtils(markdownFragmentId || "");
  const [altText, setAltText] = useState("");
  const [filename, setFilename] = useState("");
  const [imageSrc, setImageSrc] = useState("/static.jpg");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [query, setQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState<FileDatum | null>(null);
  const [isSelectingFile, setIsSelectingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const comboboxRef = useRef<HTMLDivElement>(null);
  const { openAbove, maxHeight } = useDropdownDirection(comboboxRef);

  useEffect(() => {
    if (markdownFragment?.markdown) {
      const imageNode = findImageNode(markdownFragment.markdown.htmlAst as Root, outerIdx, idx);
      if (imageNode && "properties" in imageNode) {
        const properties = imageNode.properties as Properties;
        setAltText(properties.alt?.toString() || "");
        setFilename(properties.src?.toString() || "");
        const thisImage = files?.find((image) => image.filename === properties.src?.toString());
        if (thisImage) setImageSrc(thisImage?.optimizedSrc || thisImage?.src || `/static.jpg`);
      }
    }
  }, [markdownFragment, idx, outerIdx, thisPaneFiles]);

  const handleAltTextChange = useCallback((newValue: string) => {
    setAltText(newValue);
    return true;
  }, []);

  const updateStore = useCallback(
    (newAltText: string, newFilename?: string) => {
      if (!markdownFragmentId || !markdownFragment) return;
      lastInteractedTypeStore.set(`markdown`);
      lastInteractedPaneStore.set(paneId);
      const files = $paneFiles[paneId]?.current || [];
      const [thisFile, ...restFiles] = [
        files.find((file) => file.filename === filename),
        ...files.filter((file) => file.filename !== filename),
      ];
      if (thisFile) {
        const updatedFile = {
          ...thisFile,
          altDescription: newAltText,
        };
        updateStoreField("paneFiles", [...restFiles, updatedFile], paneId);
      }
      const newBody = updateMarkdownElement(
        markdownFragment.markdown.body,
        `![${newAltText}](${newFilename || filename})`,
        "li",
        outerIdx,
        idx
      );
      updateStoreField("paneFragmentMarkdown", {
        ...markdownFragment,
        markdown: {
          ...markdownFragment.markdown,
          body: newBody,
          htmlAst: markdownToHtmlAst(newBody),
        },
      });
    },
    [markdownFragmentId, markdownFragment, filename, outerIdx, idx, updateStoreField, paneId]
  );

  const handleEditingChange = useCallback(
    (editing: boolean) => {
      if (!editing) {
        updateStore(altText);
      }
    },
    [altText, updateStore]
  );

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setImageSrc(`/static.jpg`);
    setIsSelectingFile(false);
    updateStore(`Descriptive title`, `filename`);
  };

  const handleUploadFile = () => {
    fileInputRef.current?.click();
  };

  const upscaleImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }

        const scaleFactor = TARGET_WIDTH / img.width;
        canvas.width = TARGET_WIDTH;
        canvas.height = img.height * scaleFactor;

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Failed to create blob from canvas"));
              return;
            }
            resolve(new File([blob], file.name, { type: file.type }));
          },
          file.type,
          0.7
        );
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = URL.createObjectURL(file);
    });
  };

  const compressImage = async (file: File) => {
    const options = {
      maxSizeMB: 1,
      useWebWorker: true,
      initialQuality: 0.8,
      alwaysKeepResolution: true,
      fileType: file.type === "image/png" ? "image/webp" : file.type,
    };

    try {
      const compressedFile = await imageCompression(file, options);
      return compressedFile;
    } catch (error) {
      console.error("Error compressing image:", error);
      return file;
    }
  };

  const processImage = async (file: File) => {
    setIsProcessing(true);
    try {
      if (file.type === "image/svg+xml") {
        return file;
      }
      setProcessingStep("Upscaling image...");
      const upscaledFile = await upscaleImage(file);

      setProcessingStep("Compressing image...");
      const compressedFile = await compressImage(upscaledFile);

      return compressedFile;
    } catch (error) {
      console.error("Error processing image:", error);
      return file;
    } finally {
      setIsProcessing(false);
      setProcessingStep("");
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setProcessingStep("Starting image processing...");

      const processedFile = await processImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        setImageSrc(base64);
        const randomFilename = generateRandomFilename();
        const fileExtension = processedFile.name.split(".").pop();
        const newFilename = `${randomFilename}.${fileExtension === `png` ? `webp` : fileExtension}`;
        setFilename(newFilename);
        updateStore(`Please provide a description of this image`, newFilename);

        const newFile: FileDatum = {
          id: ulid(),
          filename: newFilename,
          altDescription: "Please provide a description of this image",
          src: base64,
          optimizedSrc: base64,
          srcSet: fileExtension !== `svg`,
          paneId,
          markdown: true,
        };
        setImageSrc(base64);
        const currentPaneFiles = $paneFiles[paneId]?.current || [];
        const updatedPaneFiles = [...currentPaneFiles, newFile];
        updateStoreField("paneFiles", updatedPaneFiles, paneId);
      };
      reader.readAsDataURL(processedFile);
    }
  };

  const handleSelectFile = () => {
    setIsSelectingFile(true);
  };

  const filteredFiles =
    query === ""
      ? files
      : files.filter((file) => file.altDescription.toLowerCase().includes(query.toLowerCase()));

  return (
    <div ref={comboboxRef} className="space-y-4">
      <div>
        <label htmlFor="image-alt-text" className="block text-sm text-mydarkgrey">
          Image Description (Alt Text)
        </label>
        <ContentEditableField
          id="image-alt-text"
          value={altText}
          onChange={handleAltTextChange}
          onEditingChange={handleEditingChange}
          placeholder="Enter image description"
          className="block w-full rounded-md border-0 px-2.5 py-1.5 pr-12 text-myblack ring-1 ring-inset ring-mygreen placeholder:text-mydarkgrey focus:ring-2 focus:ring-inset focus:ring-mygreen xs:text-sm xs:leading-6"
        />
      </div>
      <div>
        <label htmlFor="image-filename" className="block text-sm text-mydarkgrey mb-2">
          Image
        </label>
        <div className="flex items-center space-x-4">
          <div className="relative w-24 aspect-video bg-mylightgrey/5 rounded-md overflow-hidden">
            <img src={imageSrc} alt={altText} className="w-full h-full object-contain" />
            {selectedFile && (
              <button
                onClick={handleRemoveFile}
                className="absolute top-1 right-1 bg-white rounded-full p-1 shadow-md hover:bg-mylightgrey"
              >
                <XMarkIcon className="w-4 h-4 text-mydarkgrey" />
              </button>
            )}
          </div>
          <div className="flex-grow">
            <div className="mt-2 flex space-x-2">
              <button
                onClick={handleUploadFile}
                className="flex items-center text-sm text-myblue hover:text-myorange"
                disabled={isProcessing}
              >
                <ArrowUpTrayIcon className="w-4 h-4 mr-1" />
                {isProcessing ? "Processing..." : "Upload"}
              </button>
              <button
                onClick={handleSelectFile}
                className="flex items-center text-sm text-myblue hover:text-myorange"
              >
                <FolderIcon className="w-4 h-4 mr-1" />
                Select
              </button>
            </div>
          </div>
        </div>
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".jpg, .jpeg, .png, .webp, .svg"
        style={{ display: "none" }}
      />

      {isProcessing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full text-center">
            <h3 className="text-xl font-bold mb-4">Processing Image</h3>
            <div className="animate-pulse mb-4">
              <div className="h-2 bg-myorange rounded"></div>
            </div>
            <p className="text-lg text-mydarkgrey">{processingStep}</p>
          </div>
        </div>
      )}

      {isSelectingFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg w-full">
            <h3 className="text-lg font-bold mb-2">Select a file</h3>
            <Combobox
              value={selectedFile}
              onChange={(file) => {
                if (file) {
                  setSelectedFile(file);
                  setImageSrc(file.optimizedSrc || file.src || `/static.jpg`);
                  setIsSelectingFile(false);
                  updateStore(file.altDescription, file.filename);
                  const currentPaneFiles = $paneFiles[paneId]?.current || [];
                  const updatedPaneFiles = currentPaneFiles.some((f) => f.id === file.id)
                    ? currentPaneFiles
                    : [...currentPaneFiles, file];
                  updateStoreField("paneFiles", updatedPaneFiles, paneId);
                }
              }}
            >
              <div className="relative mt-1">
                <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-myorange sm:text-sm">
                  <Combobox.Input
                    className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-myblack focus:ring-0"
                    displayValue={(file: FileDatum) => file?.filename || ""}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search files..."
                    autoComplete="off"
                  />
                  <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronUpDownIcon className="h-5 w-5 text-mydarkgrey" aria-hidden="true" />
                  </Combobox.Button>
                </div>
                <Combobox.Options
                  className={`absolute z-10 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm ${
                    openAbove ? "bottom-full mb-1" : "top-full mt-1"
                  }`}
                  style={{ maxHeight: `${maxHeight}px` }}
                >
                  {filteredFiles.map((file) => (
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
                            {file.altDescription}
                          </span>
                          {selected && (
                            <span
                              className={`absolute inset-y-0 left-0 flex items-center pl-3 ${active ? "text-white" : "text-myorange"}`}
                            >
                              <CheckIcon className="h-5 w-5" aria-hidden="true" />
                            </span>
                          )}
                        </>
                      )}
                    </Combobox.Option>
                  ))}
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

export default ImageMeta;
