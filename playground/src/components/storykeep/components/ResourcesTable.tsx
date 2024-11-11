import { useState } from "react";
import BeakerIcon from "@heroicons/react/24/outline/BeakerIcon";
import type { ResourceDatum } from "../../../types";

interface ResourcesTableProps {
  resources: ResourceDatum[];
}

export default function ResourcesTable({ resources }: ResourcesTableProps) {
  const [query, setQuery] = useState("");

  const filteredResources = resources.filter((resource) =>
    resource.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search resources..."
          className="w-full p-2 border rounded"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
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
            {filteredResources.map((resource) => (
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
                    href={`/storykeep/manage/resource/${resource.slug}`}
                    className="text-myblue hover:text-myorange"
                    title="Edit"
                  >
                    <BeakerIcon className="h-5 w-5" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
