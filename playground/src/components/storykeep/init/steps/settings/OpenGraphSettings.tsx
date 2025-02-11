interface OpenGraphSettingsProps {
  title: string;
  author: string;
  description: string;
  onChange: (field: "title" | "author" | "description", value: string) => void;
}

export default function OpenGraphSettings({
  title,
  author,
  description,
  onChange,
}: OpenGraphSettingsProps) {
  const commonInputClass =
    "block w-full rounded-md border-0 px-2.5 py-1.5 text-myblack ring-1 ring-inset ring-myorange/20 placeholder:text-mydarkgrey focus:ring-2 focus:ring-inset focus:ring-myorange text-sm";

  return (
    <div className="space-y-6" role="region" aria-labelledby="og-settings-title">
      <div className="space-y-2">
        <h3 id="og-settings-title" className="text-lg font-bold text-mydarkgrey">
          Open Graph Settings
        </h3>
        <p id="og-settings-desc" className="text-sm text-mydarkgrey">
          Configure default social sharing metadata for your site
        </p>
      </div>

      <div className="space-y-4" role="group" aria-describedby="og-settings-desc">
        <div>
          <label htmlFor="og-title" className="block text-sm font-bold text-mydarkgrey mb-1">
            Default Title
          </label>
          <input
            id="og-title"
            type="text"
            value={title}
            onChange={(e) => onChange("title", e.target.value)}
            placeholder="Default title for social sharing"
            className={commonInputClass}
            aria-describedby="og-title-hint"
          />
          <p id="og-title-hint" className="mt-1 text-xs text-mydarkgrey">
            This title will be used when your content is shared on social media
          </p>
        </div>

        <div>
          <label htmlFor="og-author" className="block text-sm font-bold text-mydarkgrey mb-1">
            Default Author
          </label>
          <input
            id="og-author"
            type="text"
            value={author}
            onChange={(e) => onChange("author", e.target.value)}
            placeholder="Default author for social sharing"
            className={commonInputClass}
            aria-describedby="og-author-hint"
          />
          <p id="og-author-hint" className="mt-1 text-xs text-mydarkgrey">
            The author name that will appear in social media shares
          </p>
        </div>

        <div>
          <label htmlFor="og-description" className="block text-sm font-bold text-mydarkgrey mb-1">
            Default Description
          </label>
          <textarea
            id="og-description"
            value={description}
            onChange={(e) => onChange("description", e.target.value)}
            placeholder="Default description for social sharing"
            className={`${commonInputClass} min-h-[100px]`}
            aria-describedby="og-description-hint"
          />
          <p id="og-description-hint" className="mt-1 text-xs text-mydarkgrey">
            A brief description that will appear when your content is shared on social platforms
          </p>
        </div>
      </div>
    </div>
  );
}
