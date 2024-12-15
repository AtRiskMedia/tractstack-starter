import { useState, useCallback } from "react";
import { Combobox } from "@headlessui/react";
import { PlusIcon, XMarkIcon, ChevronUpDownIcon } from "@heroicons/react/24/outline";
import socialIcons from "../../../../../../config/socialIcons.json";

const socialIconKeys = socialIcons.iconKeys;

interface SocialLinksProps {
  value: string;
  onChange: (value: string) => void;
}

type SocialPlatform = keyof typeof socialIcons.icons;

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
        // Cast platform to SocialPlatform since we're confident it comes from our icons
        return { platform: platform as SocialPlatform, url };
      });
  });

  const [isSelectingPlatform, setIsSelectingPlatform] = useState(false);
  const [pendingLink, setPendingLink] = useState<{ platform: SocialPlatform; url: string } | null>(
    null
  );

  // Create a type-safe version of usedPlatforms
  const usedPlatforms = new Set(links.map((link) => link.platform));
  const availablePlatforms = socialIconKeys.filter(
    (platform): platform is SocialPlatform => !usedPlatforms.has(platform as SocialPlatform)
  );

  const handlePlatformSelect = useCallback((platform: SocialPlatform) => {
    setPendingLink({ platform, url: "" });
    setIsSelectingPlatform(false);
  }, []);

  const handlePendingUrlChange = useCallback(
    (url: string) => {
      if (!pendingLink || !url) return;
      const newLinks = [...links, { platform: pendingLink.platform, url }] as SocialLink[];
      setLinks(newLinks);
      onChange(newLinks.map((link) => `${link.platform}|${link.url}`).join(","));
      setPendingLink(null);
    },
    [links, onChange, pendingLink]
  );

  const updateLink = useCallback(
    (index: number, url: string) => {
      const newLinks = links.map((link, i) => (i === index ? { ...link, url } : link));
      setLinks(newLinks);
      onChange(newLinks.map((link) => `${link.platform}|${link.url}`).join(","));
    },
    [links, onChange]
  );

  const removeLink = useCallback(
    (index: number) => {
      const newLinks = links.filter((_, i) => i !== index);
      setLinks(newLinks);
      onChange(newLinks.map((link) => `${link.platform}|${link.url}`).join(","));
    },
    [links, onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
    }
  };

  const baseInputClass =
    "block rounded-md border-0 px-2.5 py-1.5 text-myblack ring-1 ring-inset ring-myorange/20 placeholder:text-mydarkgrey focus:ring-2 focus:ring-inset focus:ring-myorange text-sm w-full";

  return (
    <div className="space-y-4 max-w-lg">
      {links.map((link, index) => (
        <div key={index} className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-12 h-12 bg-myorange/10 rounded-md"
            dangerouslySetInnerHTML={{
              __html: socialIcons.icons[link.platform as SocialPlatform].replace(
                "fill-transparent",
                "fill-black"
              ),
            }}
          />

          <input
            type="url"
            value={link.url}
            onChange={(e) => updateLink(index, e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="https://"
            className={`${baseInputClass} flex-1`}
          />

          <button
            type="button"
            onClick={() => removeLink(index)}
            className="text-myorange hover:text-black p-2"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      ))}

      {pendingLink && (
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-12 h-12 bg-myorange/10 rounded-md"
            dangerouslySetInnerHTML={{
              __html: socialIcons.icons[pendingLink.platform as SocialPlatform].replace(
                "fill-transparent",
                "fill-black"
              ),
            }}
          />

          <input
            type="url"
            value={pendingLink.url}
            onChange={(e) => setPendingLink({ ...pendingLink, url: e.target.value })}
            onBlur={(e) => handlePendingUrlChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="https://"
            className={`${baseInputClass} flex-1`}
            autoFocus
          />

          <button
            type="button"
            onClick={() => setPendingLink(null)}
            className="text-myorange hover:text-black p-2"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      )}

      {isSelectingPlatform ? (
        <Combobox onChange={handlePlatformSelect} value={null}>
          <div className="relative">
            <Combobox.Input
              className={baseInputClass}
              placeholder="Select social platform..."
              displayValue={(platform: string) => platform}
              onChange={() => {}}
              onKeyDown={handleKeyDown}
            />
            <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon className="h-5 w-5 text-mydarkgrey" />
            </Combobox.Button>
            <Combobox.Options className="absolute z-10 mt-1 w-full rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5">
              {availablePlatforms.map((platform) => (
                <Combobox.Option
                  key={platform}
                  value={platform}
                  className={({ active }) => `
                    relative cursor-pointer select-none py-2 px-4
                    ${active ? "bg-myorange/10" : ""}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div
                      dangerouslySetInnerHTML={{
                        __html: socialIcons.icons[platform as SocialPlatform].replace(
                          "fill-transparent",
                          "fill-black"
                        ),
                      }}
                    />
                    <span className="text-mydarkgrey">{platform}</span>
                  </div>
                </Combobox.Option>
              ))}
            </Combobox.Options>
          </div>
        </Combobox>
      ) : (
        !pendingLink && (
          <button
            type="button"
            onClick={() => setIsSelectingPlatform(true)}
            disabled={availablePlatforms.length === 0}
            className="flex items-center gap-2 text-myblue hover:text-myorange disabled:text-mydarkgrey"
          >
            <PlusIcon className="h-5 w-5" />
            Add Social Link
          </button>
        )
      )}
    </div>
  );
}
