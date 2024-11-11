import { useState } from "react";
import { useStore } from "@nanostores/react";
import { previewMode, previewDbInitialized, getPreviewModeValue } from "../../../store/storykeep";

const DatabaseBootstrap = () => {
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const $previewMode = getPreviewModeValue(useStore(previewMode));

  const initializeDatabase = async () => {
    setIsInitializing(true);
    setError(null);

    try {
      // Initialize database
      const initResponse = await fetch("/api/turso/init", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!initResponse.ok) {
        throw new Error(await initResponse.text());
      }

      const initData = await initResponse.json();

      if (!initData.success) {
        throw new Error(initData.error || "Failed to initialize database");
      }

      // Wait a moment for the database to be ready
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Verify database status
      let retries = 3;
      let isReady = false;

      while (retries > 0 && !isReady) {
        const statusResponse = await fetch("/api/turso/status", {
          method: "POST",
        });

        if (!statusResponse.ok) {
          throw new Error("Failed to verify database status");
        }

        const statusData = await statusResponse.json();

        if (statusData.isReady) {
          isReady = true;
          if ($previewMode) {
            previewDbInitialized.set("true");
          }
          setIsInitializing(false);
          break;
        } else {
          retries--;
          if (retries > 0) {
            // Wait before retry
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
      }

      if (!isReady) {
        throw new Error("Database initialization timed out after multiple attempts");
      }
    } catch (err) {
      console.error("Database initialization error:", err);
      setError(err instanceof Error ? err.message : "Failed to initialize database");
      setIsInitializing(false);
    }
  };

  return (
    <div className="space-y-4">
      {!isInitializing ? (
        <button
          onClick={initializeDatabase}
          className="px-4 py-2 text-white bg-myorange rounded hover:bg-myblue"
        >
          Initialize Database Tables
        </button>
      ) : (
        <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-sm sm:p-6">
          <div>
            <div className="mt-3 text-center sm:mt-5">
              <h3 className="text-lg font-bold leading-6 text-mydarkgrey">
                {error ? "Initialization Error" : "Initializing Database..."}
              </h3>

              {!error && (
                <div className="mt-4">
                  <div className="h-2 w-full bg-mylightgrey/20 rounded-full">
                    <div
                      className="h-full rounded-full transition-all duration-500 bg-myorange"
                      style={{ width: "100%" }}
                    />
                  </div>
                </div>
              )}

              <div className="mt-4">
                <p className="text-sm text-mydarkgrey">
                  {error ? error : "Creating tables and indexes..."}
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-5 sm:mt-6">
              <button
                type="button"
                className="inline-flex w-full justify-center rounded-md bg-myorange px-3 py-2 text-sm font-bold text-black hover:bg-black hover:text-white"
                onClick={() => {
                  setError(null);
                  setIsInitializing(false);
                }}
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DatabaseBootstrap;
