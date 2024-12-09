import { useState } from "react";
import ArrowLeftIcon from "@heroicons/react/24/outline/ArrowLeftIcon";
import CredentialField from "./CredentialField";
import type { ValidationResult } from "../../../../types";

interface IntegrationsStepProps {
  onComplete: () => void;
  onBack: () => void;
  isActive: boolean;
  validation: ValidationResult;
  isProcessing: boolean;
  onConfigUpdate: (updates: Record<string, unknown>) => void;
}

export default function IntegrationsStep({
  onComplete,
  onBack,
  isActive,
  validation,
  isProcessing,
  onConfigUpdate,
}: IntegrationsStepProps) {
  const [error, setError] = useState<string | null>(null);
  const [tursoUrl, setTursoUrl] = useState<string | null>(null);
  const [tursoToken, setTursoToken] = useState<string | null>(null);
  const [assemblyAiKey, setAssemblyAiKey] = useState<string | null>(null);

  const hasTursoConfigured = validation.capabilities.hasTurso;
  const hasAssemblyAIConfigured = validation.capabilities.hasAssemblyAI;

  if (!isActive) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const updates: Record<string, string> = {};

      if (tursoUrl !== null || tursoToken !== null) {
        if (!tursoUrl || !tursoToken) {
          throw new Error("Both Turso Database URL and Auth Token are required when updating");
        }
        updates.PRIVATE_TURSO_DATABASE_URL = tursoUrl;
        updates.PRIVATE_TURSO_AUTH_TOKEN = tursoToken;
      }

      if (assemblyAiKey !== null) {
        updates.PRIVATE_ASSEMBLYAI_API_KEY = assemblyAiKey;
      }

      if (Object.keys(updates).length > 0) {
        onConfigUpdate(updates);
      }
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4 mb-6">
        <button onClick={onBack} className="text-mydarkgrey hover:text-myblue flex items-center">
          <ArrowLeftIcon className="h-5 w-5 mr-1" />
          Back
        </button>
        <h3 className="text-xl font-bold text-mydarkgrey">Set Up Integrations</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 p-4 bg-myblue/5 rounded-lg">
        {error && <div className="p-4 bg-myred/10 text-myred rounded-md">{error}</div>}

        <div className="space-y-4">
          <CredentialField
            label="Turso Database URL"
            placeholder="libsql://your-db-name.turso.io"
            hasExisting={hasTursoConfigured}
            isSecret={false}
            onChange={setTursoUrl}
          />

          <CredentialField
            label="Turso Auth Token"
            placeholder="eyJhbG..."
            hasExisting={hasTursoConfigured}
            onChange={setTursoToken}
          />

          <CredentialField
            label="AssemblyAI API Key"
            placeholder="Optional: For AI-powered features"
            hasExisting={hasAssemblyAIConfigured}
            onChange={setAssemblyAiKey}
            optional={true}
          />
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={isProcessing}
            className="px-4 py-2 text-white bg-myblue rounded hover:bg-black disabled:bg-mylightgrey"
          >
            {isProcessing ? "Saving..." : "Save and Continue"}
          </button>
        </div>
      </form>
    </div>
  );
}
