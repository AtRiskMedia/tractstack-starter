import { useState, useEffect, useMemo } from "react";
import CreateNewButton from "./CreateNewButton";
import ManageKnownResources from "./ManageKnownResources";
import BeakerIcon from "@heroicons/react/24/outline/BeakerIcon";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import ChevronLeftIcon from "@heroicons/react/24/outline/ChevronLeftIcon";
import ChevronRightIcon from "@heroicons/react/24/outline/ChevronRightIcon";
import { getKnownResources } from "@/utils/storykeep/resourceHelpers.ts";
import { Pagination } from "@ark-ui/react/pagination";
import type { ResourceNode } from "@/types.ts";

interface ResourcesTableProps {
  resources: ResourceNode[];
}

export default function ResourcesTable({ resources }: ResourcesTableProps) {
  const [query, setQuery] = useState("");
  const [knownCategories, setKnownCategories] = useState<string[]>([]);
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Load known resource categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      const knownResources = await getKnownResources();
      const categories = Object.keys(knownResources);
      setKnownCategories(categories);
      setActiveCategories(new Set(categories)); // All categories active by default
    };
    loadCategories();
  }, []);

  const toggleCategory = (category: string) => {
    setActiveCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  // Memoize filtered resources to optimize performance
  const filteredResources = useMemo(() => {
    return resources.filter((resource) => {
      if (!resource.title.toLowerCase().includes(query.toLowerCase())) {
        return false;
      }
      if (resource.category && knownCategories.includes(resource.category)) {
        return activeCategories.has(resource.category);
      }
      return true;
    });
  }, [resources, query, activeCategories, knownCategories]);

  // Pagination calculations
  const totalCount = filteredResources.length;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedResources = filteredResources.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [query, activeCategories, pageSize]);

  // Adjust currentPage if it exceeds the maximum page
  useEffect(() => {
    const maxPage = Math.ceil(totalCount / pageSize) || 1;
    if (currentPage > maxPage) {
      setCurrentPage(maxPage);
    }
  }, [totalCount, pageSize, currentPage]);

  return (
    <div className="mx-auto max-w-7xl">
      {" "}
      {/* Increased max-width for more flexibility */}
      {/* Category Pills */}
      {knownCategories.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {knownCategories.map((category) => {
            const isActive = activeCategories.has(category);
            return (
              <button
                key={category}
                onClick={() => toggleCategory(category)}
                className={`
                  inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium
                  transition-colors duration-200
                  ${
                    isActive
                      ? "bg-cyan-100 text-cyan-800 hover:bg-cyan-200"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }
                `}
                aria-label={`${isActive ? "Hide" : "Show"} ${category} resources`}
              >
                <span>{category}</span>
                {isActive && <XMarkIcon className="h-3 w-3" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
      {/* Search Input */}
      <div className="mb-4 flex items-center gap-4">
        <input
          type="text"
          placeholder="Search resources..."
          className="w-full p-2 border border-mylightgrey rounded-md focus:outline-none focus:ring-2 focus:ring-myblue"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
          className="p-2 border border-mylightgrey rounded-md focus:outline-none focus:ring-2 focus:ring-myblue"
        >
          <option value={25}>25 items</option>
          <option value={50}>50 items</option>
          <option value={100}>100 items</option>
        </select>
      </div>
      {/* Resources Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-mylightgrey/20">
          <thead className="bg-mylightgrey/20">
            <tr>
              <th className="px-6 py-3 text-left text-xs text-mydarkgrey uppercase tracking-wider">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs text-mydarkgrey uppercase tracking-wider">
                Slug
              </th>
              <th className="px-6 py-3 text-left text-xs text-mydarkgrey uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs text-mydarkgrey uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-mywhite divide-y divide-mylightgrey/10">
            {paginatedResources.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                  No resources found.
                </td>
              </tr>
            ) : (
              paginatedResources.map((resource) => (
                <tr key={resource.slug}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-myblack">
                    {resource.title}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-mydarkgrey">
                    {resource.slug}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-mydarkgrey">
                    {resource.category || "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                    <a
                      href={`/storykeep/content/resources/${resource.slug}`}
                      className="text-myblue hover:text-myorange"
                      title="Edit"
                    >
                      <BeakerIcon className="h-5 w-5" />
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {/* Pagination Controls */}
      {totalCount > pageSize && (
        <div className="flex items-center w-full justify-center gap-2 mt-4 flex-nowrap">
          <Pagination.Root
            count={totalCount}
            pageSize={pageSize}
            siblingCount={2}
            page={currentPage}
            onPageChange={(details) => setCurrentPage(details.page)}
          >
            <Pagination.PrevTrigger className="p-2 bg-myblue text-white rounded hover:bg-myorange disabled:opacity-50">
              <ChevronLeftIcon className="h-3 w-3" />
            </Pagination.PrevTrigger>
            <Pagination.Context>
              {(pagination) =>
                pagination.pages.map((page, index) =>
                  page.type === "page" ? (
                    <Pagination.Item
                      key={index}
                      {...page}
                      className={`px-3 py-1 rounded ${
                        pagination.page === page.value
                          ? "bg-myblue text-white"
                          : "bg-white border border-mylightgrey text-mydarkgrey hover:bg-gray-100"
                      }`}
                    >
                      {page.value}
                    </Pagination.Item>
                  ) : (
                    <Pagination.Ellipsis
                      key={index}
                      index={index}
                      className="px-3 py-1 text-mydarkgrey"
                    >
                      …
                    </Pagination.Ellipsis>
                  )
                )
              }
            </Pagination.Context>
            <Pagination.NextTrigger className="p-2 bg-myblue text-white rounded hover:bg-myorange disabled:opacity-50">
              <ChevronRightIcon className="h-3 w-3" />
            </Pagination.NextTrigger>
          </Pagination.Root>
        </div>
      )}
      <CreateNewButton type="Resource" href="/storykeep/content/resources/create" />
      <ManageKnownResources knownCategories={knownCategories} />
    </div>
  );
}
