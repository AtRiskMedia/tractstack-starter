// src/utils/storykeep/helpMessages.ts

export const helpMessages: Record<string, string> = {
  // --- Pre Modes ---
  MISSING_TITLE:
    "To get started: write a clear, descriptive title that accurately represents your page content",
  MISSING_PANES: "Follow the on-screen steps to create your first page",

  // --- Tool Modes ---
  MODE_STYLES: "Click any element to adjust its appearance (colours, spacing, borders, etc.)",
  MODE_TEXT: "Click text to edit. *Italic* **Bold** Add an action with [[My Link]]",
  MODE_INSERT:
    "Insert paragraph, heading, image, interactive widget, etc. Choose from the bottom menu panel",
  MODE_ERASER: "Use the trash icon to delete stuff! Undo / redo from the header",
  MODE_MOVE: "Up / Down arrows reorder elements (drag n' drop coming soon!)",
  MODE_LAYOUT: "Coming soon!",

  // --- Settings Panel States ---
  PANEL_STYLE_ELEMENT:
    "Adjust common styles like text color, size, font, and spacing for this element. The icons (Mobile, Tablet, Desktop) to view on different devices",
  PANEL_STYLE_LINK:
    "Style the appearance for Normal and Hover states. Configure the call-to-action via the settings button.",
  PANEL_STYLE_LINK_CONFIG: "Build your call-to-action! See our docs for more info",
  PANEL_STYLE_IMAGE:
    "Be sure to set Alt text for accessibility. For advanced layouts you can add container styles",
  PANEL_STYLE_WIDGET:
    "Apply styles on the widget and its containers. Check our docs for more info!",
  PANEL_STYLE_WIDGET_CONFIG:
    "Configure the parameters for this specific widget. See our docs for more info!",
  PANEL_STYLE_PARENT:
    "Style the container layer(s) of this pane. Use the layer buttons (1, 2, 3...) to apply advanced layouts. Styles cascade across viewports",
  PANEL_STYLE_BREAK: "Configure the visual break shape, shape color, and background color",
  PANEL_STYLE_LI: "Advanced layout: Style the inner and outer container or the element itself",
  PANEL_STYLE_CODEHOOK:
    "Add special and custom capabilities to your site. Check our docs for more info!",
  PANEL_ADD_STYLE:
    "Search or select a Tailwind style property to add. Use 'Recommended Styles' for common options.",
  PANEL_UPDATE_STYLE:
    "Set the value for this style property. The icons (Mobile, Tablet, Desktop) to view on different devices. Styles cascade upwards (Mobile applies to all unless overridden).",
  PANEL_REMOVE_STYLE:
    "Confirm removal of this style property. This will remove the style from all viewports.",
  PANEL_DELETE_LAYER:
    "Confirm removal of this entire style layer and all its properties. Use this to simplify pane structure.",

  // --- Page/Fragment Config States ---
  PANEL_CONFIG_PAGE_TITLE:
    "Write a clear, descriptive title that accurately represents your page content",
  PANEL_CONFIG_PAGE_SLUG:
    "Create a clean, descriptive URL slug that helps users and search engines understand the page content",
  PANEL_CONFIG_PAGE_MENU: "Add a Menu to this page. Manage menus in your /storykeep",
  PANEL_CONFIG_PAGE_OG: "Let's simplify your Search Engine Optimization (SEO) game",

  // --- Pane Config States ---
  PANEL_CONFIG_PANE_TITLE:
    "Edit the internal title for this pane. This is primarily used for analytics reporting.",
  PANEL_CONFIG_PANE_SLUG:
    "Edit the internal slug for this pane. Used for analytics. Could be used for deep-linking (#pane-slug).",
  PANEL_CONFIG_PANE_PATH:
    "Create dynamic content and web funnel experiences! Check our docs to learn more",
  PANEL_CONFIG_PANE_IMPRESSION: "When user interacts with this content, drop a call-to-action!",

  // --- Add Pane Actions ---
  ACTION_ADD_PANE_NEW:
    "Build your website one 'section' at a time. Your analytics will be precise and more useful!",
  ACTION_ADD_PANE_BREAK: "Add some creative flare to your web page",
  ACTION_ADD_PANE_REUSE: "Search for and select an existing pane to reuse on this page",
  ACTION_ADD_PANE_CODEHOOK:
    "Add special and custom capabilities to your site. Check our docs for more info!",

  // --- Styles Memory ---
  STYLES_COPY: "Copy styles for this element into memory",
  STYLES_PASTE: "Paste styles onto this element",

  // --- Special ---
  GHOST_INSERT: "Add element to this pane. Use the + insert mode for more control.",

  // --- Default/Fallback ---
  DEFAULT: "Select an element or tool to get started.",
};
