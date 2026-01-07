import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Subdomain } from "@/types/subdomain";
import { ZoomIn, ZoomOut, Maximize2, RotateCcw, Download } from "lucide-react";

interface InteractiveGraphProps {
  subdomains: Subdomain[];
  targetDomain: string;
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  type: "domain" | "subdomain" | "ip" | "cloud";
  status?: "active" | "inactive" | "anomaly" | "warning";
  riskScore?: number;
  size: number;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
}

export function InteractiveGraph({ subdomains, targetDomain }: InteractiveGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 900, height: 600 });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const getNodeColor = (node: GraphNode): string => {
    if (node.type === "domain") return "#720e1e"; // Wine red
    if (node.type === "ip") return "#505050"; // Grey
    if (node.type === "cloud") return "#ffcc00"; // Yellow/warning

    // Subdomain colors based on status
    if (node.status === "anomaly") return "#ff3333"; // Red
    if (node.status === "warning") return "#ffcc00"; // Yellow
    if (node.status === "active") return "#00ff99"; // Green
    return "#505050"; // Inactive/grey
  };

  const getNodeSize = (node: GraphNode): number => {
    if (node.type === "domain") return 35;
    if (node.type === "cloud") return 18;
    if (node.type === "ip") return 12;

    // Size based on risk score
    const baseSize = 14;
    const riskBonus = (node.riskScore || 0) / 20;
    return baseSize + riskBonus;
  };

  const buildGraphData = useCallback(() => {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const nodeSet = new Set<string>();

    // Central domain node
    nodes.push({
      id: targetDomain,
      label: targetDomain,
      type: "domain",
      size: 35,
    });
    nodeSet.add(targetDomain);

    // Cloud provider aggregation
    const cloudProviders = new Map<string, number>();

    subdomains.forEach((sub) => {
      // Add subdomain node
      const status = sub.isAnomaly
        ? "anomaly"
        : sub.takeoverVulnerable
          ? "warning"
          : sub.status === "active"
            ? "active"
            : "inactive";

      nodes.push({
        id: sub.name,
        label: sub.name.replace(`.${targetDomain}`, ""),
        type: "subdomain",
        status,
        riskScore: sub.riskScore,
        size: getNodeSize({ type: "subdomain", riskScore: sub.riskScore } as GraphNode),
      });
      nodeSet.add(sub.name);

      // Link subdomain to domain
      links.push({ source: targetDomain, target: sub.name });

      // Add IP nodes
      sub.ipAddresses.slice(0, 2).forEach((ip) => {
        if (!nodeSet.has(ip)) {
          nodes.push({
            id: ip,
            label: ip,
            type: "ip",
            size: 12,
          });
          nodeSet.add(ip);
        }
        links.push({ source: sub.name, target: ip });
      });

      // Track cloud providers
      if (sub.cloudProvider) {
        cloudProviders.set(sub.cloudProvider, (cloudProviders.get(sub.cloudProvider) || 0) + 1);
      }
    });

    // Add cloud provider nodes
    cloudProviders.forEach((count, provider) => {
      const cloudId = `cloud-${provider}`;
      nodes.push({
        id: cloudId,
        label: provider.toUpperCase(),
        type: "cloud",
        size: 18 + Math.min(count * 2, 10),
      });
      nodeSet.add(cloudId);

      // Link subdomains to their cloud provider
      subdomains.forEach((sub) => {
        if (sub.cloudProvider === provider) {
          links.push({ source: sub.name, target: cloudId });
        }
      });
    });

    return { nodes, links };
  }, [subdomains, targetDomain]);

  const handleZoomIn = () => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 1.5);
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 0.67);
    }
  };

  const handleReset = () => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(500)
        .call(zoomRef.current.transform, d3.zoomIdentity);
    }
  };

  const handleExport = () => {
    if (!svgRef.current) return;

    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${targetDomain}-network-graph.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (!svgRef.current || subdomains.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { width, height } = dimensions;
    const { nodes, links } = buildGraphData();

    // Create zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    zoomRef.current = zoom;
    svg.call(zoom);

    // Main group for zoom/pan
    const g = svg.append("g");

    // Add radial gradient for glow effect
    const defs = svg.append("defs");

    const glowFilter = defs
      .append("filter")
      .attr("id", "glow")
      .attr("x", "-50%")
      .attr("y", "-50%")
      .attr("width", "200%")
      .attr("height", "200%");

    glowFilter.append("feGaussianBlur").attr("stdDeviation", "4").attr("result", "coloredBlur");

    const feMerge = glowFilter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Create simulation
    const simulation = d3
      .forceSimulation<GraphNode>(nodes)
      .force(
        "link",
        d3
          .forceLink<GraphNode, GraphLink>(links)
          .id((d) => d.id)
          .distance((d) => {
            const source = d.source as GraphNode;
            const target = d.target as GraphNode;
            if (source.type === "domain") return 150;
            if (target.type === "ip") return 80;
            if (target.type === "cloud") return 120;
            return 100;
          })
      )
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "collision",
        d3.forceCollide().radius((d) => (d as GraphNode).size + 10)
      );

    simulationRef.current = simulation;

    // Draw links
    const link = g
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke", "#2a1515")
      .attr("stroke-width", 1)
      .attr("stroke-opacity", 0.6);

    // Draw nodes
    const node = g
      .append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(nodes)
      .enter()
      .append("g")
      .attr("cursor", "pointer")
      .call(
        d3
          .drag<SVGGElement, GraphNode>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    // Node circles
    node
      .append("circle")
      .attr("r", (d) => d.size)
      .attr("fill", (d) => getNodeColor(d))
      .attr("filter", "url(#glow)")
      .attr("stroke", (d) => (d.type === "domain" ? "#a01a2d" : "none"))
      .attr("stroke-width", (d) => (d.type === "domain" ? 3 : 0))
      .on("mouseover", function (event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("r", d.size * 1.3);
        setSelectedNode(d);
      })
      .on("mouseout", function (event, d) {
        d3.select(this).transition().duration(200).attr("r", d.size);
      })
      .on("click", (event, d) => {
        setSelectedNode(d);
      });

    // Node labels
    node
      .append("text")
      .text((d) => (d.label.length > 20 ? d.label.substring(0, 18) + "..." : d.label))
      .attr("dy", (d) => d.size + 14)
      .attr("text-anchor", "middle")
      .attr("fill", "#e0e0e0")
      .attr("font-size", (d) => (d.type === "domain" ? "12px" : "10px"))
      .attr("font-family", "JetBrains Mono, monospace")
      .attr("pointer-events", "none");

    // Tick function
    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as GraphNode).x!)
        .attr("y1", (d) => (d.source as GraphNode).y!)
        .attr("x2", (d) => (d.target as GraphNode).x!)
        .attr("y2", (d) => (d.target as GraphNode).y!);

      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    // Initial zoom to fit
    setTimeout(() => {
      const bounds = g.node()?.getBBox();
      if (bounds) {
        const fullWidth = bounds.width;
        const fullHeight = bounds.height;
        const scale = 0.8 / Math.max(fullWidth / width, fullHeight / height);
        const tx = (width - fullWidth * scale) / 2 - bounds.x * scale;
        const ty = (height - fullHeight * scale) / 2 - bounds.y * scale;

        svg
          .transition()
          .duration(750)
          .call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
      }
    }, 500);

    return () => {
      simulation.stop();
    };
  }, [subdomains, targetDomain, dimensions, buildGraphData]);

  // Update dimensions on resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: 600,
        });
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <Card className="border-border bg-card/30 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="font-mono text-sm text-primary">Network Topology</h3>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-accent-green" />
              <span className="text-muted-foreground">Active</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-accent-red" />
              <span className="text-muted-foreground">Anomaly</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-accent-yellow" />
              <span className="text-muted-foreground">Warning</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-muted-foreground" />
              <span className="text-muted-foreground">IP/Inactive</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleReset}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleExport}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Graph Container */}
      <div ref={containerRef} className="relative graph-container">
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="w-full"
          style={{ background: "#050505" }}
        />

        {/* Selected Node Info */}
        {selectedNode && (
          <div className="absolute bottom-4 left-4 p-3 bg-card/90 backdrop-blur-sm border border-border rounded-lg max-w-xs">
            <div className="font-mono text-xs text-primary mb-1">
              {selectedNode.type.toUpperCase()}
            </div>
            <div className="text-sm text-foreground font-medium truncate">{selectedNode.id}</div>
            {selectedNode.riskScore !== undefined && (
              <div className="text-xs text-muted-foreground mt-1">
                Risk Score: <span className="text-accent-red">{selectedNode.riskScore}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
