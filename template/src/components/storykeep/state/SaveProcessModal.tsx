import { useState, useEffect } from "react";
import { useStore } from "@nanostores/react";
import { classNames } from "../../../utils/common/helpers";
import { reconcileData, resetUnsavedChanges } from "../../../utils/data/reconcileData";
import { previewMode, getPreviewModeValue } from "../../../store/storykeep";
import { getTailwindWhitelist } from "../../../utils/data/tursoTailwindWhitelist";
import type {
  ReconciledData,
  StoryFragmentDatum,
  ContextPaneDatum,
  FileDatum,
  StoryFragmentQueries,
  ContextPaneQueries,
  PaneDatum,
  TursoQuery,
} from "../../../types";

type SaveStage =
  | "RECONCILING"
  | "PUBLISH_TAILWIND"
  | "UPDATING_STYLES"
  | "UPLOADING_IMAGES"
  | "PUBLISHING"
  | "COMPLETED"
  | "ERROR";

type SaveProcessModalProps = {
  id: string;
  isContext: boolean;
  originalData: StoryFragmentDatum | ContextPaneDatum | null;
  onClose: (slug: string) => void;
};

export const SaveProcessModal = ({
  id,
  isContext,
  originalData,
  onClose,
}: SaveProcessModalProps) => {
  const [stage, setStage] = useState<SaveStage>("RECONCILING");
  const [error, setError] = useState<string | null>(null);
  const [whitelist, setWhitelist] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [slug, setSlug] = useState("");
  const $previewMode = useStore(previewMode);
  const isPreview = getPreviewModeValue($previewMode);

  useEffect(() => {
    async function runFetch() {
      try {
        console.log(`SaveProcessModal must add turso proxy to uniqueTailwindClasses`);
        //const result = (await tursoClient.uniqueTailwindClasses(id)) as string[];
        setWhitelist([]);
        setError(null);
      } catch (err) {
        console.error("Error fetching datum payload:", err);
        setError(err instanceof Error ? err.message : "An unknown error occurred");
      } finally {
        setIsLoaded(true);
      }
    }
    runFetch();
  }, []);

  useEffect(() => {
    if (isLoaded) {
      const runSaveProcess = async () => {
        try {
          const data = await reconcileChanges();
          const slug = !isContext ? data?.storyFragment?.data?.slug : data?.contextPane?.data?.slug;
          setSlug(slug ?? ``);
          const hasFiles = !isContext
            ? data?.storyFragment?.data?.panesPayload
            : [data?.contextPane?.data?.panePayload];
          const files = hasFiles
            ?.map((p) => {
              if (p?.files.length) {
                return p.files
                  .map((f) => {
                    if (f.src.startsWith(`data:image`))
                      return {
                        filename: f.filename,
                        src: f.src,
                        paneId: f.paneId,
                        markdown: f.markdown,
                      };
                    return null;
                  })
                  .filter((n) => n);
              }
              return null;
            })
            .filter((n) => n)
            .flat() as FileDatum[];
          setStage("UPDATING_STYLES");
          await updateCustomStyles(data);
          if (files && files.length) {
            setStage("UPLOADING_IMAGES");
            await uploadFiles(files);
          }
          setStage("PUBLISHING");
          await publishChanges(data);
          setStage("PUBLISH_TAILWIND");
          await publishTailwind();
          setStage("COMPLETED");
          resetUnsavedChanges(id, isContext);
        } catch (err) {
          setStage("ERROR");
          setError(err instanceof Error ? err.message : "An unknown error occurred");
        }
      };

      runSaveProcess();
    }
  }, [isLoaded, id, isContext]);

  const reconcileChanges = async (): Promise<ReconciledData> => {
    try {
      const data = reconcileData(id, isContext, originalData);
      return data;
    } catch (err) {
      setStage("ERROR");
      setError(err instanceof Error ? err.message : "An error occurred during data reconciliation");
      throw err;
    }
  };

  const publishTailwind = async (): Promise<boolean> => {
    try {
      console.log(
        `this step probably isn't required now; was used previously to generate tailwind from whitelist -- we are doing this all in the one step now`
      );
      return true;
      //const response = await fetch(`/api/concierge/storykeep/publish`, {
      //  method: "POST",
      //  headers: {
      //    "Content-Type": "application/json",
      //  },
      //  body: JSON.stringify({
      //    target: `tailwind`,
      //  }),
      //});
      //const data = await response.json();
      //if (data.success) return true;
      //return false;
    } catch (err) {
      setStage("ERROR");
      setError(
        err instanceof Error ? err.message : "An error occurred while publishing tailwind whitelist"
      );
      throw err;
    }
  };

  const uploadFiles = async (files: FileDatum[]): Promise<boolean> => {
    if (isPreview) {
      return true;
    }
    try {
      console.log(`must publish files`, files);
      return true;
      //const response = await fetch(`/api/concierge/storykeep/files`, {
      //  method: "POST",
      //  headers: {
      //    "Content-Type": "application/json",
      //  },
      //  body: JSON.stringify({
      //    files,
      //  }),
      //});
      //const data = await response.json();
      //if (data.success) return true;
      //return false;
    } catch (err) {
      setStage("ERROR");
      setError(
        err instanceof Error ? err.message : "An error occurred while publishing optimized images"
      );
      throw err;
    }
  };

  const updateCustomStyles = async (payload: ReconciledData): Promise<boolean> => {
    try {
      const panes =
        !isContext && payload?.storyFragment?.data?.panesPayload
          ? payload.storyFragment.data.panesPayload
          : payload?.contextPane?.data?.panePayload
            ? [payload.contextPane.data.panePayload].map((p: PaneDatum) => {
                return {
                  options_payload: p.optionsPayload,
                };
              })
            : [];
      const newWhitelistItems = getTailwindWhitelist(panes);
      const newWhitelist = [...new Set([...newWhitelistItems, ...whitelist])];
      console.log(`must publish tailwind`, newWhitelist);
      return true;
      //const response = await fetch(`/api/concierge/storykeep/tailwind`, {
      //  method: "POST",
      //  headers: {
      //    "Content-Type": "application/json",
      //  },
      //  body: JSON.stringify({
      //    whitelist: newWhitelist,
      //  }),
      //});
      //const data = await response.json();
      //if (data.success) return true;
      //return false;
    } catch (err) {
      setStage("ERROR");
      setError(
        err instanceof Error ? err.message : "An error occurred while publishing tailwind whitelist"
      );
      throw err;
    }
  };

  const publishChanges = async (data: ReconciledData) => {
    const queries = isContext ? data.contextPane?.queries : data.storyFragment?.queries;
    if (!queries) {
      return;
    }

    try {
      // Define the order of execution
      const executionOrder: (keyof StoryFragmentQueries | keyof ContextPaneQueries)[] = [
        "storyfragment",
        "markdowns",
        "panes",
        "pane",
        "files",
        "storyfragment_pane",
        "file_pane",
        "file_markdown",
      ];

      // Collect all valid queries in order
      const queriesInOrder = executionOrder.reduce((acc: TursoQuery[], queryType) => {
        if (queryType in queries) {
          const typeQueries = queries[queryType as keyof typeof queries];
          const queryArray = Array.isArray(typeQueries) ? typeQueries : [typeQueries];
          acc.push(...queryArray.filter((q) => q && q.sql));
        }
        return acc;
      }, []);

      // Execute the queries using the new API endpoint
      const response = await fetch("/api/turso/executeQueries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(queriesInOrder),
      });

      if (!response.ok) {
        throw new Error(`Failed to execute queries: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to execute queries");
      }
    } catch (err) {
      setStage("ERROR");
      setError(err instanceof Error ? err.message : "An error occurred while publishing changes");
      throw err;
    }
  };

  const getStageDescription = (currentStage: SaveStage) => {
    switch (currentStage) {
      case "RECONCILING":
        return "Reconciling data changes...";
      case "UPDATING_STYLES":
        return "Updating custom styles...";
      case "UPLOADING_IMAGES":
        return "Uploading images...";
      case "PUBLISH_TAILWIND":
        return "Updating tailwind whitelist...";
      case "PUBLISHING":
        return "Publishing changes...";
      case "COMPLETED":
        return "Save completed successfully!";
      case "ERROR":
        return `Error: ${error}`;
      default:
        return "";
    }
  };

  return (
    <div className="fixed inset-0 z-[10101] bg-mydarkgrey bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">Saving Changes</h2>
        <div className="mb-4">
          <div className="h-2 bg-mylightgrey rounded-full">
            <div
              className={classNames(
                "h-full rounded-full",
                stage === "COMPLETED" ? "bg-green-500" : "bg-blue-500",
                stage === "ERROR" ? "bg-red-500" : "",
                stage === "RECONCILING"
                  ? "w-1/6"
                  : stage === "UPDATING_STYLES"
                    ? "w-2/6"
                    : stage === "UPLOADING_IMAGES"
                      ? "w-3/6"
                      : stage === "PUBLISH_TAILWIND"
                        ? "w-4/6"
                        : stage === "PUBLISHING"
                          ? "w-5/6"
                          : "w-full"
              )}
            ></div>
          </div>
        </div>
        <p className="text-lg mb-4">{getStageDescription(stage)}</p>
        {stage === "COMPLETED" && (
          <button
            onClick={() => onClose(slug)}
            className="bg-mygreen text-black px-4 py-2 rounded hover:bg-myorange"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
};
