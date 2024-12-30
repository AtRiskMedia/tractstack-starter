import type { TemplatePane } from "@/types.ts";
import {
  TemplateAsideNode,
  TemplateH2Node,
  TemplateH3Node,
  TemplatePNode,
} from "@/utils/TemplateNodes.ts";
import { TemplateSimpleMarkdown } from "@/utils/TemplateMarkdowns.ts";

export const TemplateSimplePane = {
  nodeType: "Pane",
  title: "Simple Pane",
  slug: "simple-pane",
  markdown: {
    ...TemplateSimpleMarkdown,
    nodes: [
      { ...TemplateH2Node, copy: "H2 node in simple pane" },
      { ...TemplatePNode, copy: "P node in simple pane" },
      { ...TemplateH3Node, copy: "H3 node in simple pane" },
      { ...TemplateAsideNode, copy: "Aside node in simple pane" },
    ],
  },
} as TemplatePane;
