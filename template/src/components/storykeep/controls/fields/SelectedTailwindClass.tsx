import { tailwindClasses } from "../../../../utils/tailwind/tailwindClasses";

interface Props {
  name: string;
  values: {
    mobile: string;
    tablet?: string;
    desktop?: string;
  };
}

const SelectedTailwindClass = ({ name, values }: Props) => {
  const entries = Object.entries(values).filter(([, value]) => value);

  const title =
    entries.length === 1 && entries[0][0] === "mobile"
      ? entries[0][1]
      : entries.map(([viewport, value]) => `${viewport[0]}:${value}`).join(", ");

  return (
    <div className="text-sm p-2 border border-gray-200 rounded w-fit">
      <div title={title} className="font-bold">
        {tailwindClasses[name]?.title || name}
      </div>
    </div>
  );
};

export default SelectedTailwindClass;
