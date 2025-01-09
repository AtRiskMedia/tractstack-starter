import type { TemplateNode, ToolAddMode } from "@/types.ts";
import {
  TemplateBeliefNode, TemplateBunnyNode, TemplateEmailSignUpNode,
  TemplateH2Node,
  TemplateH3Node,
  TemplateH4Node, TemplateIdentifyAsNode,
  TemplateImgNode,
  TemplatePNode, TemplateToggleNode, TemplateYoutubeNode,
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
    case "toggle":
      return TemplateToggleNode;
    case "yt":
      return TemplateYoutubeNode;
    case "belief":
      return TemplateBeliefNode;
    case "bunny":
      return TemplateBunnyNode;
    case "signup":
      return TemplateEmailSignUpNode;
    case "identify":
      return TemplateIdentifyAsNode;

    case "p":
    default:
      return TemplatePNode;
  }
};
