import { useRef, type ChangeEvent } from "react";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import ArrowUpTrayIcon from "@heroicons/react/24/outline/ArrowUpTrayIcon";

interface ResourceImageUploadProps {
  imageToShow: string | null;
  imageSrcSet?: string;
  onFileSelect: (file: File | null) => void;
  onRemove: () => void;
  isProcessing?: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];

export default function ResourceImageUpload({
  imageToShow,
  imageSrcSet,
  onFileSelect,
  onRemove,
  isProcessing = false,
}: ResourceImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;

    if (file) {
      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        alert("Please select a valid image file (JPEG, PNG, WebP, or SVG)");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        alert("File size must be less than 10MB");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
    }

    onFileSelect(file);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex items-center space-x-4">
      <div className="relative w-40 aspect-video bg-mylightgrey/5 rounded-md overflow-hidden border border-2 bg-slate-50">
        {imageToShow ? (
          <img
            src={imageToShow}
            srcSet={imageSrcSet}
            alt=""
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-mydarkgrey">
            No image
          </div>
        )}
        {imageToShow && !isProcessing && (
          <button
            onClick={onRemove}
            className="absolute top-1 right-1 bg-white rounded-full p-1 shadow-md hover:bg-mylightgrey"
            type="button"
          >
            <XMarkIcon className="w-4 h-4 text-mydarkgrey" />
          </button>
        )}
      </div>

      <div className="flex-grow">
        <button
          onClick={handleUploadClick}
          disabled={isProcessing}
          className="flex items-center text-sm text-myblue hover:text-cyan-600 disabled:opacity-50"
          type="button"
        >
          <ArrowUpTrayIcon className="w-4 h-4 mr-1" />
          {isProcessing ? "Processing..." : imageToShow ? "Change" : "Upload"}
        </button>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".jpg,.jpeg,.png,.webp,.svg"
        className="hidden"
        disabled={isProcessing}
      />
    </div>
  );
}
