import { useState, useEffect } from "react";
import { Combobox } from "@headlessui/react";
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

  if (!isClient) return null;

  return (
    <div className="space-y-4 mb-8">
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
                      className="text-myblue hover:text-myorange"
                      title="View"
                    >
                      View
                    </a>
                    /
                    <a
                      href={`/${currentHomePage.slug}/edit`}
                      className="text-myblue hover:text-myorange"
                      title="Edit"
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

        {isDemoMode ? null : !isChangingHome ? (
          <button
            onClick={() => setIsChangingHome(true)}
            className="mt-4 px-4 py-2 text-white bg-myblue rounded hover:bg-myblack"
          >
            Select Different Home Page
          </button>
        ) : (
          <div className="mt-4 space-y-4 max-w-xl">
            <div className="relative">
              <Combobox value={selectedStoryFragment} onChange={setSelectedStoryFragment}>
                <div className="relative">
                  <Combobox.Input
                    className="w-full rounded-md border-0 bg-white py-1.5 pl-3 pr-10 text-black shadow-sm ring-1 ring-inset ring-myblack/20 focus:ring-2 focus:ring-inset focus:ring-myorange text-sm"
                    onChange={(e) => setQuery(e.target.value)}
                    displayValue={(item: FullContentMap | null) => item?.title || ""}
                    placeholder="Select a page to set as home..."
                  />
                  <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronDownIcon className="h-5 w-5 text-myblack/60" aria-hidden="true" />
                  </Combobox.Button>

                  <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                    {storyFragments.length === 0 && query !== "" ? (
                      <div className="relative cursor-default select-none py-2 px-4 text-mydarkgrey">
                        No pages found.
                      </div>
                    ) : (
                      storyFragments.map((page) => (
                        <Combobox.Option
                          key={page.id}
                          value={page}
                          className={({ active }) =>
                            classNames(
                              "relative cursor-default select-none py-2 px-4",
                              active ? "bg-myorange/10 text-black" : "text-mydarkgrey"
                            )
                          }
                        >
                          {({ selected }) => (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <span className={selected ? "font-bold" : "font-normal"}>
                                  {page.title}
                                </span>
                                <span className="text-xs ml-2 text-mydarkgrey">/{page.slug}</span>
                              </div>
                              {selected && (
                                <CheckIcon className="h-5 w-5 text-myblue" aria-hidden="true" />
                              )}
                            </div>
                          )}
                        </Combobox.Option>
                      ))
                    )}
                  </Combobox.Options>
                </div>
              </Combobox>
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
        )}
      </div>
    </div>
  );
}
