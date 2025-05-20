import { useState, useEffect } from "react";
import { useStore } from "@nanostores/react";
import ExclamationTriangleIcon from "@heroicons/react/24/outline/ExclamationTriangleIcon";
import CheckCircleIcon from "@heroicons/react/24/outline/CheckCircleIcon";
import OrphanStoryFragmentsList from "./OrphanStoryFragmentsList";
import OrphanPanesList from "./OrphanPanesList";
import OrphanFilesList from "./OrphanFilesList";
import OrphanMenusList from "./OrphanMenusList";
import DeleteConfirmation from "./DeleteConfirmation";
import {
  orphanContentTypeStore,
  selectedForDeletionStore,
  deletionStatusStore,
  setOrphanContentType,
  resetDeletionStatus,
} from "@/store/storykeep";
import type { OrphanContentType } from "@/types";

export default function DeleteSelect() {
  const $orphanContentType = useStore(orphanContentTypeStore);
  const $selectedForDeletion = useStore(selectedForDeletionStore);
  const $deletionStatus = useStore(deletionStatusStore);

  const [showConfirmation, setShowConfirmation] = useState(false);

  // Reset deletion status when component mounts
  useEffect(() => {
    resetDeletionStatus();

    // Load initial content type data
    if ($orphanContentType) {
      setOrphanContentType($orphanContentType);
    }
  }, []);

  // Handle content type selection
  const handleTypeChange = (type: OrphanContentType) => {
    setOrphanContentType(type);
  };

  // Handle delete button click
  const handleDeleteClick = () => {
    setShowConfirmation(true);
  };

  // Handle cancellation of delete
  const handleCancelDelete = () => {
    setShowConfirmation(false);
  };

  // Count selected items
  const selectedCount = Object.values($selectedForDeletion).filter(Boolean).length;

  // Render the appropriate content component based on the selected type
  const renderContentList = () => {
    switch ($orphanContentType) {
      case "StoryFragment":
        return <OrphanStoryFragmentsList />;
      case "Pane":
        return <OrphanPanesList />;
      case "File":
        return <OrphanFilesList />;
      case "Menu":
        return <OrphanMenusList />;
      default:
        return null;
    }
  };

  return (
    <div className="mx-auto max-w-screen-xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Content Deletion Management</h2>
        <p className="text-mydarkgrey mb-6">
          This tool helps you manage and delete unused or orphaned content. Select a content type to
          view items that can be safely removed.
          <strong className="block mt-2 text-red-600">
            Note: Only orphaned content can be selected for deletion.
          </strong>
        </p>

        {$deletionStatus.success && (
          <div className="mb-4 p-4 bg-green-50 rounded-md">
            <p className="text-gray-800 font-bold flex items-center">
              <CheckCircleIcon className="inline-block h-5 w-5 mr-2 text-green-500" />
              Content was successfully deleted
            </p>
          </div>
        )}

        {$deletionStatus.error && (
          <div className="mb-4 p-4 bg-red-50 rounded-md">
            <p className="text-gray-800 font-bold flex items-center">
              <ExclamationTriangleIcon className="inline-block h-5 w-5 mr-2 text-red-500" />
              Error: {$deletionStatus.error}
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-3 mb-6">
          {(["StoryFragment", "Pane", "File", "Menu"] as OrphanContentType[]).map((type) => (
            <button
              key={type}
              onClick={() => handleTypeChange(type)}
              className={`px-4 py-2 rounded-md ${
                $orphanContentType === type
                  ? "bg-cyan-700 text-white"
                  : "bg-gray-100 text-black hover:bg-gray-200"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Render the content list component */}
      {renderContentList()}

      {selectedCount > 0 && (
        <div className="flex justify-end mb-8">
          <button
            onClick={handleDeleteClick}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Delete Selected ({selectedCount})
          </button>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showConfirmation && (
        <DeleteConfirmation onCancel={handleCancelDelete} contentType={$orphanContentType} />
      )}
    </div>
  );
}
