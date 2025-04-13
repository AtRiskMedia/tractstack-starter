import { useState } from "react";
import ArrowLeftIcon from "@heroicons/react/24/outline/ArrowLeftIcon";
import EyeIcon from "@heroicons/react/24/outline/EyeIcon";
import EyeSlashIcon from "@heroicons/react/24/outline/EyeSlashIcon";
import PencilIcon from "@heroicons/react/24/outline/PencilIcon";
import ShieldCheckIcon from "@heroicons/react/24/outline/ShieldCheckIcon";
import { tenantIdStore } from "@/store/storykeep.ts";

interface SecurityStepProps {
  onComplete: () => void;
  onBack: () => void;
  isActive: boolean;
  validation: {
    hasPassword: boolean;
  };
  isProcessing: boolean;
  onConfigUpdate: (updates: Record<string, unknown>) => void;
}

const PasswordField = ({
  label,
  hasExisting,
  onPasswordChange,
}: {
  label: string;
  hasExisting: boolean;
  onPasswordChange: (password: string | null) => void;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");

  if (!isEditing && hasExisting) {
    return (
      <div>
        <label className="block text-mydarkgrey font-bold mb-2">{label}</label>
        <div className="flex items-center gap-3 p-3 bg-mygreen/10 text-mydarkgrey rounded-md">
          <ShieldCheckIcon className="h-5 w-5 text-mygreen" />
          <span className="flex-grow">Password configured</span>
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
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            onPasswordChange(e.target.value || null);
          }}
          className="px-3 block w-full rounded-md border-mylightgrey pr-20"
          placeholder="Enter new password"
          required={!hasExisting}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 gap-2">
          {password && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-mydarkgrey hover:text-myblue"
            >
              {showPassword ? (
                <EyeSlashIcon className="h-5 w-5" />
              ) : (
                <EyeIcon className="h-5 w-5" />
              )}
            </button>
          )}
          {hasExisting && (
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setPassword("");
                onPasswordChange(null);
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
};

export default function SecurityStep({
  onComplete,
  onBack,
  isActive,
  validation,
  isProcessing,
  onConfigUpdate,
}: SecurityStepProps) {
  const tenantId = tenantIdStore.get();
  const [adminPassword, setAdminPassword] = useState<string | null>(null);
  const [editorPassword, setEditorPassword] = useState<string | null>(null);

  // Detect multi-tenant mode
  const isMultiTenant =
    import.meta.env.PUBLIC_ENABLE_MULTI_TENANT === "true" && tenantId !== `default`;

  if (!isActive) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const updates: Record<string, string> = {};

    // Add appropriate key names based on multi-tenant mode
    if (adminPassword !== null) {
      if (isMultiTenant) {
        updates.ADMIN_PASSWORD = adminPassword;
      } else {
        updates.PRIVATE_ADMIN_PASSWORD = adminPassword;
      }
    }

    if (editorPassword !== null) {
      if (isMultiTenant) {
        updates.EDITOR_PASSWORD = editorPassword;
      } else {
        updates.PRIVATE_EDITOR_PASSWORD = editorPassword;
      }
    }

    if (Object.keys(updates).length > 0) {
      onConfigUpdate(updates);
    }

    onComplete();
  };

  const canSubmit = validation.hasPassword || (adminPassword !== null && editorPassword !== null);

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4 mb-6">
        <button onClick={onBack} className="text-mydarkgrey hover:text-myblue flex items-center">
          <ArrowLeftIcon className="h-5 w-5 mr-1" />
          Back
        </button>
        <h3 className="text-xl font-bold text-mydarkgrey">Secure Your Site</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 p-4 bg-myblue/5 rounded-lg">
        <div className="space-y-6">
          <PasswordField
            label="Admin Password"
            hasExisting={validation.hasPassword}
            onPasswordChange={setAdminPassword}
          />

          <PasswordField
            label="Editor Password"
            hasExisting={validation.hasPassword}
            onPasswordChange={setEditorPassword}
          />
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={isProcessing || !canSubmit}
            className="px-4 py-2 text-white bg-myblue rounded hover:bg-black disabled:bg-mylightgrey"
          >
            {isProcessing ? "Saving..." : "Save and Complete Setup"}
          </button>
        </div>
      </form>
    </div>
  );
}
