import { useState } from "react";
import BeakerIcon from "@heroicons/react/24/outline/BeakerIcon";
import type { TractStackDatum } from "../../../types";

interface TractStackTableProps {
  tractstacks: TractStackDatum[];
}

export default function TractStackTable({ tractstacks }: TractStackTableProps) {
  const [query, setQuery] = useState("");

  const filteredTractStacks = tractstacks.filter((tractstack) =>
    tractstack.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search tract stacks..."
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
                Social Image
              </th>
              <th className="px-6 py-3 text-left text-xs text-mydarkgrey uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-mywhite divide-y divide-mylightgrey/10">
            {filteredTractStacks.map((tractstack) => (
              <tr key={tractstack.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-myblack">
                  {tractstack.title}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-mydarkgrey">
                  {tractstack.slug}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-mydarkgrey">
                  {tractstack.socialImagePath || "N/A"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                  <a
                    href={`/storykeep/manage/tractstack/${tractstack.slug}`}
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
