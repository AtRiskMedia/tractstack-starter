import { NodesContext } from "@/store/nodes";
import { ulid } from "ulid";
import { getTitleSlug } from "@/utils/aai/getTitleSlug";
import { contentMap } from "@/store/events";
import type { PageDesign, PaneNode, StoryFragmentNode } from "@/types";

interface ProcessedPage {
  sections: PageSection[];
}

type PageSectionType = "intro" | "content" | "subcontent";

interface PageSection {
  type: PageSectionType;
  content: string;
  children?: PageSection[]; // Optional because only content sections might have children
}

export function parsePageMarkdown(markdown: string): ProcessedPage {
  const lines = markdown.split("\n");
  const sections: PageSection[] = [];
  let currentSection: PageSection | null = null;
  let currentParagraph = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    const h2Match = line.match(/^## (.*)/);
    const h3Match = line.match(/^### (.*)/);
    const h4Match = line.match(/^#### (.*)/);

    if (h2Match && !currentSection) {
      currentSection = {
        type: "intro",
        content: `## ${h2Match[1]}\n\n`,
        children: [],
      };
    } else if (h3Match) {
      if (currentSection) {
        if (currentParagraph) {
          currentSection.content += currentParagraph.trim() + "\n\n";
          currentParagraph = "";
        }
        sections.push(currentSection);
      }
      currentSection = {
        type: "content",
        content: `### ${h3Match[1]}\n\n`,
        children: [],
      };
    } else if (h4Match && currentSection) {
      if (currentParagraph) {
        currentSection.content += currentParagraph.trim() + "\n\n";
        currentParagraph = "";
      }
      const subSection: PageSection = {
        type: "subcontent",
        content: `#### ${h4Match[1]}\n\n`,
        children: [],
      };
      if (!currentSection.children) currentSection.children = [];
      currentSection.children.push(subSection);
      // Reset currentParagraph to start collecting content for the subSection
      currentParagraph = "";
    } else if (currentSection) {
      // This part handles content for both H3 and H4 sections
      if (currentParagraph === "") {
        currentParagraph = line;
      } else {
        currentParagraph += "\n" + line;
      }
      // If we're in a subSection, we need to update its content directly
      if (
        currentSection.children &&
        currentSection.children.length > 0 &&
        currentSection.type === "content"
      ) {
        const lastChild = currentSection.children[currentSection.children.length - 1];
        if (lastChild.type === "subcontent") {
          lastChild.content += line + "\n";
          currentParagraph = ""; // Reset since we've added it directly to subSection
        }
      }
    }
  }

  // Handle the last paragraph or section
  if (currentSection) {
    if (currentSection.type === "intro" && currentParagraph) {
      currentSection.content += currentParagraph.trim() + "\n\n";
    } else if (currentParagraph) {
      if (
        currentSection.children &&
        currentSection.children.length > 0 &&
        currentSection.type === "content"
      ) {
        const lastChild = currentSection.children[currentSection.children.length - 1];
        if (lastChild.type === "subcontent") {
          lastChild.content += currentParagraph.trim() + "\n\n";
        } else {
          currentSection.content += currentParagraph.trim() + "\n\n";
        }
      } else {
        currentSection.content += currentParagraph.trim() + "\n\n";
      }
    }
    sections.push(currentSection);
  }

  return { sections };
}

/**
 * Creates panes for a processed page using the selected design
 */
export async function createPagePanes(
  processedPage: ProcessedPage,
  design: PageDesign,
  ctx: NodesContext,
  generateTitle: boolean,
  nodeId?: string
): Promise<string[]> {
  const ownerId = nodeId || ctx.rootNodeId.get();
  const paneIds: string[] = [];

  // Get existing slugs to avoid duplicates (used when generating titles)
  const existingSlugs = generateTitle
    ? contentMap
        .get()
        .filter((item: { type: string }) => ["Pane", "StoryFragment"].includes(item.type))
        .map((item: { slug: string }) => item.slug)
    : [];

  // Intro section uses the introDesign function with useOdd set to false
  const introSection = processedPage.sections.find((s) => s.type === "intro");
  if (introSection) {
    const introPane = design.introDesign();
    introPane.id = ulid();
    introPane.slug = "";
    introPane.title = "";
    introPane.markdown.markdownBody = introSection.content || "";

    // Generate title and slug if needed
    if (generateTitle && introPane.markdown.markdownBody.trim().length > 0) {
      const titleSlugResult = await getTitleSlug(introPane.markdown.markdownBody, existingSlugs);

      if (titleSlugResult) {
        introPane.title = titleSlugResult.title;
        introPane.slug = titleSlugResult.slug;
        // Add to existing slugs to ensure uniqueness for subsequent panes
        existingSlugs.push(titleSlugResult.slug);
      }
    }

    const paneId = ctx.addTemplatePane(ownerId, introPane);
    if (paneId) {
      paneIds.push(paneId);
    }
  }

  // Content sections - use the contentDesign function with alternating useOdd
  const contentSections = processedPage.sections.filter((s) => s.type === "content");

  for (let index = 0; index < contentSections.length; index++) {
    const section = contentSections[index];

    // Add visual break before content section if we have breaks defined and it's not the first content section
    if (design.visualBreaks && index > 0) {
      const isEven = (index - 1) % 2 === 0;
      const breakTemplate = isEven ? design.visualBreaks.even() : design.visualBreaks.odd();
      const lastPaneId = paneIds[paneIds.length - 1];

      if (lastPaneId) {
        // Get colors from surrounding panes
        const abovePane = ctx.allNodes.get().get(lastPaneId) as PaneNode;
        const aboveColor = abovePane?.bgColour || "white";

        // Get the next content pane color by creating temp template
        const nextContentPane = design.contentDesign(!isEven);
        const belowColor = nextContentPane.bgColour;

        // Regular breaks - take color of section above, SVG is color of section below
        breakTemplate.bgColour = aboveColor;
        const svgFill = belowColor;

        if (breakTemplate.bgPane) {
          if (breakTemplate.bgPane.breakDesktop) {
            breakTemplate.bgPane.breakDesktop.svgFill = svgFill;
          }
          if (breakTemplate.bgPane.breakTablet) {
            breakTemplate.bgPane.breakTablet.svgFill = svgFill;
          }
          if (breakTemplate.bgPane.breakMobile) {
            breakTemplate.bgPane.breakMobile.svgFill = svgFill;
          }
        }

        const breakPaneId = ctx.addTemplatePane(ownerId, breakTemplate, lastPaneId, "after");
        if (breakPaneId) {
          paneIds.push(breakPaneId);
        }
      }
    }

    // Add the content section
    const isEven = index % 2 !== 0;
    const contentPane = design.contentDesign(!isEven);
    contentPane.id = ulid();
    contentPane.slug = "";
    contentPane.title = "";

    let markdown = "";
    if (section.content) markdown += section.content + "\n\n";
    section.children?.forEach((child) => {
      markdown += child.content + "\n\n";
    });
    contentPane.markdown.markdownBody = markdown.trim();

    // Generate title and slug if needed
    if (generateTitle && contentPane.markdown.markdownBody.trim().length > 0) {
      const titleSlugResult = await getTitleSlug(contentPane.markdown.markdownBody, existingSlugs);

      if (titleSlugResult) {
        contentPane.title = titleSlugResult.title;
        contentPane.slug = titleSlugResult.slug;
        // Add to existing slugs to ensure uniqueness for subsequent panes
        existingSlugs.push(titleSlugResult.slug);
      }
    }

    const paneId = ctx.addTemplatePane(ownerId, contentPane);
    if (paneId) {
      paneIds.push(paneId);
    }

    // Add visual break after last content section if we have breaks defined
    if (design.visualBreaks && index === contentSections.length - 1) {
      const isEven = index % 2 === 0;
      const breakTemplate = isEven ? design.visualBreaks.even() : design.visualBreaks.odd();
      const lastPaneId = paneIds[paneIds.length - 1];

      if (lastPaneId) {
        // Get colors for final break
        const abovePane = ctx.allNodes.get().get(lastPaneId) as PaneNode;
        const aboveColor = abovePane?.bgColour || "white";

        // Get the next content pane color by creating temp template
        const nextContentPane = design.contentDesign(!isEven);
        const belowColor = nextContentPane.bgColour;

        // Final break - inverted colors for bottom edge
        breakTemplate.bgColour = aboveColor;
        const svgFill = belowColor;

        if (breakTemplate.bgPane) {
          if (breakTemplate.bgPane.breakDesktop) {
            breakTemplate.bgPane.breakDesktop.svgFill = svgFill;
          }
          if (breakTemplate.bgPane.breakTablet) {
            breakTemplate.bgPane.breakTablet.svgFill = svgFill;
          }
          if (breakTemplate.bgPane.breakMobile) {
            breakTemplate.bgPane.breakMobile.svgFill = svgFill;
          }
        }

        const breakPaneId = ctx.addTemplatePane(ownerId, breakTemplate, lastPaneId, "after");
        if (breakPaneId) {
          paneIds.push(breakPaneId);
        }
      }
    }
  }

  return paneIds;
}

/**
 * Validates markdown structure matches expected page format
 */
export function validatePageMarkdown(markdown: string): boolean {
  const { sections } = parsePageMarkdown(markdown);

  // Must have at least one section
  if (sections.length === 0) return false;

  // First section should be intro (H2)
  if (sections[0].type !== "intro") return false;

  // Should have at least one content section
  if (!sections.some((s) => s.type === "content")) return false;

  // All sections should have content
  if (!sections.every((s) => s.content.trim())) return false;

  return true;
}

/**
 * Creates preview text of how markdown will be split into panes
 */
export function getPagePreview(markdown: string): string {
  const { sections } = parsePageMarkdown(markdown);

  let preview = ``;

  sections.forEach((section, i) => {
    preview += `=== Pane ${i + 1} ===\n`;
    preview += `Type: ${section.type}\n`;
    preview += `Content Preview: ${section.content.substring(0, 100)}...\n`;
    if (section.children?.length) {
      preview += `Subsections: ${section.children.length}\n`;
    }
    preview += "\n";
  });

  return preview;
}

/**
 * Builds a complete page preview in the provided context
 */
export async function buildPagePreview(
  markdown: string,
  design: PageDesign,
  ctx: NodesContext
): Promise<void> {
  // Parse markdown into sections
  const processedPage = parsePageMarkdown(markdown);

  // Create story fragment node - add proper type assertion
  const pageNode = ctx.allNodes.get().get("tmp") as StoryFragmentNode;
  if (!pageNode) return;

  // Create all panes using design
  const paneIds = await createPagePanes(processedPage, design, ctx, false);

  // Update story fragment with panes
  pageNode.title = "";
  pageNode.slug = "preview";
  pageNode.paneIds = paneIds;
}
