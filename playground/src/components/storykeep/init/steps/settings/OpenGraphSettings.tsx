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
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-mydarkgrey">Open Graph Settings</h3>
      <p className="text-sm text-mydarkgrey">
        Configure default social sharing metadata for your site
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-mydarkgrey mb-1">Default Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => onChange("title", e.target.value)}
            placeholder="Default title for social sharing"
            className={commonInputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-mydarkgrey mb-1">Default Author</label>
          <input
            type="text"
            value={author}
            onChange={(e) => onChange("author", e.target.value)}
            placeholder="Default author for social sharing"
            className={commonInputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-mydarkgrey mb-1">
            Default Description
          </label>
          <textarea
            value={description}
            onChange={(e) => onChange("description", e.target.value)}
            placeholder="Default description for social sharing"
            className={`${commonInputClass} min-h-[100px]`}
          />
        </div>
      </div>
    </div>
  );
}
