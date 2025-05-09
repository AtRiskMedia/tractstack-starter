import * as d3 from "d3";
import { sankey, sankeyLinkHorizontal } from "d3-sankey";
import { useEffect, useRef, useState } from "react";
import { colors } from "@/constants";

// Maximum height constraint for the diagram
const MAX_HEIGHT = 500;

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
    height: 500,
  });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const nodeCount = data.nodes.length || 1;
        // Height: 40px per node + 10px padding + 50px buffer
        const calculatedHeight = nodeCount * (40 + 10) + 50;
        // Apply maximum height constraint
        const constrainedHeight = Math.min(MAX_HEIGHT, calculatedHeight);
        setDimensions({ width: containerWidth, height: constrainedHeight });
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

    // Add margins to reserve space for labels
    const margin = { top: 20, bottom: 20 };
    const layoutHeight = height - margin.top - margin.bottom;

    const sankeyGenerator = sankey<Node, Link>()
      .nodeWidth(20)
      .nodePadding(10)
      .iterations(32)
      .extent([
        [0, margin.top],
        [width, layoutHeight],
      ]);

    try {
      const { nodes, links } = sankeyGenerator({
        nodes: data.nodes.map((d) => ({ ...d })),
        links: validLinks.map((d) => ({ ...d })),
      });

      // Calculate the actual vertical span of the layout
      const minY = nodes.reduce((min, node) => Math.min(min, node.y0 ?? 0), Infinity);
      const maxY = nodes.reduce((max, node) => Math.max(max, node.y1 ?? 0), 0);
      const actualHeight = maxY - minY;

      // If the layout exceeds the intended height, scale the y-positions
      let scale = 1;
      if (actualHeight > layoutHeight) {
        scale = layoutHeight / actualHeight;
      }

      // Apply scaling to node positions
      nodes.forEach((node) => {
        node.y0 = margin.top + (node.y0! - margin.top) * scale;
        node.y1 = margin.top + (node.y1! - margin.top) * scale;
      });

      // Update SVG dimensions and viewBox
      svg.attr("width", width).attr("height", height).attr("viewBox", `0 0 ${width} ${height}`);

      // Draw links with updated positions
      svg
        .append("g")
        .selectAll("path")
        .data(links)
        .enter()
        .append("path")
        .attr("d", sankeyLinkHorizontal())
        .attr("stroke", "#999")
        .attr("stroke-width", (d) => Math.max(1, (d.width || 1) * scale)) // Scale link width as well
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

      // Draw nodes with updated positions
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

      // Draw labels with updated positions
      svg
        .append("g")
        .selectAll("text")
        .data(nodes)
        .enter()
        .append("text")
        .attr("x", (d) => {
          const x0 = d.x0 ?? 0;
          return x0 < width / 2 ? x0 + sankeyGenerator.nodeWidth() + 5 : x0 - 5;
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
    <div ref={containerRef} className="w-full">
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        style={{ display: "block", width: "100%" }}
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        preserveAspectRatio="xMidYMid meet"
      ></svg>
    </div>
  );
};

export default SankeyDiagram;
