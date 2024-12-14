import { Fragment, useEffect, useState } from "react";
import { Network } from "vis-network";
import { Dialog, Transition } from "@headlessui/react";
import BeakerIcon from "@heroicons/react/24/outline/BeakerIcon";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import type { GraphNodeDatum, GraphRelationshipDatum, ContentMap } from "../../types";

export interface FastTravelMenu {
  title: string;
  slugs: string[][];
  type: string;
}

const VisNetwork = ({
  nodes,
  edges,
  contentMap,
}: {
  nodes: GraphNodeDatum[];
  edges: GraphRelationshipDatum[];
  contentMap: ContentMap[];
}) => {
  const [gotoMenu, setGotoMenu] = useState<FastTravelMenu | undefined>(undefined);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const goto = ({ title, type }: { title: string; type: string }) => {
      if ([`You`, `Visit`].includes(type)) return null;

      switch (type) {
        case `TractStack`: {
          const gotoSlugs = contentMap
            .filter((m: ContentMap) => m.parentTitle === title)
            .map((f: ContentMap) => {
              return [f.slug !== import.meta.env.PUBLIC_HOME ? `/${f.slug}` : `/`, f.slug, f.title];
            });
          setGotoMenu({ title: title, slugs: gotoSlugs, type });
          setOpen(true);
          break;
        }

        case `StoryFragment`: {
          const lookup = contentMap.filter((m: ContentMap) => m.title === title).at(0)!;
          window.location.href =
            lookup.slug !== import.meta.env.PUBLIC_HOME ? `/${lookup.slug}` : `/`;
          break;
        }

        case `Pane`: {
          const thisPane = contentMap.filter((m: ContentMap) => m.title === title).at(0)!;
          const thisStoryFragment = contentMap.filter(
            (m: ContentMap) => m?.panes && m.panes.includes(thisPane.id)
          );
          if (!thisStoryFragment.length) {
            // context pane
            window.location.href = `/context/${thisPane?.slug}`;
          } else {
            const gotoSlugs = thisStoryFragment.map((f: ContentMap) => {
              return [
                f.slug !== import.meta.env.PUBLIC_HOME
                  ? `/${f.slug}#${thisPane.slug}`
                  : `/#${thisPane.slug}`,
                f.slug,
                f.title,
              ];
            });
            setGotoMenu({ title: title, slugs: gotoSlugs, type });
            setOpen(true);
          }
          break;
        }
      }
    };
    const container = document.getElementById(`mynetwork`);
    const options = {
      nodes: {
        shape: `dot`,
        scaling: {
          label: {
            min: 8,
            max: 20,
          },
        },
      },
    };
    if (container) {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const payload: any = { nodes, edges };
      const network = new Network(container, payload, options);
      network.on(`doubleClick`, function (params) {
        const nid = params?.nodes?.length > 0 ? params.nodes[0] : null;
        if (nid) {
          const thisNode = nodes.filter((e: GraphNodeDatum) => nid === e.id);
          if (thisNode.length) goto({ title: thisNode[0].label, type: thisNode[0].title });
        }
      });
    }
  }, [nodes, edges]);

  return (
    <>
      {open ? (
        <Transition.Root show={open} as={Fragment}>
          <Dialog as="div" className="relative z-10" onClose={setOpen}>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-myblue bg-opacity-75 transition-opacity" />
            </Transition.Child>

            <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
              <div className="flex min-h-full items-end justify-center p-4 text-center md:items-center md:p-0">
                <Transition.Child
                  as={Fragment}
                  enter="ease-out duration-300"
                  enterFrom="opacity-0 translate-y-4 md:translate-y-0 md:scale-95"
                  enterTo="opacity-100 translate-y-0 md:scale-100"
                  leave="ease-in duration-200"
                  leaveFrom="opacity-100 translate-y-0 md:scale-100"
                  leaveTo="opacity-0 translate-y-4 md:translate-y-0 md:scale-95"
                >
                  <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all my-8 w-full md:max-w-lg p-12">
                    <div className="absolute right-0 top-0 hidden pr-4 pt-4 md:block">
                      <button
                        type="button"
                        className="rounded-md bg-white text-mydarkgrey hover:text-eyblue focus:outline-none focus:ring-2 focus:ring-myorange focus:ring-offset-2"
                        onClick={() => setOpen(false)}
                      >
                        <span className="sr-only">Close</span>
                        <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                      </button>
                    </div>
                    <div className="md:flex md:items-start">
                      <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-myorange/10 md:mx-0 md:h-10 md:w-10">
                        <BeakerIcon className="h-6 w-6 text-myorange" aria-hidden="true" />
                      </div>
                      <div className="mt-3 text-center md:ml-4 md:mt-0 md:text-left">
                        <Dialog.Title
                          as="h3"
                          className="text-xl font-action font-bold leading-6 text-myblack"
                        >
                          Fast Travel
                        </Dialog.Title>
                        <div className="mt-2">
                          <p className="text-sm text-mydarkgrey pb-8">
                            {gotoMenu?.type === `TractStack`
                              ? `This Tract Stack has the following Story Fragments:`
                              : gotoMenu?.type === `Pane`
                                ? `This Pane is on the following pages:`
                                : null}
                          </p>
                          <ul className="py-3 space-y-6 text-lg">
                            {gotoMenu?.slugs?.map((e: string[]) => (
                              <li key={e[1]}>
                                <a
                                  className="text-myblue hover:text-black hover:underline"
                                  href={e[0]}
                                >
                                  {e[2]}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition.Root>
      ) : null}
      <div id="mynetwork" className="w-full h-full"></div>
    </>
  );
};

export default VisNetwork;
