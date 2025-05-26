import { useState, useEffect } from "react";
import CreateNewButton from "./CreateNewButton";
import ManageKnownResources from "./ManageKnownResources";
import BeakerIcon from "@heroicons/react/24/outline/BeakerIcon";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import { getKnownResources } from "@/utils/storykeep/resourceHelpers.ts";
import type { ResourceNode } from "@/types.ts";

interface ResourcesTableProps {
  resources: ResourceNode[];
}

export default function ResourcesTable({ resources }: ResourcesTableProps) {
  const [query, setQuery] = useState("");
  const [knownCategories, setKnownCategories] = useState<string[]>([]);
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set());

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

  const filteredResources = resources.filter((resource) => {
    // First filter by search query
    if (!resource.title.toLowerCase().includes(query.toLowerCase())) {
      return false;
    }

    // Then filter by active categories
    // If resource has a category and it's a known category, check if it's active
    if (resource.category && knownCategories.includes(resource.category)) {
      return activeCategories.has(resource.category);
    }

    // Resources without categories or with unknown categories are always shown
    return true;
  });

  return (
    <div className="mx-auto max-w-screen-xl">
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
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search resources..."
          className="w-full p-2 border rounded"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
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
            {!filteredResources.length ? (
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-myblack" colSpan={4}>
                  {resources.length === 0
                    ? "No resources found."
                    : "No resources match your filters."}
                </td>
              </tr>
            ) : (
              filteredResources.map((resource) => (
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
      <CreateNewButton type="Resource" href="/storykeep/content/resources/create" />
      <ManageKnownResources knownCategories={knownCategories} />
    </div>
  );
}
