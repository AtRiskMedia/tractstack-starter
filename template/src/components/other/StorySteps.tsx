import { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import MapIcon from "@heroicons/react/24/outline/MapIcon";
import { sync, auth } from "../../store/auth";

export const StorySteps = () => {
  const [hidden, setHidden] = useState(true);
  const $sync = useStore(sync);
  const $auth = useStore(auth);

  useEffect(() => {
    if ($sync && $auth.neo4jEnabled) setHidden(false);
    else setHidden(true);
  }, [$sync]);

  if (hidden) return null;

  return (
    <a
      href="/concierge/graph"
      className="text-myblue/80 hover:text-myblue hover:rotate-6"
      title="Your Content Journey"
    >
      <MapIcon className="h-6 w-6" />
    </a>
  );
};
