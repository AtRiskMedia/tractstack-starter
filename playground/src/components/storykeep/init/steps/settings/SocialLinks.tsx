import { useState, useCallback, useMemo, type KeyboardEvent } from "react";
import { Combobox } from "@ark-ui/react";
import { Portal } from "@ark-ui/react/portal";
import { createListCollection } from "@ark-ui/react/collection";
import PlusIcon from "@heroicons/react/24/outline/PlusIcon";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import ChevronUpDownIcon from "@heroicons/react/24/outline/ChevronUpDownIcon";
import CheckIcon from "@heroicons/react/24/outline/CheckIcon";
import { socialIconKeys } from "@/utils/common/socialIcons";

interface SocialLinksProps {
  value: string;
  onChange: (value: string) => void;
}

type SocialPlatform = keyof typeof socialIconKeys;
interface SocialLink {
  platform: SocialPlatform;
  url: string;
}

export default function SocialLinks({ value, onChange }: SocialLinksProps) {
  const [links, setLinks] = useState<SocialLink[]>(() => {
    if (!value) return [];
    return value
      .split(",")
      .filter(Boolean)
      .map((link) => {
        const [platform, url] = link.split("|");
        return { platform: platform as SocialPlatform, url };
      });
  });

  const [isSelectingPlatform, setIsSelectingPlatform] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [pendingLink, setPendingLink] = useState<{ platform: SocialPlatform; url: string } | null>(
    null
  );

  const availablePlatforms = socialIconKeys as string[];

  // Create collection for Ark UI Combobox
  const collection = useMemo(() => {
    const filteredPlatforms =
      query === ""
        ? availablePlatforms
        : availablePlatforms.filter((platform) =>
            platform.toLowerCase().includes(query.toLowerCase())
          );

    return createListCollection({
      items: filteredPlatforms,
      itemToValue: (item) => item,
      itemToString: (item) => item,
    });
  }, [availablePlatforms, query]);

  const handlePlatformSelect = useCallback((details: { value: string[] }) => {
    const platform = details.value[0];
    if (platform) {
      setPendingLink({ platform: platform as SocialPlatform, url: "" });
      setIsSelectingPlatform(false);
      setSelectedPlatform(null);
      setQuery("");
    }
  }, []);

  const handlePendingUrlChange = useCallback(
    (url: string) => {
      if (!pendingLink || !url) return;
      const newLinks = [...links, { platform: pendingLink.platform, url }] as SocialLink[];
      setLinks(newLinks);
      onChange(newLinks.map((link) => `${String(link.platform)}|${link.url}`).join(","));
      setPendingLink(null);
      setSelectedPlatform(null);
      setQuery("");
    },
    [links, onChange, pendingLink]
  );

  const updateLink = useCallback(
    (index: number, url: string) => {
      const newLinks = links.map((link, i) => (i === index ? { ...link, url } : link));
      setLinks(newLinks);
      onChange(newLinks.map((link) => `${String(link.platform)}|${link.url}`).join(","));
    },
    [links, onChange]
  );

  const removeLink = useCallback(
    (index: number) => {
      const newLinks = links.filter((_, i) => i !== index);
      setLinks(newLinks);
      onChange(newLinks.map((link) => `${String(link.platform)}|${link.url}`).join(","));
    },
    [links, onChange]
  );

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const target = e.target as HTMLInputElement;
      if (pendingLink) {
        handlePendingUrlChange(target.value);
      }
    }
  };

  const handleComboboxKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setIsSelectingPlatform(false);
      setSelectedPlatform(null);
      setQuery("");
    }
  };

  const handleUrlKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
    }
  };

  const cancelSelection = () => {
    setIsSelectingPlatform(false);
    setSelectedPlatform(null);
    setQuery("");
  };

  const baseInputClass =
    "block rounded-md border-0 px-2.5 py-1.5 text-myblack ring-1 ring-inset ring-cyan-600/20 placeholder:text-mydarkgrey focus:ring-2 focus:ring-inset focus:ring-cyan-600 text-sm w-full";

  // CSS to properly style the combobox items with hover and selection
  const comboboxItemStyles = `
    .platform-item[data-highlighted] {
      background-color: #0891b2; /* bg-cyan-600 */
      color: white;
    }
    .platform-item[data-highlighted] .platform-indicator {
      color: white;
    }
    .platform-item[data-state="checked"] .platform-indicator {
      display: flex;
    }
    .platform-item .platform-indicator {
      display: none;
    }
    .platform-item[data-state="checked"] {
      font-weight: bold;
    }
  `;

  return (
    <div className="space-y-4 max-w-lg" role="region" aria-label="Social media links">
      <style>{comboboxItemStyles}</style>

      {links.map((link, index) => (
        <div
          key={index}
          className="flex items-center gap-3"
          role="group"
          aria-label={`${String(link.platform)} social link`}
        >
          <div
            className="flex items-center justify-center w-12 h-12 bg-cyan-600/10 rounded-md"
            aria-hidden="true"
          >
            <img
              src={`/socials/${String(link.platform)}.svg`}
              alt=""
              width="24"
              height="24"
              className="h-6 w-6 scale-125"
            />
          </div>
          <label className="sr-only" htmlFor={`social-url-${index}`}>
            {String(link.platform)} URL
          </label>
          <input
            id={`social-url-${index}`}
            type="url"
            value={link.url}
            autoComplete="off"
            onChange={(e) => updateLink(index, e.target.value)}
            onKeyDown={handleUrlKeyDown}
            placeholder="https://"
            className={`${baseInputClass} flex-1`}
            aria-label={`${String(link.platform)} profile URL`}
          />

          <button
            type="button"
            onClick={() => removeLink(index)}
            className="text-cyan-600 hover:text-black p-2"
            aria-label={`Remove ${String(link.platform)} link`}
          >
            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      ))}

      {pendingLink && (
        <div
          className="flex items-center gap-3"
          role="group"
          aria-label={`New ${String(pendingLink.platform)} link`}
        >
          <div
            className="flex items-center justify-center w-12 h-12 bg-cyan-600/10 rounded-md"
            aria-hidden="true"
          >
            <img
              src={`/socials/${String(pendingLink.platform)}.svg`}
              alt=""
              width="24"
              height="24"
              className="h-6 w-6 scale-125"
            />
          </div>
          <label className="sr-only" htmlFor="pending-social-url">
            {String(pendingLink.platform)} URL
          </label>
          <input
            id="pending-social-url"
            type="url"
            value={pendingLink.url}
            autoComplete="off"
            onChange={(e) => setPendingLink({ ...pendingLink, url: e.target.value })}
            onBlur={(e) => handlePendingUrlChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="https://"
            className={`${baseInputClass} flex-1`}
            aria-label={`Enter ${String(pendingLink.platform)} profile URL`}
            autoFocus
          />

          <button
            type="button"
            onClick={() => {
              setPendingLink(null);
              setSelectedPlatform(null);
              setQuery("");
            }}
            className="text-cyan-600 hover:text-black p-2"
            aria-label="Cancel adding new social link"
          >
            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      )}

      {isSelectingPlatform ? (
        <div className="relative" aria-label="Select social media platform">
          <Combobox.Root
            collection={collection}
            value={selectedPlatform ? [selectedPlatform] : []}
            onValueChange={handlePlatformSelect}
            onInputValueChange={(details) => setQuery(details.inputValue)}
            loopFocus={true}
            openOnKeyPress={true}
            composite={true}
          >
            <Combobox.Control>
              <Combobox.Input
                className={baseInputClass}
                autoComplete="off"
                placeholder="Select social platform..."
                onKeyDown={handleComboboxKeyDown}
                aria-label="Search social platforms"
              />
              <Combobox.Trigger className="absolute top-2 right-0 flex items-center pr-2">
                <ChevronUpDownIcon className="h-5 w-5 text-mydarkgrey" aria-hidden="true" />
              </Combobox.Trigger>
            </Combobox.Control>

            <Portal>
              <Combobox.Positioner>
                <Combobox.Content
                  className="mt-1 w-full rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5"
                  aria-label="Available social platforms"
                >
                  {collection.items.length === 0 ? (
                    <div className="relative cursor-default select-none py-2 px-4 text-mydarkgrey">
                      Nothing found.
                    </div>
                  ) : (
                    collection.items.map((platform) => (
                      <Combobox.Item
                        key={platform}
                        item={platform}
                        className="platform-item relative cursor-pointer select-none py-2 px-4"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={`/socials/${platform}.svg`}
                            alt=""
                            width="24"
                            height="24"
                            className="h-6 w-6"
                            aria-hidden="true"
                          />
                          <span className="text-mydarkgrey">{platform}</span>
                          <span className="platform-indicator absolute inset-y-0 right-0 flex items-center pr-3 text-cyan-600">
                            <CheckIcon className="h-5 w-5" aria-hidden="true" />
                          </span>
                        </div>
                      </Combobox.Item>
                    ))
                  )}
                </Combobox.Content>
              </Combobox.Positioner>
            </Portal>
          </Combobox.Root>

          <div className="mt-2">
            <button
              type="button"
              onClick={cancelSelection}
              className="text-mydarkgrey hover:text-cyan-600 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        !pendingLink && (
          <button
            type="button"
            onClick={() => setIsSelectingPlatform(true)}
            disabled={availablePlatforms.length === 0}
            className="flex items-center gap-2 text-myblue hover:text-cyan-600 disabled:text-mydarkgrey"
            aria-label="Add new social media link"
          >
            <PlusIcon className="h-5 w-5" aria-hidden="true" />
            <span>Add Social Link</span>
          </button>
        )
      )}
    </div>
  );
}
