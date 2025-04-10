import { useState } from "react";
import type { ReactNode } from "react";
import { RadioGroup } from "@headlessui/react";
import { ulid } from "ulid";
import FeaturedContentPreview from "@/components/codehooks/FeaturedContentPreview";
import ListContentPreview from "@/components/codehooks/ListContentPreview";
import VisualBreakPreview from "./VisualBreakPreview";
import { getTemplateVisualBreakPane } from "@/utils/TemplatePanes";
import { contentMap } from "@/store/events.ts";
import type { NodesContext } from "@/store/nodes";
import { findUniqueSlug } from "@/utils/common/helpers";
import type { StoryFragmentNode, TemplatePane } from "@/types";

// Layout options with IDs, labels, and descriptions
const layoutOptions = [
  {
    id: "featured-only",
    label: "Featured Content Only",
    description: "A hero section highlighting your most important content",
  },
  {
    id: "featured-list",
    label: "Featured with List",
    description: "Hero section with a supporting content grid below",
  },
  {
    id: "complete-home",
    label: "Complete Home Layout",
    description: "Hero section, visual break, and supporting content grid",
  },
];

// Visual break variants for selection
const breakVariants = [
  { id: "cutwide2", label: "Wave Cut", odd: true },
  { id: "cutwide1", label: "Diagonal Cut", odd: true },
  { id: "burstwide2", label: "Burst", odd: false },
  { id: "crookedwide", label: "Crooked", odd: false },
];

interface PageCreationSpecialProps {
  nodeId: string;
  ctx: NodesContext;
}

