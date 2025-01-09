import type { TemplateNode, ToolAddMode } from "@/types.ts";
import {
  TemplateH2Node,
  TemplateH3Node,
  TemplateH4Node,
  TemplateImgNode,
  TemplatePNode,
} from "@/utils/TemplateNodes.ts";

export const getTemplateNode = (value: ToolAddMode): TemplateNode => {
  switch (value) {
    case "h2":
      return TemplateH2Node;
    case "h3":
      return TemplateH3Node;
    case "h4":
      return TemplateH4Node;
    case "img":
      return TemplateImgNode;

    case "p":
    default:
      return TemplatePNode;
  }
};
