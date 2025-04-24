import { useState, useEffect } from "react";
import PublishModal from "./PublishModal";
import ArrowDownTrayIcon from "@heroicons/react/24/outline/ArrowDownTrayIcon";
import ExclamationTriangleIcon from "@heroicons/react/24/outline/ExclamationTriangleIcon";
import CheckIcon from "@heroicons/react/24/outline/CheckIcon";

interface VersionCheckProps {
  remoteVersionInfo: {
    storykeep: number;
    concierge: number;
  };
  hasConcierge: boolean;
}

export default function VersionCheck({ remoteVersionInfo, hasConcierge }: VersionCheckProps) {
  const [localVersion, setLocalVersion] = useState<{ storykeep: number; concierge: number } | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [needsUpdate, setNeedsUpdate] = useState(false);

  const [storykeepNeedsUpdate, setStorykeepNeedsUpdate] = useState(false);
  const [conciergeNeedsUpdate, setConciergeNeedsUpdate] = useState(false);

  useEffect(() => {
    if (!hasConcierge) {
      setIsLoading(false);
      return;
    }

    const checkVersion = async () => {
      try {
        const response = await fetch("/api/concierge/status");
        if (response.ok) {
          const result = await response.json();
          const localData = JSON.parse(result.data);
          setLocalVersion(localData);

          const storykeepOutdated = remoteVersionInfo.storykeep > localData.storykeep;
          const conciergeOutdated = remoteVersionInfo.concierge > localData.concierge;

          setStorykeepNeedsUpdate(storykeepOutdated);
          setConciergeNeedsUpdate(conciergeOutdated);
          setNeedsUpdate(storykeepOutdated || conciergeOutdated);
        }
      } catch (error) {
        console.error("Error fetching local version:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkVersion();
  }, [hasConcierge, remoteVersionInfo]);

  if (isLoading || !localVersion || !needsUpdate || !hasConcierge) return null;

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="p-0.5 shadow-md mb-4">
      <div className="px-4 py-3 bg-white rounded-md w-full">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-gray-800">Updates Available</h3>
          <button
            onClick={() => setShowUpdateModal(true)}
            className="px-3 py-1 bg-cyan-700 hover:bg-cyan-800 text-white text-sm rounded transition-colors duration-200 flex items-center"
          >
            <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
            <span>Update Now</span>
          </button>
        </div>

        <div className="space-y-2">
          {/* StoryKeep status */}
          {storykeepNeedsUpdate && (
            <div className="flex items-center p-2 border border-gray-100 rounded hover:border-cyan-100 transition-colors">
              <ExclamationTriangleIcon className="h-4 w-4 text-cyan-700 mr-2 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-bold text-gray-800">StoryKeep Update</div>
                <div className="flex flex-wrap justify-between gap-x-4 text-xs">
                  <div className="text-gray-600">
                    Current:{" "}
                    <span className="font-bold">{formatDateTime(localVersion.storykeep)}</span>
                  </div>
                  <div className="text-cyan-700 font-bold">
                    Available: {formatDateTime(remoteVersionInfo.storykeep)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Concierge status */}
          {conciergeNeedsUpdate && (
            <div className="flex items-center p-2 border border-gray-100 rounded hover:border-cyan-100 transition-colors">
              <ExclamationTriangleIcon className="h-4 w-4 text-cyan-700 mr-2 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-bold text-gray-800">Concierge Update</div>
                <div className="flex flex-wrap justify-between gap-x-4 text-xs">
                  <div className="text-gray-600">
                    Current:{" "}
                    <span className="font-bold">{formatDateTime(localVersion.concierge)}</span>
                  </div>
                  <div className="text-cyan-700 font-bold">
                    Available: {formatDateTime(remoteVersionInfo.concierge)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Up-to-date components */}
          {(!storykeepNeedsUpdate || !conciergeNeedsUpdate) && (
            <div className="flex flex-wrap gap-x-6 gap-y-1 p-2 border border-gray-100 rounded">
              {!storykeepNeedsUpdate && (
                <div className="flex items-center">
                  <CheckIcon className="h-4 w-4 text-cyan-700 mr-1" />
                  <span className="text-xs">
                    <span className="font-bold text-gray-800">StoryKeep</span>
                    <span className="text-gray-600"> • Up to date</span>
                  </span>
                </div>
              )}

              {!conciergeNeedsUpdate && (
                <div className="flex items-center">
                  <CheckIcon className="h-4 w-4 text-cyan-700 mr-1" />
                  <span className="text-xs">
                    <span className="font-bold text-gray-800">Concierge</span>
                    <span className="text-gray-600"> • Up to date</span>
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showUpdateModal && (
        <PublishModal
          onClose={() => setShowUpdateModal(false)}
          onPublishComplete={() => window.location.reload()}
        />
      )}
    </div>
  );
}
