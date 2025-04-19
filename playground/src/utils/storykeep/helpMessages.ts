// src/utils/storykeep/helpMessages.ts

export const helpMessages: Record<string, string> = {
  // --- Tool Modes ---
  MODE_STYLES:
    "Styles Mode: Click any element in the preview to adjust its appearance (colors, spacing, borders, etc.) in the Settings Panel below.",
  MODE_TEXT:
    "Text Mode: Click directly on text in the preview to edit it. Double-click elements like images or widgets to open their style settings.",
  MODE_INSERT:
    "Insert Mode: Select an element type from the toolbar that appeared, then click in the preview area where you want to add it.",
  MODE_ERASER:
    "Eraser Mode: Click any element outlined in red in the preview to remove it. Be careful, this action cannot be undone easily!",
  MODE_MOVE:
    "Move Mode: Click the up/down arrows that appear on elements to reorder them within their container.",
  MODE_LAYOUT:
    "Layout Mode: Select a layout template to apply automated styling to the current pane. (Feature under development)",
  MODE_DEBUG:
    "Debug Mode: Click elements to see their technical IDs and structure. Click the debug icon again to exit.",

  // --- Insert Sub-Modes ---
  INSERT_P: "Click between existing blocks or in an empty area to insert a new paragraph.",
  INSERT_H2: "Click between existing blocks or in an empty area to insert a Level 2 Heading.",
  INSERT_H3: "Click between existing blocks or in an empty area to insert a Level 3 Heading.",
  INSERT_H4: "Click between existing blocks or in an empty area to insert a Level 4 Heading.",
  INSERT_IMG:
    "Click within a text block (not inside a list) to insert an image. Images are added inside list containers.",
  INSERT_SIGNUP: "Click within a text block (not inside a list) to insert an Email Sign-up widget.",
  INSERT_YT: "Click within a text block (not inside a list) to insert a YouTube video widget.",
  INSERT_BUNNY: "Click within a text block (not inside a list) to insert a Bunny video widget.",
  INSERT_BELIEF:
    "Click within a text block (not inside a list) to insert a Belief selection widget.",
  INSERT_IDENTIFY:
    "Click within a text block (not inside a list) to insert an 'Identify As' widget.",
  INSERT_TOGGLE: "Click within a text block (not inside a list) to insert a Belief toggle widget.",

  // --- Settings Panel States ---
  PANEL_SETTINGS_CLOSED:
    "Click an element in the preview (in Styles or Text mode) to open its settings here.",
  PANEL_STYLE_ELEMENT:
    "Adjust common styles like text color, size, font, and spacing for this element. Use the viewport tabs to set responsive styles.",
  PANEL_STYLE_LINK:
    "Style the appearance of this link or button. Use the tabs for Normal and Hover states. Configure the destination via the settings icon.",
  PANEL_STYLE_LINK_CONFIG:
    "Define where this link or button goes. Use the builder or enter a LISP command directly. Set if it opens in a new tab.",
  PANEL_STYLE_IMAGE:
    "Upload/Select an image, set its Alt text for accessibility, and adjust container styles.",
  PANEL_STYLE_WIDGET:
    "Adjust container styles for this widget. Configure widget-specific options via the settings icon.",
  PANEL_STYLE_WIDGET_CONFIG:
    "Configure the parameters for this specific widget (e.g., YouTube ID, Belief tag).",
  PANEL_STYLE_PARENT:
    "Style the container layers of this pane. Use the layer buttons (1, 2, 3...) to target different wrappers (inside -> out). Styles cascade across viewports.",
  PANEL_STYLE_BREAK:
    "Configure the visual break shape, shape color (Fill), and background color for different screen sizes.",
  PANEL_STYLE_LI:
    "Style the list item itself or its container (UL/OL). Use the 'Container Styles' section for the overall list.",
  PANEL_STYLE_CODEHOOK:
    "Select a Code Hook component to render dynamic content in this pane. Options can be configured after selection.",
  PANEL_ADD_STYLE:
    "Search or select a Tailwind style property to add. Use 'Recommended Styles' for common options.",
  PANEL_UPDATE_STYLE:
    "Set the value for this style property. Use the viewport tabs (Mobile, Tablet, Desktop) to create responsive designs. Styles cascade upwards (Mobile applies to all unless overridden).",
  PANEL_REMOVE_STYLE:
    "Confirm removal of this style property. This will remove the style from all viewports.",
  PANEL_DELETE_LAYER:
    "Confirm removal of this entire style layer and all its properties. Use this to simplify pane structure.",

  // --- Page/Fragment Config States ---
  PANEL_CONFIG_PAGE:
    "Page Settings: Click a setting (Title, Slug, Menu, SEO) to edit its properties.",
  PANEL_CONFIG_PAGE_TITLE:
    "Edit the main title of this page. This appears in the browser tab and search results. Aim for 50-60 characters.",
  PANEL_CONFIG_PAGE_SLUG:
    "Edit the URL slug for this page (e.g., /your-slug). Use lowercase letters, numbers, and hyphens. Keep it short and descriptive.",
  PANEL_CONFIG_PAGE_MENU:
    "Select a Menu to display in the header/footer for this page. You can create or edit menus here as well.",
  PANEL_CONFIG_PAGE_OG:
    "Configure Search Engine Optimization (SEO) and social sharing settings (Open Graph). Upload a specific sharing image (1200x630px recommended) or let one be generated from the title and brand colors.",

  // --- Pane Config States ---
  PANEL_CONFIG_PANE:
    "Pane Settings: Click a setting (Title, Slug, Impression, Magic Path) to edit its properties.",
  PANEL_CONFIG_PANE_TITLE:
    "Edit the internal title for this pane. This is primarily used for organization and analytics.",
  PANEL_CONFIG_PANE_SLUG:
    "Edit the internal slug for this pane. This is used for analytics and can sometimes be used for deep-linking (#pane-slug).",
  PANEL_CONFIG_PANE_PATH:
    "Magic Path: Define conditions based on user beliefs to show or hide this pane dynamically. Add 'Show When' or 'Hide When' rules.",
  PANEL_CONFIG_PANE_IMPRESSION:
    "Impression: Set up a targeted message (title, body, button text, action) to display as a notification when this pane becomes visible.",

  // --- Add Pane Actions ---
  ACTION_ADD_PANE: "Choose how you want to add a new content section (pane) here.",
  ACTION_ADD_PANE_NEW:
    "Select a design template, then choose a content mode (Design copy, AI copy, Custom markdown, Blank), and click a preview to add the new pane.",
  ACTION_ADD_PANE_BREAK:
    "Select a visual break style to insert a decorative separator between panes.",
  ACTION_ADD_PANE_REUSE:
    "Search for and select an existing pane to reuse its content and style here.",
  ACTION_ADD_PANE_CODEHOOK:
    "Select a pre-defined Code Hook component (e.g., Featured Content) to insert dynamic content.",
  ACTION_ADD_PANE_AI_COPY:
    "Provide reference text and optional instructions for the AI to generate content, then choose a design template to apply it to.",
  ACTION_ADD_PANE_CUSTOM_COPY:
    "Paste or write your content in Markdown format, then choose a design template to apply it to.",
  ACTION_ADD_PANE_PREVIEW:
    "Review the generated or custom content. Select a design template and click 'Apply Design' to add the pane.",

  // --- Other Actions ---
  ACTION_SAVING: "Saving your changes... Please wait.",
  ACTION_EDITING_TEXT:
    "Editing text. Click outside or press Enter to finish. Use standard formatting like **bold** or *italic*.",
  ACTION_COPY_STYLE:
    "Styles copied! Select another element of the same type and click the paste icon.",
  ACTION_PASTE_STYLE: "Styles applied from memory.",
  ACTION_DRAGGING_ELEMENT:
    "Drag this element and drop it above or below another element to reorder.",

  // --- Viewport ---
  VIEWPORT_AUTO:
    "Responsive Preview: Editor width determines active styles (Mobile < Tablet < Desktop). Styles cascade upwards.",
  VIEWPORT_MOBILE:
    "Mobile Preview: Editing styles specifically for Mobile screens (styles cascade up to Tablet & Desktop).",
  VIEWPORT_TABLET:
    "Tablet Preview: Editing styles specifically for Tablet screens (styles cascade up from Mobile to Desktop).",
  VIEWPORT_DESKTOP: "Desktop Preview: Editing styles specifically for Desktop screens.",

  // --- Analytics ---
  VIEW_ANALYTICS: "Viewing interaction analytics. Use the time period buttons to change the view.",

  // --- Default/Fallback ---
  DEFAULT: "Select an element or tool to get started.",
};
