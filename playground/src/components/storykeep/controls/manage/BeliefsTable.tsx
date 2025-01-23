import { useState } from "react";
import CreateNewButton from "./CreateNewButton";
import BeakerIcon from "@heroicons/react/24/outline/BeakerIcon";
import CheckIcon from "@heroicons/react/24/outline/CheckIcon";
import type { BeliefNode } from "@/types.ts";

interface BeliefsTableProps {
  beliefs: BeliefNode[];
}

export default function BeliefsTable({ beliefs }: BeliefsTableProps) {
  const [query, setQuery] = useState("");

  const filteredBeliefs = beliefs.filter((belief) =>
    belief.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-screen-xl">
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search beliefs..."
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
                Scale
              </th>
              <th className="px-6 py-3 text-left text-xs text-mydarkgrey uppercase tracking-wider">
                Custom Values
              </th>
              <th className="px-6 py-3 text-left text-xs text-mydarkgrey uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-mywhite divide-y divide-mylightgrey/10">
            {!filteredBeliefs.length ? (
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-myblack">None found.</td>
              </tr>
            ) : (
              filteredBeliefs.map((belief) => (
                <tr key={belief.slug}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-myblack">
                    {belief.title}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-mydarkgrey">
                    {belief.slug}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-mydarkgrey">
                    {belief.scale}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-mydarkgrey">
                    {belief.customValues && belief.customValues.length > 0 ? (
                      <div
                        title={belief.customValues.join(", ")}
                        className="inline-flex items-center text-green-600"
                      >
                        <CheckIcon className="h-5 w-5" />
                      </div>
                    ) : (
                      "N/A"
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                    <a
                      href={`/storykeep/content/beliefs/${belief.id}`}
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
      <CreateNewButton type="Magic Path Belief" href="/storykeep/content/beliefs/create" />
    </div>
  );
}
