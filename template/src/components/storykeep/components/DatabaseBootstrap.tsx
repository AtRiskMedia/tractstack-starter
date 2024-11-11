import { useState } from "react";
import { navigate } from "astro:transitions/client";
import { initializeBrowserSchema } from "../../../db/schema";
import { useStore } from "@nanostores/react";
import { previewMode } from "../../../store/storykeep";
import type { ReactElement } from "react";

const DatabaseBootstrap = (): ReactElement => {
  const [isInitializing, setIsInitializing] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 1,
  });
  const [error, setError] = useState<string | null>(null);
  const $previewMode = useStore(previewMode);

  const initializeDatabase = async () => {
    setIsInitializing(true);
    setError(null);

    try {
      await initializeBrowserSchema({
        onProgress: (current, total) => {
          setProgress({ current, total });
        },
      });

      setTimeout(() => {
        navigate("/storykeep");
      }, 1000);
    } catch (err) {
      console.error("Database initialization error:", err);
      setError(err instanceof Error ? err.message : "Failed to initialize database");
      setIsInitializing(false);
    }
  };

  const getProgressPercentage = () => {
    return (progress.current / progress.total) * 100;
  };

  return (
    <div className="space-y-4">
      {!isInitializing ? (
        <button
          onClick={initializeDatabase}
          className="px-4 py-2 text-white bg-myorange rounded hover:bg-myblue"
        >
          {$previewMode ? "Initialize Preview Database" : "Initialize Database Tables"}
        </button>
      ) : (
        <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-sm sm:p-6">
          <div>
            <div className="mt-3 text-center sm:mt-5">
              <h3 className="text-lg font-bold leading-6 text-mydarkgrey">
                {error
                  ? "Initialization Error"
                  : $previewMode
                    ? "Setting Up Preview..."
                    : "Initializing Database..."}
              </h3>

              {!error && (
                <div className="mt-4">
                  <div className="h-2 w-full bg-mylightgrey/20 rounded-full">
                    <div
                      className="h-full rounded-full transition-all duration-500 bg-myorange"
                      style={{ width: `${getProgressPercentage()}%` }}
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
