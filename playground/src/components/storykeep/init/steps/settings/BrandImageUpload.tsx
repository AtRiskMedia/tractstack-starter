import { useRef } from "react";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import ArrowUpTrayIcon from "@heroicons/react/24/outline/ArrowUpTrayIcon";
import type { ChangeEvent } from "react";

interface BrandImageUploadProps {
  id: string;
  value: string;
  path: string;
  onChange: (base64: string, extension: string, filename: string) => void;
  height?: number;
  width?: number;
  allowedTypes: string[];
}

const BrandImageUpload = ({
  id,
  value,
  path,
  onChange,
  height = 80,
  width,
  allowedTypes,
}: BrandImageUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = (e: React.MouseEvent) => {
    e.preventDefault();
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      onChange(base64, ext, file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    onChange("", "", "");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const style = {
    height: height ? `${height}px` : undefined,
    width: width ? `${width}px` : undefined,
  };

  const imageSrc = value || path;

  if (!imageSrc) {
    return (
      <div>
        <button
          onClick={handleUploadClick}
          className="flex items-center text-sm text-myblue hover:text-myorange"
        >
          <ArrowUpTrayIcon className="w-4 h-4 mr-1" />
          Upload
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept={allowedTypes.join(", ")}
          style={{ display: "none" }}
          id={id}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-4">
      <div className="relative bg-mylightgrey/5 rounded-md overflow-hidden" style={style}>
        <img src={imageSrc} alt="" className="w-full h-full object-contain" />
        <button
          onClick={handleRemove}
          className="absolute top-1 right-1 bg-white rounded-full p-1 shadow-md hover:bg-mylightgrey"
        >
          <XMarkIcon className="w-4 h-4 text-mydarkgrey" />
        </button>
      </div>
      <div className="flex-grow">
        <div className="mt-2">
          <button
            onClick={handleUploadClick}
            className="flex items-center text-sm text-myblue hover:text-myorange"
          >
            <ArrowUpTrayIcon className="w-4 h-4 mr-1" />
            Change
          </button>
          {path && <p className="text-xs text-mydarkgrey mt-1">{path}</p>}
        </div>
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={allowedTypes.join(", ")}
        style={{ display: "none" }}
        id={id}
      />
    </div>
  );
};

export default BrandImageUpload;
