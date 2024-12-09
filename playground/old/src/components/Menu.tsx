import { Fragment } from "react";
import { Popover, Transition } from "@headlessui/react";
import ChevronDownIcon from "@heroicons/react/20/solid/ChevronDownIcon";
import { preParseAction } from "../utils/concierge/preParseAction";
import { lispLexer } from "../utils/concierge/lispLexer";
import type { MenuDatum, MenuLink, MenuLinkDatum } from "../types";

const Menu = (props: { slug: string; isContext: boolean; payload: MenuDatum }) => {
  const { payload, slug, isContext } = props;
  const thisPayload = payload.optionsPayload;
  const additionalLinks = thisPayload
    .filter((e: MenuLink) => !e.featured)
    .map((e: MenuLink) => {
      const item = { ...e } as MenuLinkDatum;
      const thisPayload = lispLexer(e.actionLisp);
      const to = preParseAction(thisPayload, slug, isContext);
      if (typeof to === `string`) {
        item.to = to;
        item.internal = true;
      } else if (typeof to === `object`) item.to = to[0];
      return item;
    });
  const featuredLinks = thisPayload
    .filter((e: MenuLink) => e.featured)
    .map((e: MenuLink) => {
      const item = { ...e } as MenuLinkDatum;
      const thisPayload = lispLexer(e.actionLisp);
      const to = preParseAction(thisPayload, slug, isContext);
      if (typeof to === `string`) {
        item.to = to;
        item.internal = true;
      } else if (typeof to === `object`) item.to = to[0];
      return item;
    });

  return (
    <>
      <nav className="hidden md:flex flex-wrap items-center space-x-3 md:space-x-6 justify-end ml-6">
        {featuredLinks.map((item: MenuLinkDatum) => (
          <div key={item.name} className="relative py-1.5">
            <a
              href={item.to}
              className="font-bold block text-2xl leading-6 text-mydarkgrey hover:text-black hover:underline"
              title={item.description}
            >
              {item.name}
            </a>
          </div>
        ))}
      </nav>
      <div className="md:hidden">
        <Popover className="relative z-99">
          <Popover.Button className="inline-flex text-sm font-bold text-myblue hover:text-black">
            <span>Menu</span>
            <ChevronDownIcon className="h-5 w-5" aria-hidden="true" />
          </Popover.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <Popover.Panel className="absolute z-90000 mt-5 flex -right-4">
              <div className="w-screen">
                <div className="p-4 flex-auto overflow-hidden rounded-3xl bg-white text-md leading-6 shadow-lg ring-1 ring-mydarkgrey/5">
                  <div className="px-8">
                    {featuredLinks.map((item: MenuLinkDatum) => (
                      <div
                        key={item.name}
                        className="group relative flex gap-x-6 rounded-lg p-4 hover:bg-mygreen/20"
                      >
                        <div>
                          <a href={item.to} className="text-myblack hover:text-black">
                            {item.name}
                            <span className="absolute inset-0" />
                          </a>
                          <p className="mt-1 text-mydarkgrey">{item.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {additionalLinks.length ? (
                    <div className="bg-slate-50 p-8">
                      <div className="flex justify-between">
                        <h3 className="mt-4 text-sm leading-6 text-myblue">Additional Links</h3>
                      </div>
                      <ul role="list" className="mt-6 space-y-6">
                        {additionalLinks.map((item: MenuLinkDatum) => (
                          <li key={item.name} className="relative">
                            <a
                              href={item.to}
                              className="block truncate text-sm font-bold leading-6 text-mydarkgrey hover:text-black"
                              title={item.description}
                            >
                              {item.name}
                              <span className="absolute inset-0" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </div>
            </Popover.Panel>
          </Transition>
        </Popover>
      </div>
    </>
  );
};

export default Menu;
