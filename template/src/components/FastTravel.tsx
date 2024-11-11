import { useState, useEffect } from "react";
import { useStore } from "@nanostores/react";
import { sync } from "../store/auth";
import { processGraphPayload } from "../utils/helpers";
import { fetchWithAuth } from "../api/fetchClient";
import VisNetwork from "./other/VisNetwork";
import { classNames } from "../utils/helpers";
import type { ContentMap, GraphRelationshipDatum, GraphNodeDatum } from "../types";

async function goGetGraph() {
  try {
    const response = await fetchWithAuth("/auth/graph");
    const data =
      typeof response?.data !== `undefined` && typeof response?.data?.at(0) !== `undefined`
        ? processGraphPayload(response?.data)
        : null;
    return { graph: data, error: null };
    /* eslint-disable @typescript-eslint/no-explicit-any */
  } catch (e: any) {
    console.log(`error`, e);
    window.location.reload();
    return {
      error: e?.response?.data?.message || e?.message,
      graph: null,
    };
  }
}

const FastTravel = ({ contentMap }: { contentMap: ContentMap[] }) => {
  const [graphEdges, setGraphEdges] = useState<GraphRelationshipDatum[]>([]);
  const [graphNodes, setGraphNodes] = useState<GraphNodeDatum[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [show, setShow] = useState(false);
  const $sync = useStore(sync);

  useEffect(() => {
    if (import.meta.env.PROD && $sync && !loading && !loaded) {
      setLoading(true);
      goGetGraph()
        .then((res: any) => {
          if (res?.graph) {
            setGraphNodes(res?.graph?.nodes);
            setGraphEdges(res?.graph?.edges);
            if (res?.graph?.nodes?.length > 2) setShow(true);
          }
          setLoaded(true);
        })
        .catch((e) => console.log(`An error occurred.`, e))
        .finally(() => setLoading(false));
    }
  }, [$sync, loaded, loading]);

  return (
    <section className={classNames(!show ? `h-fit-contents` : `h-screen`, "xl:max-w-screen-2xl")}>
      <div className="h-full shadow-sm bg-myoffwhite/20">
        {!loaded ? (
          <div className="flex items-center justify-center h-full">
            <div className="max-w-xs leading-6 text-lg text-mydarkgrey font-action">
              <p className="p-16">
                <strong>Loading</strong>
              </p>
            </div>
          </div>
        ) : !show ? (
          <div className="flex items-center justify-center h-full">
            <div className="max-w-xs leading-6 text-lg">
              <p className="p-16">
                <span className="font-action text-myblue">
                  Your content journey has just begun.
                </span>
                <span className="px-3 font-main text-mydarkgrey">
                  Please come back after exploring the site more.
                </span>
              </p>
            </div>
          </div>
        ) : (
          <VisNetwork nodes={graphNodes} edges={graphEdges} contentMap={contentMap} />
        )}
      </div>
    </section>
  );
};

export default FastTravel;
