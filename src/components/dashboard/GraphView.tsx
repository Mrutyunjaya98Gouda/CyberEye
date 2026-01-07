import { useEffect, useRef, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Subdomain } from "@/types/subdomain";

interface GraphViewProps {
  subdomains: Subdomain[];
  targetDomain: string;
}

interface Node {
  id: string;
  label: string;
  type: "domain" | "subdomain" | "ip" | "cloud";
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
}

interface Edge {
  source: string;
  target: string;
}

export function GraphView({ subdomains, targetDomain }: GraphViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const nodesRef = useRef<Node[]>([]);
  const edgesRef = useRef<Edge[]>([]);

  const { nodes, edges } = useMemo(() => {
    const nodeMap = new Map<string, Node>();
    const edgeList: Edge[] = [];

    // Center domain node with wine/burgundy primary
    nodeMap.set(targetDomain, {
      id: targetDomain,
      label: targetDomain,
      type: "domain",
      x: 400,
      y: 300,
      vx: 0,
      vy: 0,
      color: "hsl(345, 80%, 45%)",
      size: 20,
    });

    // Add subdomain and IP nodes
    subdomains.forEach((sub, i) => {
      const angle = (i / subdomains.length) * Math.PI * 2;
      const radius = 150 + Math.random() * 100;

      nodeMap.set(sub.name, {
        id: sub.name,
        label: sub.name.split(".")[0],
        type: "subdomain",
        x: 400 + Math.cos(angle) * radius,
        y: 300 + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        color: sub.isAnomaly
          ? "hsl(0, 85%, 55%)"
          : sub.status === "active"
            ? "hsl(145, 70%, 40%)"
            : "hsl(0, 10%, 55%)",
        size: 8 + sub.riskScore / 20,
      });

      edgeList.push({ source: targetDomain, target: sub.name });

      // Add IP nodes if exist
      const primaryIp = sub.ipAddresses[0];
      if (primaryIp && !nodeMap.has(primaryIp)) {
        const ipAngle = angle + (Math.random() - 0.5) * 0.5;
        nodeMap.set(primaryIp, {
          id: primaryIp,
          label: primaryIp,
          type: "ip",
          x: 400 + Math.cos(ipAngle) * (radius + 80),
          y: 300 + Math.sin(ipAngle) * (radius + 80),
          vx: 0,
          vy: 0,
          color: "hsl(200, 100%, 50%)",
          size: 6,
        });
      }
      if (primaryIp) {
        edgeList.push({ source: sub.name, target: primaryIp });
      }

      // Add cloud provider node if exists
      if (sub.cloudProvider) {
        const cloudId = `cloud-${sub.cloudProvider}`;
        if (!nodeMap.has(cloudId)) {
          nodeMap.set(cloudId, {
            id: cloudId,
            label: sub.cloudProvider,
            type: "cloud",
            x: 400 + (Math.random() - 0.5) * 600,
            y: 300 + (Math.random() - 0.5) * 400,
            vx: 0,
            vy: 0,
            color: "hsl(45, 100%, 50%)",
            size: 12,
          });
        }
        edgeList.push({ source: sub.name, target: cloudId });
      }
    });

    return { nodes: Array.from(nodeMap.values()), edges: edgeList };
  }, [subdomains, targetDomain]);

  useEffect(() => {
    nodesRef.current = nodes.map((n) => ({ ...n }));
    edgesRef.current = edges;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    const simulate = () => {
      const currentNodes = nodesRef.current;
      const currentEdges = edgesRef.current;

      // Apply forces
      currentNodes.forEach((node, i) => {
        // Repulsion from other nodes
        currentNodes.forEach((other, j) => {
          if (i === j) return;
          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 500 / (dist * dist);
          node.vx += (dx / dist) * force;
          node.vy += (dy / dist) * force;
        });

        // Center gravity
        node.vx += (width / 2 - node.x) * 0.001;
        node.vy += (height / 2 - node.y) * 0.001;
      });

      // Apply edge springs
      currentEdges.forEach((edge) => {
        const source = currentNodes.find((n) => n.id === edge.source);
        const target = currentNodes.find((n) => n.id === edge.target);
        if (!source || !target) return;

        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - 100) * 0.01;

        source.vx += (dx / dist) * force;
        source.vy += (dy / dist) * force;
        target.vx -= (dx / dist) * force;
        target.vy -= (dy / dist) * force;
      });

      // Update positions
      currentNodes.forEach((node) => {
        node.vx *= 0.9;
        node.vy *= 0.9;
        node.x += node.vx;
        node.y += node.vy;
        node.x = Math.max(50, Math.min(width - 50, node.x));
        node.y = Math.max(50, Math.min(height - 50, node.y));
      });

      // Render with burgundy/wine theme
      ctx.fillStyle = "hsl(0, 10%, 4%)";
      ctx.fillRect(0, 0, width, height);

      // Draw grid with wine tint
      ctx.strokeStyle = "hsl(345, 20%, 12%)";
      ctx.lineWidth = 0.5;
      for (let x = 0; x < width; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw edges
      currentEdges.forEach((edge) => {
        const source = currentNodes.find((n) => n.id === edge.source);
        const target = currentNodes.find((n) => n.id === edge.target);
        if (!source || !target) return;

        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.strokeStyle = "hsl(150, 15%, 25%)";
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // Draw nodes
      currentNodes.forEach((node) => {
        // Glow
        const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.size * 2);
        gradient.addColorStop(0, node.color);
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size * 2, 0, Math.PI * 2);
        ctx.fill();

        // Node
        ctx.fillStyle = node.color;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
        ctx.fill();

        // Label
        ctx.fillStyle = "hsl(150, 100%, 95%)";
        ctx.font = `${node.type === "domain" ? 12 : 10}px "JetBrains Mono"`;
        ctx.textAlign = "center";
        ctx.fillText(node.label, node.x, node.y + node.size + 14);
      });

      animationRef.current = requestAnimationFrame(simulate);
    };

    simulate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [nodes, edges]);

  return (
    <Card className="border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden">
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <h3 className="font-mono text-sm text-primary">Network Topology</h3>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-success" />
              <span className="text-muted-foreground">Active</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-destructive" />
              <span className="text-muted-foreground">Anomaly</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-info" />
              <span className="text-muted-foreground">IP</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-accent" />
              <span className="text-muted-foreground">Cloud</span>
            </div>
          </div>
        </div>
      </div>
      <canvas ref={canvasRef} width={800} height={500} className="w-full h-[500px]" />
    </Card>
  );
}
