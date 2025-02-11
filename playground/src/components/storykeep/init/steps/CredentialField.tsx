import { useState } from "react";
import PencilIcon from "@heroicons/react/24/outline/PencilIcon";
import EyeIcon from "@heroicons/react/24/outline/EyeIcon";
import EyeSlashIcon from "@heroicons/react/24/outline/EyeSlashIcon";
import ShieldCheckIcon from "@heroicons/react/24/outline/ShieldCheckIcon";

interface CredentialFieldProps {
  label: string;
  placeholder: string;
  hasExisting: boolean;
  isSecret?: boolean;
  onChange: (value: string | null) => void;
  optional?: boolean;
}

export default function CredentialField({
  label,
  placeholder,
  hasExisting,
  isSecret = true,
  onChange,
  optional = false,
}: CredentialFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showValue, setShowValue] = useState(false);
  const [value, setValue] = useState("");

  if (!isEditing && hasExisting) {
    return (
      <div>
        <label className="block text-mydarkgrey font-bold mb-2">{label}</label>
        <div className="flex items-center gap-3 p-3 bg-mygreen/10 text-mydarkgrey rounded-md">
          <ShieldCheckIcon className="h-5 w-5 text-mygreen" />
          <span className="flex-grow">Configured</span>
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1 text-sm text-myblue hover:text-myorange"
          >
            <PencilIcon className="h-4 w-4" />
            Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className="block text-mydarkgrey font-bold mb-2">{label}</label>
      <div className="relative">
        <input
          type={isSecret && !showValue ? "password" : "text"}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            onChange(e.target.value || null);
          }}
          className="px-3 block w-full rounded-md border-mylightgrey pr-20"
          placeholder={placeholder}
          required={!optional}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 gap-2">
          {isSecret && value && (
            <button
              type="button"
              onClick={() => setShowValue(!showValue)}
              className="text-mydarkgrey hover:text-myblue"
            >
              {showValue ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
            </button>
          )}
          {hasExisting && (
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setValue("");
                onChange(null);
              }}
              className="text-sm text-mydarkgrey hover:text-myblue"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
