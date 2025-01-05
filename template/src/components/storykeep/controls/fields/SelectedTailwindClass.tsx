import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import { tailwindClasses } from "../../../../utils/tailwind/tailwindClasses";

interface Props {
  name: string;
  values: {
    mobile: string;
    tablet?: string;
    desktop?: string;
  };
  onRemove: (name: string) => void;
  onUpdate: (name: string) => void;
}

const SelectedTailwindClass = ({ name, values, onRemove, onUpdate }: Props) => {
  const entries = Object.entries(values).filter(([, value]) => value);

  const title =
    entries.length === 1 && entries[0][0] === "mobile"
      ? entries[0][1]
      : entries.map(([viewport, value]) => `${viewport[0]}:${value}`).join(", ");

  return (
    <div className="text-sm p-2 border border-slate-200 rounded w-fit">
      <div title={title} className="font-bold flex items-center gap-2">
        <button onClick={() => onUpdate(name)}>{tailwindClasses[name]?.title || name}</button>
        <button
          onClick={() => onRemove(name)}
          className="p-0.5 hover:bg-slate-100 rounded-full transition-colors"
          aria-label={`Remove ${name} class`}
          title={`Remove ${tailwindClasses[name]?.title || name} class`}
        >
          <XMarkIcon className="w-4 h-4 text-slate-500 hover:text-slate-700" />
        </button>
      </div>
    </div>
  );
};

export default SelectedTailwindClass;
