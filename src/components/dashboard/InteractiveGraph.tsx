import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Subdomain } from "@/types/subdomain";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Download,
  Play,
  Pause,
  Target,
  Sparkles,
  LayoutGrid,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface InteractiveGraphProps {
  subdomains: Subdomain[];
  targetDomain: string;
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  type: "domain" | "subdomain" | "ip" | "cloud" | "tech";
  status?: "active" | "inactive" | "anomaly" | "warning" | "takeover";
  riskScore?: number;
  size: number;
  cloudProvider?: string;
  technologies?: string[];
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  type?: "primary" | "secondary" | "cloud" | "tech";
}

type LayoutMode = "force" | "radial" | "cluster";
type ColorScheme = "status" | "risk" | "cloud";

export function InteractiveGraph({ subdomains, targetDomain }: InteractiveGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 900, height: 600 });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [isAnimating, setIsAnimating] = useState(true);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("force");
  const [colorScheme, setColorScheme] = useState<ColorScheme>("status");
  const [showLabels, setShowLabels] = useState(true);
  const [particlesEnabled, setParticlesEnabled] = useState(true);

  const getNodeColor = useCallback(
    (node: GraphNode): string => {
      if (node.type === "domain") return "#720e1e";
      if (node.type === "tech") return "#8b5cf6";
      if (node.type === "ip") return "#06b6d4";

      if (node.type === "cloud") {
        const colors: Record<string, string> = {
          aws: "#ff9900",
          azure: "#0078d4",
          gcp: "#4285f4",
          cloudflare: "#f38020",
          digitalocean: "#0080ff",
          heroku: "#6762a6",
          vercel: "#000000",
          netlify: "#00c7b7",
        };
        return colors[node.cloudProvider || ""] || "#ffcc00";
      }

      if (colorScheme === "risk" && node.riskScore !== undefined) {
        if (node.riskScore >= 70) return "#ef4444";
        if (node.riskScore >= 40) return "#f59e0b";
        return "#22c55e";
      }

      if (colorScheme === "cloud" && node.cloudProvider) {
        const colors: Record<string, string> = {
          aws: "#ff9900",
          azure: "#0078d4",
          gcp: "#4285f4",
          cloudflare: "#f38020",
        };
        return colors[node.cloudProvider] || "#6366f1";
      }

      // Status-based coloring
      if (node.status === "takeover") return "#dc2626";
      if (node.status === "anomaly") return "#ef4444";
      if (node.status === "warning") return "#f59e0b";
      if (node.status === "active") return "#22c55e";
      return "#6b7280";
    },
    [colorScheme]
  );

  const getNodeSize = (node: GraphNode): number => {
    if (node.type === "domain") return 40;
    if (node.type === "cloud") return 22;
    if (node.type === "tech") return 16;
    if (node.type === "ip") return 14;

    // Size based on risk score
    const baseSize = 16;
    const riskBonus = (node.riskScore || 0) / 15;
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
      size: 40,
    });
    nodeSet.add(targetDomain);

    // Cloud provider & technology aggregation
    const cloudProviders = new Map<string, number>();
    const technologies = new Map<string, number>();

    subdomains.forEach((sub) => {
      // Determine status
      const status = sub.takeoverVulnerable
        ? "takeover"
        : sub.isAnomaly
          ? "anomaly"
          : sub.riskScore >= 70
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
        cloudProvider: sub.cloudProvider || undefined,
        technologies: sub.technologies,
        size: getNodeSize({ type: "subdomain", riskScore: sub.riskScore } as GraphNode),
      });
      nodeSet.add(sub.name);

      // Link subdomain to domain
      links.push({ source: targetDomain, target: sub.name, type: "primary" });

      // Add IP nodes (limit to 1 per subdomain for cleaner graph)
      if (sub.ipAddresses.length > 0) {
        const ip = sub.ipAddresses[0];
        if (!nodeSet.has(ip)) {
          nodes.push({
            id: ip,
            label: ip,
            type: "ip",
            size: 14,
          });
          nodeSet.add(ip);
        }
        links.push({ source: sub.name, target: ip, type: "secondary" });
      }

      // Track cloud providers
      if (sub.cloudProvider) {
        cloudProviders.set(sub.cloudProvider, (cloudProviders.get(sub.cloudProvider) || 0) + 1);
      }

      // Track technologies
      sub.technologies.slice(0, 2).forEach((tech) => {
        technologies.set(tech, (technologies.get(tech) || 0) + 1);
      });
    });

    // Add cloud provider nodes
    cloudProviders.forEach((count, provider) => {
      if (count >= 2) {
        // Only show if 2+ subdomains use it
        const cloudId = `cloud-${provider}`;
        nodes.push({
          id: cloudId,
          label: provider.toUpperCase(),
          type: "cloud",
          cloudProvider: provider,
          size: 22 + Math.min(count * 2, 12),
        });
        nodeSet.add(cloudId);

        // Link subdomains to their cloud provider
        subdomains.forEach((sub) => {
          if (sub.cloudProvider === provider) {
            links.push({ source: sub.name, target: cloudId, type: "cloud" });
          }
        });
      }
    });

    // Add technology nodes (top 5 most common)
    const sortedTechs = [...technologies.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

    sortedTechs.forEach(([tech, count]) => {
      if (count >= 2) {
        const techId = `tech-${tech}`;
        nodes.push({
          id: techId,
          label: tech,
          type: "tech",
          size: 16 + Math.min(count, 8),
        });
        nodeSet.add(techId);

        subdomains.forEach((sub) => {
          if (sub.technologies.includes(tech)) {
            links.push({ source: sub.name, target: techId, type: "tech" });
          }
        });
      }
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
    if (simulationRef.current) {
      simulationRef.current.alpha(1).restart();
    }
  };

  const handleToggleAnimation = () => {
    if (simulationRef.current) {
      if (isAnimating) {
        simulationRef.current.stop();
      } else {
        simulationRef.current.alpha(0.3).restart();
      }
      setIsAnimating(!isAnimating);
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

  const handleFocusNode = (nodeId: string) => {
    if (!svgRef.current || !zoomRef.current || !simulationRef.current) return;

    const nodes = simulationRef.current.nodes();
    const node = nodes.find((n) => n.id === nodeId);

    if (node && node.x !== undefined && node.y !== undefined) {
      const { width, height } = dimensions;
      const scale = 2;
      const x = width / 2 - node.x * scale;
      const y = height / 2 - node.y * scale;

      d3.select(svgRef.current)
        .transition()
        .duration(750)
        .call(zoomRef.current.transform, d3.zoomIdentity.translate(x, y).scale(scale));
    }
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
      .scaleExtent([0.1, 5])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    zoomRef.current = zoom;
    svg.call(zoom);

    // Main group for zoom/pan
    const g = svg.append("g");

    // Create gradient definitions
    const defs = svg.append("defs");

    // Animated gradient for domain node
    const domainGradient = defs
      .append("radialGradient")
      .attr("id", "domainGradient")
      .attr("cx", "30%")
      .attr("cy", "30%");

    domainGradient.append("stop").attr("offset", "0%").attr("stop-color", "#a01a2d");

    domainGradient.append("stop").attr("offset", "100%").attr("stop-color", "#720e1e");

    // Glow filter
    const glowFilter = defs
      .append("filter")
      .attr("id", "glow")
      .attr("x", "-100%")
      .attr("y", "-100%")
      .attr("width", "300%")
      .attr("height", "300%");

    glowFilter.append("feGaussianBlur").attr("stdDeviation", "4").attr("result", "coloredBlur");

    const feMerge = glowFilter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Stronger glow for high-risk nodes
    const strongGlowFilter = defs
      .append("filter")
      .attr("id", "strongGlow")
      .attr("x", "-100%")
      .attr("y", "-100%")
      .attr("width", "300%")
      .attr("height", "300%");

    strongGlowFilter
      .append("feGaussianBlur")
      .attr("stdDeviation", "8")
      .attr("result", "coloredBlur");

    const strongFeMerge = strongGlowFilter.append("feMerge");
    strongFeMerge.append("feMergeNode").attr("in", "coloredBlur");
    strongFeMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Particle effect pattern
    if (particlesEnabled) {
      const particleGroup = g.append("g").attr("class", "particles");

      // Create floating particles
      for (let i = 0; i < 30; i++) {
        particleGroup
          .append("circle")
          .attr("cx", Math.random() * width)
          .attr("cy", Math.random() * height)
          .attr("r", Math.random() * 2 + 0.5)
          .attr("fill", `rgba(0, 255, 153, ${Math.random() * 0.3 + 0.1})`)
          .attr("class", "particle");
      }

      // Animate particles
      const animateParticles = () => {
        particleGroup
          .selectAll(".particle")
          .transition()
          .duration(3000 + Math.random() * 2000)
          .ease(d3.easeLinear)
          .attr("cy", function () {
            return parseFloat(d3.select(this).attr("cy")) - 50 - Math.random() * 50;
          })
          .attr("opacity", 0)
          .on("end", function () {
            d3.select(this)
              .attr("cy", height + 10)
              .attr("cx", Math.random() * width)
              .attr("opacity", Math.random() * 0.3 + 0.1)
              .transition()
              .duration(0)
              .on("end", animateParticles);
          });
      };

      animateParticles();
    }

    // Create force simulation based on layout mode
    const simulation = d3.forceSimulation<GraphNode>(nodes);

    if (layoutMode === "force") {
      simulation
        .force(
          "link",
          d3
            .forceLink<GraphNode, GraphLink>(links)
            .id((d) => d.id)
            .distance((d) => {
              const source = d.source as GraphNode;
              const target = d.target as GraphNode;
              if (source.type === "domain") return 180;
              if (d.type === "cloud") return 150;
              if (d.type === "tech") return 130;
              if (target.type === "ip") return 80;
              return 100;
            })
            .strength((d) => (d.type === "primary" ? 1 : 0.5))
        )
        .force("charge", d3.forceManyBody().strength(-500))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force(
          "collision",
          d3.forceCollide().radius((d) => (d as GraphNode).size + 15)
        );
    } else if (layoutMode === "radial") {
      simulation
        .force(
          "link",
          d3
            .forceLink<GraphNode, GraphLink>(links)
            .id((d) => d.id)
            .distance(120)
        )
        .force("charge", d3.forceManyBody().strength(-200))
        .force(
          "r",
          d3.forceRadial(200, width / 2, height / 2).strength((d) => {
            if ((d as GraphNode).type === "domain") return 0;
            if ((d as GraphNode).type === "cloud" || (d as GraphNode).type === "tech") return 0.8;
            return 0.5;
          })
        )
        .force(
          "collision",
          d3.forceCollide().radius((d) => (d as GraphNode).size + 8)
        );
    } else if (layoutMode === "cluster") {
      simulation
        .force(
          "link",
          d3
            .forceLink<GraphNode, GraphLink>(links)
            .id((d) => d.id)
            .distance(80)
        )
        .force("charge", d3.forceManyBody().strength(-300))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("x", d3.forceX(width / 2).strength(0.1))
        .force("y", d3.forceY(height / 2).strength(0.1))
        .force(
          "collision",
          d3.forceCollide().radius((d) => (d as GraphNode).size + 12)
        );
    }

    simulationRef.current = simulation;

    // Draw links with gradient colors
    const link = g
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke", (d) => {
        if (d.type === "cloud") return "#f59e0b40";
        if (d.type === "tech") return "#8b5cf640";
        if (d.type === "secondary") return "#06b6d430";
        return "#ffffff20";
      })
      .attr("stroke-width", (d) => (d.type === "primary" ? 2 : 1))
      .attr("stroke-dasharray", (d) => (d.type === "secondary" ? "4,4" : "none"));

    // Animated link pulses for high-risk connections
    const pulseLinks = links.filter((l) => {
      const target = l.target as GraphNode;
      return target.status === "takeover" || target.status === "anomaly";
    });

    const animatedLinks = g
      .append("g")
      .attr("class", "animated-links")
      .selectAll("line")
      .data(pulseLinks)
      .enter()
      .append("line")
      .attr("stroke", "#ef4444")
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 0);

    // Pulse animation
    const pulseAnimation = () => {
      animatedLinks
        .transition()
        .duration(1000)
        .attr("stroke-opacity", 0.8)
        .transition()
        .duration(1000)
        .attr("stroke-opacity", 0)
        .on("end", pulseAnimation);
    };

    if (pulseLinks.length > 0) {
      pulseAnimation();
    }

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

    // Node circles with enhanced styling (must be created BEFORE pulse rings)
    node
      .append("circle")
      .attr("class", "main-circle")
      .attr("r", (d) => d.size)
      .attr("fill", (d) => (d.type === "domain" ? "url(#domainGradient)" : getNodeColor(d)))
      .attr("filter", (d) => (d.riskScore && d.riskScore >= 70 ? "url(#strongGlow)" : "url(#glow)"))
      .attr("stroke", (d) => (d.type === "domain" ? "#a01a2d" : "rgba(255,255,255,0.1)"))
      .attr("stroke-width", (d) => (d.type === "domain" ? 4 : 1))
      .on("mouseover", function (event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("r", d.size * 1.4)
          .attr("stroke-width", 3)
          .attr("stroke", "#fff");
        setHoveredNode(d);

        // Highlight connected links
        link.attr("stroke-opacity", (l) => {
          const s = l.source as GraphNode;
          const t = l.target as GraphNode;
          return s.id === d.id || t.id === d.id ? 1 : 0.1;
        });
      })
      .on("mouseout", function (event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("r", d.size)
          .attr("stroke-width", d.type === "domain" ? 4 : 1)
          .attr("stroke", d.type === "domain" ? "#a01a2d" : "rgba(255,255,255,0.1)");
        setHoveredNode(null);

        link.attr("stroke-opacity", 0.6);
      })
      .on("click", (event, d) => {
        setSelectedNode(d);
        handleFocusNode(d.id);
      });

    // Outer glow ring for high-risk nodes (created AFTER main circles)
    const pulseRings = node
      .filter((d) => d.status === "takeover" || d.status === "anomaly")
      .append("circle")
      .attr("class", "pulse-ring")
      .attr("r", (d) => d.size + 8)
      .attr("fill", "none")
      .attr("stroke", (d) => (d.status === "takeover" ? "#dc2626" : "#ef4444"))
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 0.5);

    // Animate pulse ring - using stored data instead of DOM queries
    const animatePulseRings = () => {
      pulseRings.each(function (d) {
        const ring = d3.select(this);
        const baseSize = d.size;

        ring
          .transition()
          .duration(1500)
          .attr("r", baseSize + 20)
          .attr("stroke-opacity", 0)
          .transition()
          .duration(0)
          .attr("r", baseSize + 8)
          .attr("stroke-opacity", 0.5)
          .on("end", function () {
            // Continue animation
            animatePulseRings();
          });
      });
    };

    // Only start animation if there are pulse rings
    if (!pulseRings.empty()) {
      setTimeout(animatePulseRings, 100);
    }

    // Node type icons/indicators
    node
      .filter((d) => d.type === "cloud")
      .append("text")
      .text("☁")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("fill", "#fff")
      .attr("font-size", "12px")
      .attr("pointer-events", "none");

    node
      .filter((d) => d.type === "tech")
      .append("text")
      .text("⚙")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("fill", "#fff")
      .attr("font-size", "10px")
      .attr("pointer-events", "none");

    node
      .filter((d) => d.status === "takeover")
      .append("text")
      .text("⚠")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("fill", "#fff")
      .attr("font-size", (d) => `${d.size * 0.8}px`)
      .attr("pointer-events", "none");

    // Node labels
    if (showLabels) {
      node
        .append("text")
        .text((d) => (d.label.length > 18 ? d.label.substring(0, 16) + "..." : d.label))
        .attr("dy", (d) => d.size + 16)
        .attr("text-anchor", "middle")
        .attr("fill", "#e0e0e0")
        .attr("font-size", (d) => (d.type === "domain" ? "13px" : "10px"))
        .attr("font-weight", (d) => (d.type === "domain" ? "bold" : "normal"))
        .attr("font-family", "JetBrains Mono, monospace")
        .attr("pointer-events", "none")
        .attr("opacity", 0.9);
    }

    // Tick function
    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as GraphNode).x!)
        .attr("y1", (d) => (d.source as GraphNode).y!)
        .attr("x2", (d) => (d.target as GraphNode).x!)
        .attr("y2", (d) => (d.target as GraphNode).y!);

      animatedLinks
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
        const scale = 0.75 / Math.max(fullWidth / width, fullHeight / height);
        const tx = (width - fullWidth * scale) / 2 - bounds.x * scale;
        const ty = (height - fullHeight * scale) / 2 - bounds.y * scale;

        svg
          .transition()
          .duration(1000)
          .call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
      }
    }, 800);

    return () => {
      simulation.stop();
    };
  }, [
    subdomains,
    targetDomain,
    dimensions,
    buildGraphData,
    getNodeColor,
    layoutMode,
    showLabels,
    particlesEnabled,
  ]);

  // Update dimensions on resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: 650,
        });
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Stats
  const stats = {
    total: subdomains.length,
    active: subdomains.filter((s) => s.status === "active").length,
    anomalies: subdomains.filter((s) => s.isAnomaly).length,
    takeover: subdomains.filter((s) => s.takeoverVulnerable).length,
    warning: subdomains.filter((s) => !s.takeoverVulnerable && !s.isAnomaly && s.riskScore >= 70)
      .length,
    cloud: subdomains.filter((s) => s.cloudProvider).length,
  };

  return (
    <Card className="border-border bg-card/30 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <h3 className="font-mono text-sm text-primary flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Network Topology
          </h3>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#22c55e] shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
              <span className="text-muted-foreground">Active ({stats.active})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444] shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
              <span className="text-muted-foreground">Anomaly ({stats.anomalies})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#dc2626] animate-pulse shadow-[0_0_8px_rgba(220,38,38,0.8)]" />
              <span className="text-muted-foreground">Takeover ({stats.takeover})</span>
            </div>
            {stats.warning > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
                <span className="text-muted-foreground">Warning ({stats.warning})</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#ff9900]" />
              <span className="text-muted-foreground">Cloud ({stats.cloud})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#8b5cf6]" />
              <span className="text-muted-foreground">Tech</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#06b6d4]" />
              <span className="text-muted-foreground">IP</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select value={layoutMode} onValueChange={(v: LayoutMode) => setLayoutMode(v)}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <LayoutGrid className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="force">Force</SelectItem>
              <SelectItem value="radial">Radial</SelectItem>
              <SelectItem value="cluster">Cluster</SelectItem>
            </SelectContent>
          </Select>

          <Select value={colorScheme} onValueChange={(v: ColorScheme) => setColorScheme(v)}>
            <SelectTrigger className="w-[100px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="risk">Risk</SelectItem>
              <SelectItem value="cloud">Cloud</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1 border-l border-border pl-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleToggleAnimation}>
              {isAnimating ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleExport}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Graph Container */}
      <div ref={containerRef} className="relative graph-container">
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="w-full"
          style={{
            background: "radial-gradient(ellipse at center, #0a0a0a 0%, #050505 100%)",
          }}
        />

        {subdomains.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="bg-card/90 backdrop-blur-sm p-6 rounded-xl border border-dashed border-border flex flex-col items-center gap-4 max-w-md text-center">
              <div className="h-16 w-16 rounded-full bg-secondary/30 flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-medium text-foreground">No Network Data</h3>
                <p className="text-sm text-muted-foreground">
                  Start a scan or load a previous scan to visualize the network topology graph.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Hover tooltip */}
        {hoveredNode && (
          <div
            className="absolute top-4 right-4 p-3 bg-card/95 backdrop-blur-md border border-border rounded-lg shadow-xl"
            style={{ minWidth: "200px" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getNodeColor(hoveredNode) }}
              />
              <span className="font-mono text-xs text-primary uppercase">{hoveredNode.type}</span>
            </div>
            <div className="text-sm text-foreground font-medium truncate">{hoveredNode.id}</div>
            {hoveredNode.riskScore !== undefined && (
              <div className="flex items-center justify-between mt-2 text-xs">
                <span className="text-muted-foreground">Risk Score</span>
                <Badge
                  variant={
                    hoveredNode.riskScore >= 70
                      ? "destructive"
                      : hoveredNode.riskScore >= 40
                        ? "warning"
                        : "success"
                  }
                >
                  {hoveredNode.riskScore}
                </Badge>
              </div>
            )}
            {hoveredNode.cloudProvider && (
              <div className="flex items-center justify-between mt-1 text-xs">
                <span className="text-muted-foreground">Cloud</span>
                <span className="text-foreground">{hoveredNode.cloudProvider.toUpperCase()}</span>
              </div>
            )}
            {hoveredNode.technologies && hoveredNode.technologies.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {hoveredNode.technologies.slice(0, 3).map((tech) => (
                  <Badge key={tech} variant="secondary" className="text-xs">
                    {tech}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Selected Node Panel */}
        {selectedNode && (
          <div className="absolute bottom-4 left-4 p-4 bg-card/95 backdrop-blur-md border border-border rounded-lg shadow-xl max-w-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: getNodeColor(selectedNode) }}
                />
                <span className="font-mono text-xs text-primary uppercase">
                  {selectedNode.type}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setSelectedNode(null)}
              >
                ×
              </Button>
            </div>
            <div className="text-base text-foreground font-medium break-all">{selectedNode.id}</div>

            {selectedNode.type === "subdomain" && (
              <div className="mt-3 space-y-2 text-xs">
                {selectedNode.riskScore !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Risk Score</span>
                    <Badge
                      variant={
                        selectedNode.riskScore >= 70
                          ? "destructive"
                          : selectedNode.riskScore >= 40
                            ? "warning"
                            : "success"
                      }
                    >
                      {selectedNode.riskScore}/100
                    </Badge>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge
                    variant={
                      selectedNode.status === "active"
                        ? "success"
                        : selectedNode.status === "takeover"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {selectedNode.status}
                  </Badge>
                </div>
                {selectedNode.cloudProvider && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Cloud Provider</span>
                    <span className="text-foreground font-mono">
                      {selectedNode.cloudProvider.toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="mt-3 pt-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => handleFocusNode(selectedNode.id)}
              >
                <Target className="h-3 w-3 mr-1" />
                Focus Node
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
