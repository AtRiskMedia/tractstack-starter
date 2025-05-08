import { useState, useEffect, useMemo } from "react";
import { Combobox } from "@ark-ui/react";
import { createListCollection } from "@ark-ui/react/collection";
import ChevronDownIcon from "@heroicons/react/24/outline/ChevronDownIcon";
import CheckIcon from "@heroicons/react/24/outline/CheckIcon";
import { classNames } from "@/utils/common/helpers.ts";
import { isDemoModeStore } from "@/store/storykeep.ts";
import type { FullContentMap, Config } from "@/types.ts";

interface SelectHomeProps {
  contentMap: FullContentMap[];
  config: Config;
}

export default function SelectHome({ contentMap = [], config }: SelectHomeProps) {
  const isDemoMode = isDemoModeStore.get();
  const [isClient, setIsClient] = useState(false);
  const [isChangingHome, setIsChangingHome] = useState(false);
  const [selectedStoryFragment, setSelectedStoryFragment] = useState<FullContentMap | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [query, setQuery] = useState("");
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track current home page in component state
  const [currentHomeSlug, setCurrentHomeSlug] = useState(config?.init?.HOME_SLUG || "");

  useEffect(() => {
    setIsClient(true);
    setCurrentHomeSlug(config?.init?.HOME_SLUG || "");
  }, [config]);

  // Find the current home page from contentMap using component state
  const currentHomePage = contentMap.find(
    (item) => item.type === "StoryFragment" && item.slug === currentHomeSlug
  );

  // Filter only StoryFragments for selection
  const storyFragments = contentMap.filter(
    (item) =>
      item.type === "StoryFragment" &&
      (!query || item.title.toLowerCase().includes(query.toLowerCase()))
  );

  // Create collection for Ark UI Combobox
  const collection = useMemo(
    () =>
      createListCollection({
        items: storyFragments,
        itemToValue: (item) => item.id,
        itemToString: (item) => item.title,
      }),
    [storyFragments]
  );

  const handleSelectHome = async () => {
    if (!selectedStoryFragment) return;

    setIsUpdating(true);
    setError(null);
    setUpdateSuccess(false);

    try {
      const response = await fetch("/api/fs/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          file: "init",
          updates: {
            HOME_SLUG: selectedStoryFragment.slug,
            TRACTSTACK_HOME_SLUG: selectedStoryFragment.slug.toUpperCase(),
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update home page");
      }

      // Update the current home slug in component state to reflect change immediately
      setCurrentHomeSlug(selectedStoryFragment.slug);
      setUpdateSuccess(true);
      setIsChangingHome(false);
      setSelectedStoryFragment(null);
      setQuery("");

      // Reset success message after 3 seconds
      setTimeout(() => {
        setUpdateSuccess(false);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleValueChange = (details: { value: string[] }) => {
    const itemId = details.value[0];
    if (itemId) {
      const foundItem = storyFragments.find((item) => item.id === itemId) || null;
      setSelectedStoryFragment(foundItem);
    } else {
      setSelectedStoryFragment(null);
    }
  };

  // CSS to properly style the combobox items with hover and selection
  const comboboxItemStyles = `
    .home-item[data-highlighted] {
      background-color: #0891b2; /* bg-cyan-600 */
      color: white;
    }
    .home-item[data-highlighted] .home-indicator {
      color: white;
    }
    .home-item[data-state="checked"] .home-indicator {
      display: flex;
    }
    .home-item .home-indicator {
      display: none;
    }
    .home-item[data-state="checked"] {
      font-weight: bold;
    }
  `;

  if (!isClient) return null;

  return (
    <div id="select-home" className="space-y-4 mb-8">
      <style>{comboboxItemStyles}</style>
      <h3 className="text-xl font-bold font-action px-3.5">Home Page</h3>

      <div className="bg-myblue/5 rounded-lg p-4">
        {updateSuccess && (
          <div className="mb-4 bg-mygreen/20 text-black p-3 rounded-md border border-mygreen">
            Home page updated successfully!
          </div>
        )}

        {error && <div className="mb-4 bg-myred/10 text-myred p-3 rounded-md">{error}</div>}

        <div className="flex flex-col md:flex-row gap-4">
          {currentHomePage ? (
            <div className="bg-white rounded-lg shadow p-3 flex items-center space-x-4 flex-1">
              <div
                className="relative w-1/4"
                style={{
                  paddingTop:
                    "13.125%" /* 1/4 width * (630/1200) = 0.13125 or 13.125% to maintain aspect ratio */,
                }}
              >
                <img
                  src={
                    `thumbSrc` in currentHomePage && currentHomePage.thumbSrc
                      ? currentHomePage.thumbSrc
                      : "/static.jpg"
                  }
                  srcSet={
                    `thumbSrcSet` in currentHomePage && currentHomePage.thumbSrcSet
                      ? currentHomePage.thumbSrcSet
                      : undefined
                  }
                  alt={currentHomePage.title}
                  className="absolute inset-0 w-full h-full object-cover rounded-md"
                />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-myblack">Current Home Page</h4>
                <p className="text-lg text-mydarkgrey">{currentHomePage.title}</p>
                <div className="flex justify-between items-center mt-2">
                  <span className="inline-flex w-fit items-center rounded-full bg-myblue px-2 py-1 text-xs font-bold text-slate-100">
                    Home
                  </span>
                  <span className="flex space-x-1 text-sm">
                    <a
                      href={`/${currentHomePage.slug}`}
                      className="pl-2 text-myblue hover:text-cyan-600 text-lg underline"
                      title="Visit this Page"
                    >
                      Visit
                    </a>
                    <a
                      href={`/${currentHomePage.slug}/edit`}
                      className="pl-2 text-myblue hover:text-cyan-600 text-lg underline"
                      title="Edit this Page"
                    >
                      Edit
                    </a>
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-4 flex-1">
              <p className="text-mydarkgrey italic">No home page is set</p>
            </div>
          )}
        </div>

        {isDemoMode ? null : isChangingHome ? (
          <div className="mt-4 space-y-4 max-w-xl">
            <div className="relative">
              <Combobox.Root
                collection={collection}
                value={selectedStoryFragment ? [selectedStoryFragment.id] : []}
                onValueChange={handleValueChange}
                loopFocus={true}
                openOnKeyPress={true}
                composite={true}
              >
                <div className="relative">
                  <Combobox.Input
                    className="w-full rounded-md border-0 bg-white py-1.5 pl-3 pr-10 text-black shadow-sm ring-1 ring-inset ring-myblack/20 focus:ring-2 focus:ring-inset focus:ring-cyan-600 text-sm"
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Select a page to set as home..."
                    autoComplete="off"
                  />
                  <Combobox.Trigger className="absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronDownIcon className="h-5 w-5 text-myblack/60" aria-hidden="true" />
                  </Combobox.Trigger>

                  <Combobox.Content className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                    {collection.items.length === 0 ? (
                      <div className="relative cursor-default select-none py-2 px-4 text-mydarkgrey">
                        No pages found.
                      </div>
                    ) : (
                      collection.items.map((page) => (
                        <Combobox.Item
                          key={page.id}
                          item={page}
                          className="home-item relative cursor-default select-none py-2 px-4"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <span className="block truncate">{page.title}</span>
                              <span className="text-xs ml-2 text-mydarkgrey">/{page.slug}</span>
                            </div>
                            <span className="home-indicator absolute inset-y-0 right-0 flex items-center pr-3 text-cyan-600">
                              <CheckIcon className="h-5 w-5" aria-hidden="true" />
                            </span>
                          </div>
                        </Combobox.Item>
                      ))
                    )}
                  </Combobox.Content>
                </div>
              </Combobox.Root>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleSelectHome}
                className={classNames(
                  "px-4 py-2 text-white rounded",
                  selectedStoryFragment
                    ? "bg-myblue hover:bg-myblack"
                    : "bg-mylightgrey cursor-not-allowed"
                )}
                disabled={!selectedStoryFragment || isUpdating}
              >
                {isUpdating ? "Updating..." : "Set as Home Page"}
              </button>

              <button
                onClick={() => {
                  setIsChangingHome(false);
                  setSelectedStoryFragment(null);
                  setQuery("");
                }}
                className="px-4 py-2 text-myblack bg-mylightgrey rounded hover:bg-myblack hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsChangingHome(true)}
            className="mt-4 px-4 py-2 text-white bg-myblue rounded hover:bg-myblack"
          >
            Select Different Home Page
          </button>
        )}
      </div>
    </div>
  );
}
