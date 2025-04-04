import { useState } from "react";
import CreateNewButton from "./CreateNewButton";
import BeakerIcon from "@heroicons/react/24/outline/BeakerIcon";
import type { MenuNode } from "@/types.ts";

interface MenusTableProps {
  menus: MenuNode[];
}

export default function MenusTable({ menus }: MenusTableProps) {
  const [query, setQuery] = useState("");

  const filteredMenus = menus.filter((menu) =>
    menu.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-screen-xl">
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search menus..."
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
                Theme
              </th>
              <th className="px-6 py-3 text-left text-xs text-mydarkgrey uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-mywhite divide-y divide-mylightgrey/10">
            {!filteredMenus.length ? (
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-myblack">None found.</td>
              </tr>
            ) : (
              filteredMenus.map((menu) => (
                <tr key={menu.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-myblack">{menu.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-mydarkgrey">
                    {menu.theme}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                    <a
                      href={`/storykeep/content/menus/${menu.id}`}
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
      <CreateNewButton type="Menu" href="/storykeep/content/menus/create" />
    </div>
  );
}
