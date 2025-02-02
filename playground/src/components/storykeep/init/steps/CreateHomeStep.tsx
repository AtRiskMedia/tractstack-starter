import { useState, useEffect } from "react";
import ArrowLeftIcon from "@heroicons/react/24/outline/ArrowLeftIcon";

interface CreateHomeStepProps {
  onComplete: () => void;
  onBack: () => void;
  isActive: boolean;
  isProcessing: boolean;
  onConfigUpdate: (updates: Record<string, unknown>) => void;
}

export default function CreateHomeStep({ onBack, isActive }: CreateHomeStepProps) {
  const [status, setStatus] = useState<"preparing" | "ready" | "error">("preparing");
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    async function initialize() {
      if (!isActive) return;

      try {
        setStatus("preparing");
        setError(null);
        setIsInitializing(true);

        // Initialize database tables and content
        const contentResponse = await fetch("/api/turso/initializeContent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });

        if (!contentResponse.ok) {
          throw new Error("Failed to initialize content");
        }

        // Update config with initialization flags
        const configResponse = await fetch("/api/fs/update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Init-Operation": "true",
          },
          body: JSON.stringify({
            file: "init",
            updates: {
              SITE_INIT: true,
              HOME_SLUG: "hello",
              TRACTSTACK_HOME_SLUG: "HELLO",
            },
          }),
        });

        if (!configResponse.ok) {
          throw new Error("Failed to update configuration");
        }

        setStatus("ready");
      } catch (err) {
        console.error("Initialization error:", err);
        setError(err instanceof Error ? err.message : "An unknown error occurred");
        setStatus("error");
      } finally {
        setIsInitializing(false);
      }
    }

    initialize();
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4 mb-6">
        <button onClick={onBack} className="text-mydarkgrey hover:text-myblue flex items-center">
          <ArrowLeftIcon className="h-5 w-5 mr-1" />
          Back
        </button>
        <h3 className="text-xl font-bold text-mydarkgrey">Create Home Page</h3>
      </div>

      <div className="p-4 bg-myblue/5 rounded-lg">
        <div className="space-y-4">
          {error ? (
            <div className="p-4 bg-myred/10 text-myred rounded-md">
              <p>{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 text-sm underline hover:no-underline"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center p-8 border-2 border-dashed border-mylightgrey rounded-lg">
              <div className="text-center">
                <h3 className="text-lg font-bold text-mydarkgrey mb-2">
                  {status === "preparing"
                    ? "Preparing Your Story Keep..."
                    : "Your Story Keep is Ready!"}
                </h3>
                {status === "ready" && (
                  <p className="text-mydarkgrey">
                    Please reference{" "}
                    <a
                      href="https://tractstack.org"
                      target="_blank"
                      className="underline hover:text-black hover:underline-offset-4"
                    >
                      our docs
                    </a>{" "}
                    for helpful info!
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            {isInitializing || status === "preparing" ? (
              <button
                disabled
                className="px-4 py-2 text-white bg-mylightgrey rounded cursor-not-allowed"
              >
                Preparing...
              </button>
            ) : status === "ready" ? (
              <a
                href="/hello/edit"
                className="px-4 py-2 text-white bg-myblue rounded hover:bg-black"
              >
                Create Home Page
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
