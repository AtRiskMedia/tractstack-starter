import { useState } from "react";
import { useStore } from "@nanostores/react";
import {
  selectedForDeletionStore,
  deletionStatusStore,
  clearSelectedForDeletion,
} from "@/store/storykeep";
import type { OrphanContentType } from "@/types";

interface DeleteConfirmationProps {
  onCancel: () => void;
  contentType: OrphanContentType;
}

export default function DeleteConfirmation({ onCancel, contentType }: DeleteConfirmationProps) {
  const $selectedForDeletion = useStore(selectedForDeletionStore);
  const [isDeleting, setIsDeleting] = useState(false);

  const selectedIds = Object.keys($selectedForDeletion).filter((id) => $selectedForDeletion[id]);
  const selectedCount = selectedIds.length;

  const handleConfirmDelete = async () => {
    if (isDeleting || selectedCount === 0) return;

    setIsDeleting(true);
    deletionStatusStore.setKey("isDeleting", true);

    try {
      const endpoint = getEndpointForContentType(contentType);
      if (!endpoint) throw new Error(`Unknown content type: ${contentType}`);

      const response = await fetch(`/api/turso/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: selectedIds }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to delete items");
      }

      // Success - update stores
      deletionStatusStore.set({
        isDeleting: false,
        success: true,
        error: null,
      });

      // Clear selected items
      clearSelectedForDeletion();

      // Close the modal
      onCancel();

      // Reload the list after a brief delay
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      deletionStatusStore.set({
        isDeleting: false,
        success: false,
        error: error instanceof Error ? error.message : "An unknown error occurred",
      });
      setIsDeleting(false);
    }
  };

  const getEndpointForContentType = (type: OrphanContentType): string | null => {
    switch (type) {
      case "StoryFragment":
        return "deleteOrphanStoryFragments";
      case "Pane":
        return "deleteOrphanPanes";
      case "File":
        return "deleteOrphanFiles";
      case "Menu":
        return "deleteOrphanMenus";
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-xl font-bold mb-4">Confirm Deletion</h3>

        <p className="mb-4">
          Are you sure you want to delete {selectedCount} orphaned {contentType}
          {selectedCount !== 1 ? "s" : ""}?
        </p>

        <div className="mb-4 p-4 bg-red-50 rounded">
          <p className="text-red-600 font-medium">Warning: This action cannot be undone.</p>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmDelete}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
