import { useState } from "react";
import BeakerIcon from "@heroicons/react/24/outline/BeakerIcon";
import type { FileDatum } from "../../../types";

interface ImagesTableProps {
  images: FileDatum[];
}

export default function ImagesTable({ images }: ImagesTableProps) {
  const [query, setQuery] = useState("");

  const filteredImages = images.filter(
    (image) =>
      image.filename.toLowerCase().includes(query.toLowerCase()) ||
      image.altDescription.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search images..."
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
                Preview
              </th>
              <th className="px-6 py-3 text-left text-xs text-mydarkgrey uppercase tracking-wider">
                Filename
              </th>
              <th className="px-6 py-3 text-left text-xs text-mydarkgrey uppercase tracking-wider">
                Alt Description
              </th>
              <th className="px-6 py-3 text-left text-xs text-mydarkgrey uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-mywhite divide-y divide-mylightgrey/10">
            {filteredImages.map((image) => (
              <tr key={image.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <img
                    src={image.src}
                    alt={image.altDescription}
                    className="h-16 w-16 object-contain"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-myblack">
                  {image.filename}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-mydarkgrey">
                  {image.altDescription}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                  <a
                    href={`/storykeep/manage/image/${image.id}`}
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
