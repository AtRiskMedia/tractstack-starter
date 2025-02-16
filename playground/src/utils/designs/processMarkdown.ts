import { NodesContext } from "@/store/nodes";
import { ulid } from "ulid";
import { cloneDeep } from "@/utils/common/helpers";
import type { PageDesign, StoryFragmentNode } from "@/types";

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
export function createPagePanes(
  processedPage: ProcessedPage,
  design: PageDesign,
  ctx: NodesContext
): string[] {
  const paneIds: string[] = [];

  // First handle intro if exists
  const introSection = processedPage.sections.find((s) => s.type === "intro");
  if (introSection) {
    const introPane = cloneDeep(design.introDesign);
    introPane.id = ulid();
    introPane.markdown.markdownBody = introSection.content;
    const paneId = ctx.addTemplatePane("tmp", introPane);
    if (paneId) paneIds.push(paneId);
  }

  // Then handle content sections with alternating styles
  const contentSections = processedPage.sections.filter((s) => s.type === "content");
  contentSections.forEach((section, index) => {
    const contentPane = cloneDeep(design.contentDesign);
    contentPane.id = ulid();
    // Build content from section and its children
    let markdown = "";
    if (section.content) markdown += section.content + "\n\n";
    section.children?.forEach((child) => {
      markdown += child.content + "\n\n";
    });
    contentPane.markdown.markdownBody = markdown.trim();

    // Alternate background color based on index if specified
    if (design.contentDesign.bgColour && index % 2 !== 0) {
      contentPane.bgColour = design.contentDesign.bgColour;
    }

    const paneId = ctx.addTemplatePane("tmp", contentPane);
    if (paneId) paneIds.push(paneId);
  });

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
export function buildPagePreview(markdown: string, design: PageDesign, ctx: NodesContext): void {
  // Parse markdown into sections
  const processedPage = parsePageMarkdown(markdown);

  // Create story fragment node - add proper type assertion
  const pageNode = ctx.allNodes.get().get("tmp") as StoryFragmentNode;
  if (!pageNode) return;

  // Create all panes using design
  const paneIds = createPagePanes(processedPage, design, ctx);

  // Update story fragment with panes
  pageNode.title = "";
  pageNode.slug = "preview";
  pageNode.paneIds = paneIds;
}
