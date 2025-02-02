import { useState, useRef, useEffect, type ChangeEvent } from "react";
import { useDropdownDirection } from "@/utils/storykeep/useDropdownDirection";
import { Combobox } from "@headlessui/react";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import ArrowUpTrayIcon from "@heroicons/react/24/outline/ArrowUpTrayIcon";
import FolderIcon from "@heroicons/react/24/outline/FolderIcon";
import CheckIcon from "@heroicons/react/24/outline/CheckIcon";
import ChevronUpDownIcon from "@heroicons/react/24/outline/ChevronUpDownIcon";
import imageCompression from "browser-image-compression";
import type { ImageFileNode } from "@/types";

const TARGET_WIDTHS = [1920, 1080, 600];
const missingAlt = `This image requires a description!!`;

export interface ImageParams {
  fileId: string;
  src: string;
  srcSet?: string;
  altDescription: string;
}

interface ImageUploadProps {
  currentFileId: string | undefined;
  onUpdate: (params: ImageParams) => void;
  onRemove: () => void;
}

const generateRandomFilename = () => {
  const characters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return (
    Array.from({ length: 10 }, () => Math.floor(Math.random() * 256))
      //Array.from(crypto.getRandomValues(new Uint8Array(10)))
      .map((x) => characters[x % characters.length])
      .join("")
  );
};

export const ImageUpload = ({ currentFileId, onUpdate, onRemove }: ImageUploadProps) => {
  const [files, setFiles] = useState<ImageFileNode[]>([]);
  const [currentImage, setCurrentImage] = useState<string>("/static.jpg");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [query, setQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState<ImageFileNode | null>(null);
  const [isSelectingFile, setIsSelectingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const comboboxRef = useRef<HTMLDivElement>(null);
  const { openAbove, maxHeight } = useDropdownDirection(comboboxRef);

  useEffect(() => {
    const loadFiles = async () => {
      const response = await fetch("/api/turso/getAllFiles");
      const { data } = await response.json();
      setFiles(data);

      if (currentFileId) {
        const currentFile = data.find((f: ImageFileNode) => f.id === currentFileId);
        if (currentFile) {
          setCurrentImage(currentFile.optimizedSrc || currentFile.src);
        }
      }
    };
    loadFiles();
  }, [currentFileId]);

  const resizeImage = async (file: File, targetWidth: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }

        const scaleFactor = targetWidth / img.width;
        canvas.width = targetWidth;
        canvas.height = img.height * scaleFactor;

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Failed to create blob"));
              return;
            }
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          },
          "image/webp",
          0.8
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
      fileType: "image/webp",
    };

    try {
      const compressedFile = await imageCompression(file, options);
      return compressedFile;
    } catch (error) {
      console.error("Error compressing image:", error);
      return file;
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setProcessingStep("Starting image processing...");

    try {
      const fileId = generateRandomFilename();
      const monthPath = new Date().toISOString().slice(0, 7);

      if (file.type === "image/svg+xml") {
        // Handle SVG files
        const reader = new FileReader();
        reader.onload = async (e) => {
          const svgContent = e.target?.result as string;
          const filename = `${fileId}.svg`;

          const response = await fetch("/api/fs/saveImage", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              path: `/images/${monthPath}`,
              filename,
              data: svgContent,
            }),
          });
          if (!response.ok) throw new Error("Failed to save SVG");
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
              altDescription: missingAlt,
              src: savedPath,
            }),
          });
          if (!fileResponse.ok) throw new Error("Failed to save file metadata");
          setCurrentImage(savedPath);
          onUpdate({
            fileId,
            src: savedPath,
            altDescription: missingAlt,
          });
        };
        reader.readAsDataURL(file);
      } else {
        // Handle other image types
        setProcessingStep("Compressing image...");
        const compressedFile = await compressImage(file);
        const processedImages = await Promise.all(
          TARGET_WIDTHS.map(async (width) => {
            setProcessingStep(`Processing ${width}px version...`);
            const resized = await resizeImage(compressedFile, width);
            const filename = `${fileId}_${width}px.webp`;

            const response = await fetch("/api/fs/saveImage", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                path: `/images/${monthPath}`,
                filename,
                data: resized,
              }),
            });
            if (!response.ok) throw new Error(`Failed to save ${width}px image`);
            const { path } = await response.json();
            return {
              width,
              path,
            };
          })
        );
        const mainImagePath = processedImages.find((img) => img.width === 1920)?.path;
        if (!mainImagePath) throw new Error("Failed to generate main image");
        const srcSet = processedImages.map(({ path, width }) => `${path} ${width}w`).join(", ");
        // Create file entry in database
        const fileResponse = await fetch("/api/turso/upsertFileNode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: fileId,
            nodeType: "File",
            parentId: null,
            filename: `${fileId}.webp`,
            altDescription: missingAlt,
            src: mainImagePath,
            srcSet,
          }),
        });
        if (!fileResponse.ok) throw new Error("Failed to save file metadata");
        setCurrentImage(mainImagePath);
        onUpdate({
          fileId,
          src: mainImagePath,
          srcSet,
          altDescription: missingAlt,
        });
      }
    } catch (error) {
      console.error("Error processing image:", error);
      setProcessingStep("Error processing image");
    } finally {
      setIsProcessing(false);
      setProcessingStep("");
    }
  };

  const handleFileSelect = (file: ImageFileNode) => {
    setSelectedFile(file);
    setCurrentImage(file.src);
    setIsSelectingFile(false);
    onUpdate({
      fileId: file.id,
      src: file.src,
      srcSet: file.srcSet,
      altDescription: file.altDescription,
    });
  };

  const filteredFiles =
    query === ""
      ? files
      : files.filter((file) => file.filename.toLowerCase().includes(query.toLowerCase()));

  return (
    <div ref={comboboxRef} className="flex items-center space-x-4">
      <div className="relative w-40 aspect-video bg-mylightgrey/5 rounded-md overflow-hidden border border-2 bg-slate-50">
        <img src={currentImage} alt="" className="w-full h-full object-contain" />
        {currentFileId && (
          <button
            onClick={onRemove}
            className="absolute top-1 right-1 bg-white rounded-full p-1 shadow-md hover:bg-mylightgrey"
          >
            <XMarkIcon className="w-4 h-4 text-mydarkgrey" />
          </button>
        )}
      </div>

      <div className="flex-grow">
        <div className="mt-2 flex space-x-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center text-sm text-myblue hover:text-myorange"
            disabled={isProcessing}
          >
            <ArrowUpTrayIcon className="w-4 h-4 mr-1" />
            {isProcessing ? "Processing..." : "Upload"}
          </button>
          <button
            onClick={() => setIsSelectingFile(true)}
            className="flex items-center text-sm text-myblue hover:text-myorange"
          >
            <FolderIcon className="w-4 h-4 mr-1" />
            Select
          </button>
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".jpg,.jpeg,.png,.webp,.svg"
        className="hidden"
      />

      {isProcessing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md text-center">
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
          <div className="bg-white p-4 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-bold mb-2">Select a file</h3>
            <Combobox value={selectedFile} onChange={handleFileSelect}>
              <div className="relative mt-1">
                <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-myorange sm:text-sm">
                  <Combobox.Input
                    className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-myblack focus:ring-0"
                    displayValue={(file: ImageFileNode) => file?.filename || ""}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search files..."
                    autoComplete="off"
                  />
                  <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronUpDownIcon className="h-5 w-5 text-mydarkgrey" />
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

export default ImageUpload;
