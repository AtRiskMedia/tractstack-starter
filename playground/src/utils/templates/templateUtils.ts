import { ulid } from "ulid";
import { NodesContext } from "@/store/nodes";
import type { LoadData } from "@/store/nodesSerializer.ts";
import type {
  BaseNode,
  StoryFragmentNode,
  PaneNode,
  ImageFileNode,
  MenuNode,
  TractStackNode,
} from "@/types";

/**
 * Represents template data for serialization and export
 */
export interface TemplateData {
  id: string;
  name: string;
  description: string;
  tractstackNodes: BaseNode[];
  storyfragmentNodes: BaseNode[];
  paneNodes: BaseNode[];
  childNodes: BaseNode[];
  fileNodes: BaseNode[];
  menuNodes: BaseNode[];
}

/**
 * Result of template conversion operations
 */
export interface TemplateConversionResult {
  success: boolean;
  data?: LoadData;
  error?: string;
}

/**
 * Converts a NodesContext to serializable template data
 *
 * @param ctx - The nodes context containing the template structure
 * @param name - Name of the template
 * @param description - Description of the template
 * @returns The serializable template data
 */
export function contextToTemplateData(
  ctx: NodesContext,
  name: string,
  description: string
): TemplateData {
  // Get all nodes from context
  const allNodes = Array.from(ctx.allNodes.get().values());

  // Categorize nodes by type
  const tractstackNodes = allNodes.filter((node) => node.nodeType === "TractStack");
  const storyfragmentNodes = allNodes.filter((node) => node.nodeType === "StoryFragment");
  const paneNodes = allNodes.filter((node) => node.nodeType === "Pane");
  const fileNodes = allNodes.filter((node) => node.nodeType === "File");
  const menuNodes = allNodes.filter((node) => node.nodeType === "Menu");

  // All other nodes go into childNodes
  const childNodes = allNodes.filter(
    (node) => !["TractStack", "StoryFragment", "Pane", "File", "Menu"].includes(node.nodeType)
  );

  // Create template data
  return {
    id: ulid(),
    name: name || "Unnamed Template",
    description: description || "",
    tractstackNodes,
    storyfragmentNodes,
    paneNodes,
    childNodes,
    fileNodes,
    menuNodes,
  };
}

/**
 * Converts template data back to LoadData format for editor
 *
 * @param templateData - The template data to convert
 * @returns A result object with the LoadData or error
 */
export function templateDataToLoadData(templateData: TemplateData): TemplateConversionResult {
  try {
    const loadData: LoadData = {
      tractstackNodes: templateData.tractstackNodes as TractStackNode[],
      storyfragmentNodes: templateData.storyfragmentNodes as StoryFragmentNode[],
      paneNodes: templateData.paneNodes as PaneNode[],
      fileNodes: templateData.fileNodes as ImageFileNode[],
      menuNodes: templateData.menuNodes as MenuNode[],
      childNodes: templateData.childNodes,
    };

    return {
      success: true,
      data: loadData,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Validates template data structure
 *
 * @param templateData - The data to validate
 * @returns Validation result
 */
export function validateTemplateData(templateData: unknown): TemplateConversionResult {
  try {
    // Check if data is an object
    if (!templateData || typeof templateData !== "object") {
      return {
        success: false,
        error: "Invalid template format: expected an object",
      };
    }

    // Cast to TemplateData for type checking
    const data = templateData as TemplateData;

    // Check required fields
    if (!data.id || typeof data.id !== "string") {
      return {
        success: false,
        error: "Invalid template: missing id field",
      };
    }

    if (!data.name || typeof data.name !== "string") {
      return {
        success: false,
        error: "Invalid template: missing name field",
      };
    }

    // Check node arrays
    if (
      !Array.isArray(data.paneNodes) ||
      !Array.isArray(data.storyfragmentNodes) ||
      !Array.isArray(data.childNodes)
    ) {
      return {
        success: false,
        error: "Invalid template: missing required node arrays",
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error during validation",
    };
  }
}

/**
 * Generates an empty template structure for "create new" option
 *
 * @returns LoadData structure with minimal node setup
 */
export function createEmptyTemplate(): LoadData {
  const tractStackId = ulid();
  const fragmentId = ulid();
  const now = new Date(); // Use Date object instead of string

  // Create minimal TractStack
  const tractstack: TractStackNode = {
    id: tractStackId,
    nodeType: "TractStack",
    parentId: null,
    title: "Template",
    slug: "template",
  };

  // Create minimal StoryFragment
  const storyFragment: StoryFragmentNode = {
    id: fragmentId,
    nodeType: "StoryFragment",
    parentId: tractStackId,
    title: "",
    slug: "",
    paneIds: [],
    hasMenu: false,
    created: now,
    changed: now,
    tailwindBgColour: "white",
  };

  return {
    tractstackNodes: [tractstack],
    storyfragmentNodes: [storyFragment],
    paneNodes: [],
    childNodes: [],
  };
}

/**
 * Parses a JSON string to template data
 *
 * @param jsonString - JSON string to parse
 * @returns Conversion result with parsed data or error
 */
export function parseTemplateJson(jsonString: string): TemplateConversionResult {
  try {
    const parsed = JSON.parse(jsonString);
    const validationResult = validateTemplateData(parsed);

    if (!validationResult.success) {
      return validationResult;
    }

    return templateDataToLoadData(parsed as TemplateData);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error parsing JSON",
    };
  }
}

/**
 * Converts a template to a formatted JSON string for display/copy
 *
 * @param template - Template data to format
 * @returns Formatted JSON string
 */
export function formatTemplateJson(template: TemplateData): string {
  return JSON.stringify(template, null, 2);
}
