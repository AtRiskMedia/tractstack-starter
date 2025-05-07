import { Menu } from "@ark-ui/react";
import { Portal } from "@ark-ui/react/portal";
import ChevronDownIcon from "@heroicons/react/20/solid/ChevronDownIcon";
import { preParseAction } from "@/utils/concierge/preParse_Action";
import { lispLexer } from "@/utils/concierge/lispLexer";
import type { Config, MenuDatum, MenuLink, MenuLinkDatum } from "@/types";

// CSS to style the menu items with hover and selection states
const menuStyles = `
  .menu-content {
    transition-property: opacity, transform;
    transition-duration: 200ms;
    z-index: 10050;
  }

  .menu-content[data-state="open"] {
    opacity: 1;
    transform: translateY(0);
  }

  .menu-content[data-state="closed"] {
    opacity: 0;
    transform: translateY(1px);
  }

  .menu-item[data-highlighted] {
    background-color: #f3f4f6;
  }

  .menu-item:focus {
    outline: 2px solid #0891b2;
    outline-offset: -2px;
  }
`;

const MenuComponent = (props: {
  slug: string;
  isContext: boolean;
  payload: MenuDatum;
  config: Config;
}) => {
  const { payload, slug, isContext, config } = props;
  const thisPayload = payload.optionsPayload;

  // Process featured and additional links
  const featuredLinks = thisPayload.filter((e: MenuLink) => e.featured).map(processMenuLink);

  const additionalLinks = thisPayload.filter((e: MenuLink) => !e.featured).map(processMenuLink);

  // Helper function to process menu links
  function processMenuLink(e: MenuLink): MenuLinkDatum {
    const item = { ...e } as MenuLinkDatum;
    const thisPayload = lispLexer(e.actionLisp);
    const to = preParseAction(thisPayload, slug, isContext, config);
    if (typeof to === `string`) {
      item.to = to;
      item.internal = true;
    } else if (typeof to === `object`) {
      item.to = to[0];
    }
    return item;
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: menuStyles }} />

      {/* Desktop Navigation */}
      <nav className="hidden md:flex flex-wrap items-center space-x-3 md:space-x-6 justify-end ml-6">
        {featuredLinks.map((item: MenuLinkDatum) => (
          <div key={item.name} className="relative py-1.5">
            <a
              href={item.to}
              className="font-bold block text-2xl leading-6 text-mydarkgrey hover:text-black hover:underline focus:outline-none focus:ring-2 focus:ring-myblue focus:text-black"
              title={item.description}
              aria-label={`${item.name} - ${item.description}`}
            >
              {item.name}
            </a>
          </div>
        ))}
      </nav>

      {/* Mobile Navigation Menu */}
      <div className="md:hidden">
        <Menu.Root>
          <Menu.Trigger
            className="inline-flex text-sm font-bold text-myblue hover:text-black focus:outline-none focus:ring-2 focus:ring-myblue rounded-md px-3 py-2"
            aria-label="Open navigation menu"
          >
            <span>Menu</span>
            <ChevronDownIcon className="h-5 w-5 ml-1" aria-hidden="true" />
          </Menu.Trigger>

          <Portal>
            <Menu.Positioner>
              <Menu.Content className="menu-content mt-5 flex">
                <div className="w-screen">
                  <div className="p-4 flex-auto overflow-hidden rounded-3xl bg-white text-md leading-6 shadow-lg ring-1 ring-mydarkgrey/5">
                    {/* Featured Links Section */}
                    <div className="px-8">
                      {featuredLinks.map((item: MenuLinkDatum) => (
                        <Menu.Item
                          key={item.name}
                          value={item.name}
                          className="menu-item group relative flex gap-x-6 rounded-lg p-4 hover:bg-mygreen/20"
                        >
                          <div>
                            <a
                              href={item.to}
                              className="text-myblack hover:text-black focus:outline-none focus:text-black"
                              aria-label={`${item.name} - ${item.description}`}
                            >
                              {item.name}
                              <span className="absolute inset-0" />
                            </a>
                            <p className="mt-1 text-mydarkgrey">{item.description}</p>
                          </div>
                        </Menu.Item>
                      ))}
                    </div>

                    {/* Additional Links Section */}
                    {additionalLinks.length ? (
                      <div className="bg-slate-50 p-8">
                        <div className="flex justify-between">
                          <h3
                            className="mt-4 text-sm leading-6 text-myblue"
                            id="additional-links-heading"
                          >
                            Additional Links
                          </h3>
                        </div>
                        <ul
                          role="list"
                          className="mt-6 space-y-6"
                          aria-labelledby="additional-links-heading"
                        >
                          {additionalLinks.map((item: MenuLinkDatum) => (
                            <li key={item.name} className="relative">
                              <Menu.Item
                                value={item.name}
                                className="menu-item block w-full text-left"
                              >
                                <a
                                  href={item.to}
                                  className="block truncate text-sm font-bold leading-6 text-mydarkgrey hover:text-black focus:outline-none focus:text-black focus:underline p-2 rounded"
                                  title={item.description}
                                  aria-label={`${item.name} - ${item.description}`}
                                >
                                  {item.name}
                                  <span className="absolute inset-0" />
                                </a>
                              </Menu.Item>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </div>
              </Menu.Content>
            </Menu.Positioner>
          </Portal>
        </Menu.Root>
      </div>
    </>
  );
};

export default MenuComponent;
