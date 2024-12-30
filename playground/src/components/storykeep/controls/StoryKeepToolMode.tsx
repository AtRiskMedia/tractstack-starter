import CursorArrowRaysIcon from "@heroicons/react/24/outline/CursorArrowRaysIcon";
import PlusIcon from "@heroicons/react/24/outline/PlusIcon";
import Square3Stack3DIcon from "@heroicons/react/24/outline/Square3Stack3DIcon";
import Cog8ToothIcon from "@heroicons/react/24/outline/Cog8ToothIcon";
import TrashIcon from "@heroicons/react/24/outline/TrashIcon";
import PuzzlePieceIcon from "@heroicons/react/24/outline/PuzzlePieceIcon";
import BoltIcon from "@heroicons/react/24/outline/BoltIcon";

const StoryKeepToolMode = () => {
  return (
    <>
      <CursorArrowRaysIcon
        title="Edit Text / Styles"
        className="w-8 h-8 rounded-xl bg-white text-myblue hover:bg-myblue/50 hover:text-white"
      />
      <PlusIcon
        title="Add Element"
        className="w-8 h-8 rounded-xl bg-white text-myblue hover:bg-myblue/50 hover:text-white"
      />
      <TrashIcon
        title="Delete Element"
        className="w-8 h-8 rounded-xl bg-white text-myblue hover:bg-myblue/50 hover:text-white"
      />
      <Square3Stack3DIcon
        title="Insert Pane / Section"
        className="w-8 h-8 rounded-xl bg-white text-myblue hover:bg-myblue/50 hover:text-white"
      />
      <Cog8ToothIcon
        title="Advanced Controls"
        className="w-8 h-8 rounded-xl bg-white text-myblue hover:bg-myblue/50 hover:text-white"
      />
      <PuzzlePieceIcon
        title="Auto redesign"
        className="w-8 h-8 rounded-xl bg-white text-myblue hover:bg-myblue/50 hover:text-white"
      />
      <BoltIcon
        title="Toggle plain text"
        className="w-8 h-8 rounded-xl bg-white text-myblue hover:bg-myblue/50 hover:text-white"
      />
    </>
  );
};

export default StoryKeepToolMode;
