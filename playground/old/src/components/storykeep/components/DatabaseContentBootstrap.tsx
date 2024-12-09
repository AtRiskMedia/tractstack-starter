import { useState } from "react";
import { navigate } from "astro:transitions/client";

const DatabaseContentBootstrap = () => {
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializeDatabaseContent = async () => {
    setIsInitializing(true);
    setError(null);

    try {
      // First check database status
      const statusResponse = await fetch("/api/turso/status", {
        method: "POST",
      });

      if (!statusResponse.ok) {
        throw new Error("Failed to check database status");
      }

      const statusData = await statusResponse.json();
      if (!statusData.success || !statusData.isReady) {
        throw new Error(
          "Database tables not initialized. Please initialize database tables first."
        );
      }

      // Then initialize content
      const initResponse = await fetch("/api/turso/initContent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!initResponse.ok) {
        const errorData = await initResponse.json();
        throw new Error(errorData.error || "Failed to initialize content");
      }

      const initData = await initResponse.json();
      if (!initData.success) {
        throw new Error(initData.error || "Failed to initialize content");
      }

      // Verify content was created
      const verifyResponse = await fetch("/api/turso/contentPrimed", {
        method: "POST",
      });

      if (!verifyResponse.ok) {
        throw new Error("Failed to verify content creation");
      }

      const verifyData = await verifyResponse.json();
      if (verifyData.isContentPrimed) {
        setIsInitializing(false);
        navigate(`/storykeep`);
      } else {
        throw new Error("Content verification failed");
      }
    } catch (err) {
      console.error("Content initialization error:", err);
      setError(err instanceof Error ? err.message : "Failed to initialize content");
      setIsInitializing(false);
    }
  };

  return (
    <div className="space-y-4">
      {!isInitializing ? (
        <button
          onClick={initializeDatabaseContent}
          className="px-4 py-2 text-white bg-myorange rounded hover:bg-myblue"
        >
          Initialize your first Track Stack
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

export default DatabaseContentBootstrap;