const PageCreationSpecial = ({ nodeId, ctx }: PageCreationSpecialProps): ReactNode => {
  // State for layout and visual break selection
  const [selectedLayout, setSelectedLayout] = useState(layoutOptions[0].id);
  const [selectedBreak, setSelectedBreak] = useState(breakVariants[0].id);
  const [isCreating, setIsCreating] = useState(false);

  const existingSlugs = contentMap
    .get()
    .filter((item) => ["Pane", "StoryFragment"].includes(item.type))
    .map((item) => item.slug);

  // Function to handle continue/apply button
  const handleApply = async () => {
    try {
      setIsCreating(true);

      // Get the storyfragment node
      const storyfragment = ctx.allNodes.get().get(nodeId) as StoryFragmentNode;
      if (!storyfragment) {
        console.error("Story fragment not found");
        return;
      }

      // Create panes array to hold the IDs of all panes we'll create
      const paneIds: string[] = [];

      // 1. Create Featured Content pane
      const featuredContentPane: TemplatePane = {
        id: ulid(),
        nodeType: "Pane",
        title: "Featured Content",
        slug: findUniqueSlug(`featured-content`, existingSlugs),
        isDecorative: false,
        parentId: nodeId,
        codeHookTarget: "featured-content",
        codeHookPayload: {
          options: JSON.stringify({
            title: "Featured Content",
            featured: true,
            slugs: "",
            category: "",
            limit: "6",
            showDate: "true",
          }),
        },
      };

      // Add the featured content pane
      const featuredContentId = ctx.addTemplatePane(nodeId, featuredContentPane);
      if (featuredContentId) {
        paneIds.push(featuredContentId);
      }

      // If layout includes visual break + list content
      if (selectedLayout === "complete-home") {
        // Get the selected break variant
        const breakVariant = breakVariants.find((b) => b.id === selectedBreak);
        const bgColor = breakVariant?.odd ? "white" : "gray-50";
        const fillColor = breakVariant?.odd ? "gray-50" : "white";

        // 2. Create Visual Break pane
        const visualBreakTemplate = getTemplateVisualBreakPane(selectedBreak);
        visualBreakTemplate.id = ulid();
        visualBreakTemplate.title = "Visual Break";
        visualBreakTemplate.slug = `${storyfragment.slug}-visual-break`;
        visualBreakTemplate.bgColour = bgColor;

        // Configure the SVG fill color
        if (visualBreakTemplate.bgPane) {
          if (visualBreakTemplate.bgPane.type === "visual-break") {
            if (visualBreakTemplate.bgPane.breakDesktop) {
              visualBreakTemplate.bgPane.breakDesktop.svgFill = fillColor;
            }
            if (visualBreakTemplate.bgPane.breakTablet) {
              visualBreakTemplate.bgPane.breakTablet.svgFill = fillColor;
            }
            if (visualBreakTemplate.bgPane.breakMobile) {
              visualBreakTemplate.bgPane.breakMobile.svgFill = fillColor;
            }
          }
        }

        // Add the visual break pane
        const visualBreakId = ctx.addTemplatePane(nodeId, visualBreakTemplate);
        if (visualBreakId) {
          paneIds.push(visualBreakId);
        }
      }

      // If layout includes list content
      if (selectedLayout === "featured-list" || selectedLayout === "complete-home") {
        // 3. Create List Content pane
        const listContentPane: TemplatePane = {
          id: ulid(),
          nodeType: "Pane",
          title: "Content List",
          slug: `${storyfragment.slug}-content-list`,
          isDecorative: false,
          parentId: nodeId,
          // For complete-home layout, match the background color with the visual break
          bgColour: selectedLayout === "complete-home" ? "gray-50" : "white",
          codeHookTarget: "list-content",
          codeHookPayload: {
            options: JSON.stringify({
              title: "More Articles",
              sortByPopular: "true",
              showTopics: "true",
              showDate: "true",
              limit: "10",
              category: "",
            }),
          },
        };

        // Add the list content pane
        const listContentId = ctx.addTemplatePane(nodeId, listContentPane);
        if (listContentId) {
          paneIds.push(listContentId);
        }
      }

      // Update the storyfragment with the new panes
      if (paneIds.length > 0) {
        storyfragment.paneIds = paneIds;
        storyfragment.isChanged = true;
        ctx.modifyNodes([storyfragment]);
        ctx.notifyNode("root");
      }

      // Set title and slug if they're not set
      if (!storyfragment.title || !storyfragment.slug) {
        const updatedFragment = {
          ...storyfragment,
          title: storyfragment.title || "Home Page",
          slug: storyfragment.slug || "home",
          isChanged: true,
        };
        ctx.modifyNodes([updatedFragment]);
      }
    } catch (error) {
      console.error("Error creating special layout:", error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-md">
      <div className="mb-6 space-y-6 italic text-mydarkgrey">
        <strong>Note:</strong> when editing web pages (story fragments) be sure to click on Topics
        &amp; Details for each page; (if you see no articles, that's why!)
      </div>
      <div className="mb-6 space-y-6">
        <div>
          <RadioGroup value={selectedLayout} onChange={setSelectedLayout}>
            <RadioGroup.Label className="text-lg font-bold">Select Layout</RadioGroup.Label>
            <div className="space-y-4 mt-2">
              {layoutOptions.map((option) => (
                <RadioGroup.Option key={option.id} value={option.id}>
                  {({ checked }) => (
                    <div
                      className={`flex items-center space-x-3 p-4 border rounded-lg ${
                        checked ? "border-cyan-600 bg-cyan-50" : "border-gray-300"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full ${
                          checked ? "bg-cyan-600" : "bg-white border border-gray-300"
                        }`}
                      />
                      <div>
                        <div className="font-bold">{option.label}</div>
                        <div className="text-sm text-gray-500">{option.description}</div>
                      </div>
                    </div>
                  )}
                </RadioGroup.Option>
              ))}
            </div>
          </RadioGroup>
        </div>

        {selectedLayout === "complete-home" && (
          <div>
            <div className="text-lg font-bold mb-2">Select Visual Break Style</div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {breakVariants.map((breakVar) => (
                <div
                  key={breakVar.id}
                  className={`cursor-pointer rounded-lg border p-2 ${
                    selectedBreak === breakVar.id
                      ? "border-cyan-600 ring-2 ring-cyan-600 ring-opacity-50"
                      : "border-gray-300"
                  }`}
                  onClick={() => setSelectedBreak(breakVar.id)}
                >
                  <div className="h-16 overflow-hidden rounded">
                    <VisualBreakPreview
                      bgColour="#ffffff"
                      fillColour="#000000"
                      variant={breakVar.id}
                      height={60}
                    />
                  </div>
                  <div className="text-center mt-1 text-sm font-bold">{breakVar.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white border rounded-lg shadow-md p-4 mt-8">
        <h3 className="text-lg font-bold mb-4">Preview</h3>

        {selectedLayout === "featured-only" && <FeaturedContentPreview />}

        {selectedLayout === "featured-list" && (
          <div>
            <FeaturedContentPreview />
            <ListContentPreview bgColour="#ffffff" />
          </div>
        )}

        {selectedLayout === "complete-home" && (
          <div>
            <FeaturedContentPreview />
            <VisualBreakPreview
              bgColour={
                breakVariants.find((b) => b.id === selectedBreak)?.odd ? "#ffffff" : "#f1f5f9"
              }
              fillColour={
                breakVariants.find((b) => b.id === selectedBreak)?.odd ? "#f1f5f9" : "#ffffff"
              }
              variant={selectedBreak}
            />
            <ListContentPreview bgColour="#f1f5f9" />
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          disabled={isCreating}
        >
          Back
        </button>
        <button
          onClick={handleApply}
          disabled={isCreating}
          className={`px-6 py-2 text-sm font-bold text-white rounded-md transition-colors ${
            isCreating ? "bg-gray-400" : "bg-cyan-600 hover:bg-cyan-700"
          }`}
        >
          {isCreating ? "Creating..." : "Create Layout"}
        </button>
      </div>
    </div>
  );
};

export default PageCreationSpecial;
