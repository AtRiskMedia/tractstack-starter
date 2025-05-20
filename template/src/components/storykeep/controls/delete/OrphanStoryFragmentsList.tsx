import { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import { Switch } from "@ark-ui/react";
import {
  orphanItemsStore,
  selectedForDeletionStore,
  toggleItemForDeletion,
  clearSelectedForDeletion,
} from "@/store/storykeep";

export default function OrphanStoryFragmentsList() {
  const $orphanItems = useStore(orphanItemsStore);
  const $selectedForDeletion = useStore(selectedForDeletionStore);

  const [showAll, setShowAll] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    // Fetch story fragments when the component mounts
    fetchStoryFragments();

    // Check if we're on mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Initial check
    checkMobile();

    // Add resize listener
    window.addEventListener("resize", checkMobile);

    // Cleanup
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const fetchStoryFragments = async () => {
    try {
      orphanItemsStore.setKey("isLoading", true);

      const response = await fetch("/api/turso/getOrphanStoryFragments");
      if (!response.ok) {
        throw new Error("Failed to fetch story fragments");
      }

      const result = await response.json();
      if (result.success) {
        orphanItemsStore.set({
          items: result.data || [],
          isLoading: false,
          error: null,
        });
      } else {
        throw new Error(result.error || "Failed to fetch story fragments");
      }
    } catch (error) {
      orphanItemsStore.set({
        items: [],
        isLoading: false,
        error: error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  };

  const handleSelectAll = () => {
    const orphans = $orphanItems.items.filter((item) => item.usageCount === 0);

    // Check if all orphans are already selected
    const allSelected = orphans.every((item) => $selectedForDeletion[item.id]);

    if (allSelected) {
      // If all are selected, clear the selection
      clearSelectedForDeletion();
    } else {
      // Otherwise, select all orphans
      const newSelection = { ...$selectedForDeletion };
      orphans.forEach((item) => {
        newSelection[item.id] = true;
      });
      selectedForDeletionStore.set(newSelection);
    }
  };

  const handleToggleShowAll = () => {
    setShowAll(!showAll);
    setCurrentPage(1); // Reset to first page when toggling
  };

  // Filter items based on search query and showAll state
  const filteredItems = $orphanItems.items
    .filter(
      (item) =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.slug && item.slug.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .filter((item) => showAll || item.usageCount === 0);

  // Pagination
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if ($orphanItems.isLoading) {
    return <div className="text-center py-8">Loading story fragments...</div>;
  }

  if ($orphanItems.error) {
    return <div className="text-center py-8 text-red-600">Error: {$orphanItems.error}</div>;
  }

  if ($orphanItems.items.length === 0) {
    return <div className="text-center py-8">No story fragments found.</div>;
  }

  const orphanCount = $orphanItems.items.filter((item) => item.usageCount === 0).length;

  return (
    <div className="mb-8">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4">
        <h3 className="text-xl font-semibold">Story Fragments</h3>
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex items-center">
            <label className="mr-2 text-sm">Show All</label>
            <Switch.Root checked={showAll} onCheckedChange={() => handleToggleShowAll()}>
              <Switch.Control
                className={`${
                  showAll ? "bg-cyan-700" : "bg-gray-300"
                } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-700 focus:ring-offset-2`}
              >
                <Switch.Thumb
                  className={`${
                    showAll ? "translate-x-6" : "translate-x-1"
                  } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                />
              </Switch.Control>
              <Switch.HiddenInput />
            </Switch.Root>
          </div>

          <input
            type="text"
            placeholder="Search fragments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-auto px-3 py-1 border border-gray-300 rounded"
          />

          {orphanCount > 0 && (
            <button
              onClick={handleSelectAll}
              className="w-full md:w-auto px-3 py-1 bg-cyan-700 text-white rounded hover:bg-cyan-800"
            >
              Select All Orphans
            </button>
          )}
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="text-center py-4 bg-gray-50 rounded">
          No {showAll ? "" : "orphaned "}story fragments found.
        </div>
      ) : (
        <>
          {/* Desktop view - Table */}
          {!isMobile && (
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {showAll ? "Orphaned" : "Select"}
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Title
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Slug
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Usage Count
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Used In
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.usageCount === 0 ? (
                          <input
                            type="checkbox"
                            checked={!!$selectedForDeletion[item.id]}
                            onChange={() => toggleItemForDeletion(item.id)}
                            className="h-4 w-4 text-cyan-700 focus:ring-cyan-700 border-gray-300 rounded"
                          />
                        ) : (
                          <span className="text-xs text-gray-500">No</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{item.title || "Unnamed"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.slug || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.usageCount}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {item.usedIn && item.usedIn.length > 0
                          ? item.usedIn.join(", ")
                          : "Not used"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Mobile view - Cards */}
          {isMobile && (
            <div className="md:hidden grid grid-cols-1 gap-4">
              {paginatedItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-lg shadow-md p-4 border border-gray-200"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">{item.title || "Unnamed"}</h4>
                      <div className="text-sm text-gray-500 mb-2">/{item.slug || ""}</div>
                    </div>
                    {item.usageCount === 0 ? (
                      <input
                        type="checkbox"
                        checked={!!$selectedForDeletion[item.id]}
                        onChange={() => toggleItemForDeletion(item.id)}
                        className="h-5 w-5 text-cyan-700 focus:ring-cyan-700 border-gray-300 rounded"
                      />
                    ) : (
                      <span className="bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded-full">
                        In Use
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 text-sm mt-3">
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-medium">Usage Count:</span>
                      <span className="text-gray-900">{item.usageCount}</span>
                    </div>

                    <div>
                      <span className="text-gray-500 font-medium block">Used In:</span>
                      <span className="text-gray-900 block mt-1">
                        {item.usedIn && item.usedIn.length > 0
                          ? item.usedIn.join(", ")
                          : "Not used"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination controls - same for both views */}
          {totalPages > 1 && (
            <div className="flex flex-col md:flex-row justify-between items-center mt-4 gap-4">
              <div>
                <span className="text-sm text-gray-700">
                  Showing{" "}
                  <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
                  <span className="font-medium">
                    {Math.min(currentPage * itemsPerPage, filteredItems.length)}
                  </span>{" "}
                  of <span className="font-medium">{filteredItems.length}</span> results
                </span>
              </div>
              <div className="flex space-x-1">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded ${
                    currentPage === 1
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 rounded ${
                    currentPage === totalPages
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
