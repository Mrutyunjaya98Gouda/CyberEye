import { useState, Fragment } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Subdomain } from "@/types/subdomain";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  AlertTriangle,
  Cloud,
  Server,
  Shield,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SubdomainTableProps {
  subdomains: Subdomain[];
}

type SortKey = "name" | "status" | "riskScore" | "lastSeen";
type SortOrder = "asc" | "desc";

export function SubdomainTable({ subdomains }: SubdomainTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("riskScore");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("desc");
    }
  };

  const sortedSubdomains = [...subdomains].sort((a, b) => {
    let comparison = 0;
    switch (sortKey) {
      case "name":
        comparison = a.name.localeCompare(b.name);
        break;
      case "status":
        comparison = a.status.localeCompare(b.status);
        break;
      case "riskScore":
        comparison = a.riskScore - b.riskScore;
        break;
      case "lastSeen":
        comparison = new Date(a.lastSeen).getTime() - new Date(b.lastSeen).getTime();
        break;
    }
    return sortOrder === "asc" ? comparison : -comparison;
  });

  const SortIcon = ({ column }: { column: SortKey }) =>
    sortKey === column ? (
      sortOrder === "asc" ? (
        <ChevronUp className="h-3 w-3" />
      ) : (
        <ChevronDown className="h-3 w-3" />
      )
    ) : null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "success";
      case "inactive":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 70) return "text-destructive";
    if (score >= 40) return "text-accent";
    return "text-success";
  };

  return (
    <Card className="border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/50">
              {[
                { key: "name" as SortKey, label: "Subdomain" },
                { key: "status" as SortKey, label: "Status" },
                { key: "riskScore" as SortKey, label: "Risk" },
                { key: "lastSeen" as SortKey, label: "Last Seen" },
              ].map(({ key, label }) => (
                <th
                  key={key}
                  className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort(key)}
                >
                  <div className="flex items-center gap-1">
                    {label}
                    <SortIcon column={key} />
                  </div>
                </th>
              ))}
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Technologies
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Flags
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {sortedSubdomains.map((subdomain) => (
              <Fragment key={subdomain.id}>
                <tr
                  key={subdomain.id}
                  className={cn(
                    "hover:bg-secondary/30 transition-colors cursor-pointer",
                    expandedRow === subdomain.id && "bg-secondary/20"
                  )}
                  onClick={() => setExpandedRow(expandedRow === subdomain.id ? null : subdomain.id)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span className="font-mono text-sm text-foreground">{subdomain.name}</span>
                    </div>
                    {subdomain.ipAddresses.length > 0 && (
                      <span className="text-xs text-muted-foreground font-mono ml-6">
                        {subdomain.ipAddresses[0]}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={getStatusColor(subdomain.status) as any}>
                      {subdomain.status}
                    </Badge>
                    {(subdomain.httpStatus || subdomain.httpsStatus) && (
                      <span className="ml-2 text-xs text-muted-foreground font-mono">
                        HTTP {subdomain.httpsStatus || subdomain.httpStatus}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={cn("font-mono font-bold", getRiskColor(subdomain.riskScore))}>
                        {subdomain.riskScore}
                      </div>
                      <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            subdomain.riskScore >= 70
                              ? "bg-destructive"
                              : subdomain.riskScore >= 40
                                ? "bg-accent"
                                : "bg-success"
                          )}
                          style={{ width: `${subdomain.riskScore}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                    {new Date(subdomain.lastSeen).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {subdomain.technologies.slice(0, 3).map((tech) => (
                        <Badge key={tech} variant="secondary" className="text-xs">
                          {tech}
                        </Badge>
                      ))}
                      {subdomain.technologies.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{subdomain.technologies.length - 3}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {subdomain.isAnomaly && (
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      )}
                      {subdomain.cloudProvider && <Cloud className="h-4 w-4 text-info" />}
                      {subdomain.takeoverVulnerable && <Shield className="h-4 w-4 text-accent" />}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
                {expandedRow === subdomain.id && (
                  <tr key={`${subdomain.id}-expanded`} className="bg-secondary/10">
                    <td colSpan={7} className="px-4 py-4">
                      <div className="grid grid-cols-3 gap-6 text-sm animate-fade-in">
                        <div className="space-y-2">
                          <h4 className="text-xs font-medium text-muted-foreground uppercase">
                            DNS Records
                          </h4>
                          <div className="space-y-1">
                            {subdomain.ipAddresses.map((ip, i) => (
                              <div key={i} className="flex items-center gap-2 font-mono text-xs">
                                <Badge variant="outline" className="text-xs w-14 justify-center">
                                  A
                                </Badge>
                                <span className="text-muted-foreground truncate">{ip}</span>
                              </div>
                            ))}
                            {subdomain.cnameRecord && (
                              <div className="flex items-center gap-2 font-mono text-xs">
                                <Badge variant="outline" className="text-xs w-14 justify-center">
                                  CNAME
                                </Badge>
                                <span className="text-muted-foreground truncate">
                                  {subdomain.cnameRecord}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-xs font-medium text-muted-foreground uppercase">
                            Open Ports
                          </h4>
                          <div className="flex flex-wrap gap-1">
                            {subdomain.ports.map((portInfo, i) => (
                              <Badge key={i} variant="cyber" className="font-mono">
                                {portInfo.port}/{portInfo.service}
                              </Badge>
                            ))}
                            {subdomain.ports.length === 0 && (
                              <span className="text-xs text-muted-foreground">
                                No ports detected
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-xs font-medium text-muted-foreground uppercase">
                            Details
                          </h4>
                          <div className="space-y-1 text-xs">
                            {subdomain.server && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Server:</span>
                                <span className="font-mono">{subdomain.server}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">First Seen:</span>
                              <span className="font-mono">
                                {new Date(subdomain.firstSeen).toLocaleDateString()}
                              </span>
                            </div>
                            {subdomain.cloudProvider && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Cloud:</span>
                                <Badge variant="cloud">{subdomain.cloudProvider}</Badge>
                              </div>
                            )}
                            {subdomain.takeoverVulnerable && subdomain.takeoverType && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Takeover Risk:</span>
                                <Badge variant="destructive">{subdomain.takeoverType}</Badge>
                              </div>
                            )}
                            {subdomain.anomalyReason && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Anomaly:</span>
                                <span className="font-mono text-destructive">
                                  {subdomain.anomalyReason}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
