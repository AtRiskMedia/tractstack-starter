import * as d3 from "d3";
import { sankey, sankeyLinkHorizontal } from "d3-sankey";
import { useEffect, useRef, useState } from "react";
import { colors } from "@/constants";

interface Node {
  name: string;
  id: string;
}

interface Link {
  source: number;
  target: number;
  value: number;
}

interface SankeyData {
  nodes: Node[];
  links: Link[];
}

interface SankeyDiagramProps {
  data: SankeyData;
}

const SankeyDiagram = ({ data }: SankeyDiagramProps) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({
    width: 800,
    height: 600,
  });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const nodeCount = data.nodes.length || 1;
        const height = Math.max(400, nodeCount * 50); // 50px per node, minimum 400px
        setDimensions({ width: containerWidth, height });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, [data.nodes.length]);

  useEffect(() => {
    if (!svgRef.current || !data || !data.nodes.length || !data.links.length) {
      console.warn("SankeyDiagram: Invalid or empty data provided", data);
      return;
    }

    const maxIndex = data.nodes.length - 1;
    const validLinks = data.links.filter((link) => {
      const isValid =
        link.source >= 0 && link.source <= maxIndex && link.target >= 0 && link.target <= maxIndex;
      if (!isValid) {
        console.warn(
          `Invalid link: source=${link.source}, target=${link.target}, maxIndex=${maxIndex}`
        );
      }
      return isValid;
    });

    if (validLinks.length === 0) {
      console.warn("SankeyDiagram: No valid links after validation");
      return;
    }

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { width, height } = dimensions;

    const sankeyGenerator = sankey<Node, Link>()
      .nodeWidth(20)
      .nodePadding(10)
      .extent([
        [50, 50],
        [width - 50, height - 50],
      ]);

    try {
      const { nodes, links } = sankeyGenerator({
        nodes: data.nodes.map((d) => ({ ...d })),
        links: validLinks.map((d) => ({ ...d })),
      });

      // Draw links
      svg
        .append("g")
        .selectAll("path")
        .data(links)
        .enter()
        .append("path")
        .attr("d", sankeyLinkHorizontal())
        .attr("stroke", "#999")
        .attr("stroke-width", (d) => Math.max(1, d.width || 1))
        .attr("fill", "none")
        .attr("opacity", 0.5)
        .append("title")
        .text((d) => {
          const sourceNode = d.source as { index: number };
          const targetNode = d.target as { index: number };
          return `${data.nodes[sourceNode.index].name} → ${
            data.nodes[targetNode.index].name
          }\n${d.value} events`;
        });

      // Draw nodes with colors from constants
      svg
        .append("g")
        .selectAll("rect")
        .data(nodes)
        .enter()
        .append("rect")
        .attr("x", (d) => d.x0 ?? 0)
        .attr("y", (d) => d.y0 ?? 0)
        .attr("height", (d) => (d.y1 ?? 0) - (d.y0 ?? 0))
        .attr("width", sankeyGenerator.nodeWidth())
        .attr("fill", (_, i) => colors[i % colors.length])
        .append("title")
        .text((d) => `${d.name}\n${d.value} events`);

      // Draw labels
      svg
        .append("g")
        .selectAll("text")
        .data(nodes)
        .enter()
        .append("text")
        .attr("x", (d) => {
          const x0 = d.x0 ?? 0;
          return x0 + (x0 < width / 2 ? 25 : -5);
        })
        .attr("y", (d) => ((d.y0 ?? 0) + (d.y1 ?? 0)) / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", (d) => ((d.x0 ?? 0) < width / 2 ? "start" : "end"))
        .text((d) => d.name)
        .style("font-size", "12px")
        .style("fill", "#333");
    } catch (error) {
      console.error("SankeyDiagram: Error generating Sankey diagram", error);
    }
  }, [data, dimensions]);

  return (
    <div ref={containerRef} className="w-full my-12">
      <h4 className="font-bold font-action text-xl">User Journeys</h4>
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        style={{ display: "block", width: "100%" }}
      ></svg>
    </div>
  );
};

export default SankeyDiagram;
