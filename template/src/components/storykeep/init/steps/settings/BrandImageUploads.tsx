import BrandImageUpload from "./BrandImageUpload";
import InformationCircleIcon from "@heroicons/react/24/outline/InformationCircleIcon";
import type { Config } from "../../../../../types";

export interface ImageConfig {
  height?: number;
  width?: number;
  types: string[];
  filename: string;
  helpText: string;
}

export const imageConfigs: Record<string, ImageConfig> = {
  LOGO: {
    height: 80,
    types: [".svg", ".png"],
    filename: "logo",
    helpText: "SVG preferred; or transparent PNG",
  },
  WORDMARK: {
    width: 200,
    types: [".svg", ".png"],
    filename: "wordmark",
    helpText: "SVG preferred; or transparent PNG",
  },
  OG: {
    height: 500,
    types: [".jpg", ".jpeg", ".png"],
    filename: "og",
    helpText: "1200x630px recommended",
  },
  OGLOGO: {
    height: 200,
    types: [".jpg", ".jpeg", ".png"],
    filename: "oglogo",
    helpText: "Minimum 200x200px; square",
  },
  FAVICON: {
    height: 48,
    types: [".ico", ".svg", ".png"],
    filename: "favicon",
    helpText: "ICO format recommended, 48x48",
  },
};

interface BrandImageUploadsProps {
  images: Record<string, string>;
  initialConfig: Config | null;
  onImageChange: (id: string, base64: string, filename: string) => void;
}

export default function BrandImageUploads({
  images,
  initialConfig,
  onImageChange,
}: BrandImageUploadsProps) {
  const imageFields = Object.entries(imageConfigs).map(([id, config]) => ({
    id,
    value: images[id] || "",
    path: (initialConfig?.init?.[id as keyof typeof initialConfig.init] as string) || "",
    description: config.filename.charAt(0).toUpperCase() + config.filename.slice(1),
    config,
  }));

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-mydarkgrey">Brand Assets</h3>
      <div className="grid grid-cols-1 gap-6">
        {imageFields.map((field) => (
          <div key={field.id} className="space-y-2">
            <label className="block text-sm font-medium text-mydarkgrey flex items-center">
              {field.description}
              <div className="relative ml-1 group">
                <InformationCircleIcon className="h-5 w-5 text-myblue cursor-help" />
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block bg-white border border-mylightgrey rounded p-2 shadow-lg z-10 w-64">
                  <p className="text-sm text-mydarkgrey">{field.config.helpText}</p>
                </div>
              </div>
            </label>
            <BrandImageUpload
              id={field.id}
              value={field.value}
              path={field.path}
              onChange={(base64, filename) => onImageChange(field.id, base64, filename)}
              height={field.config.height}
              width={field.config.width}
              allowedTypes={field.config.types}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
