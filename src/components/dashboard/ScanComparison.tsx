import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { GitCompare, Plus, Minus, Equal, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ScanData {
  id: string;
  target_domain: string;
  created_at: string;
  total_subdomains: number;
  active_subdomains: number;
  anomalies: number;
  cloud_assets: number;
  takeover_vulnerable: number;
  subdomains?: string[];
}

interface ComparisonResult {
  added: string[];
  removed: string[];
  unchanged: number;
  statsChange: {
    total: number;
    active: number;
    anomalies: number;
    cloud: number;
    takeover: number;
  };
}

export function ScanComparison() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [scans, setScans] = useState<ScanData[]>([]);
  const [scan1, setScan1] = useState<string>("");
  const [scan2, setScan2] = useState<string>("");
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      fetchScans();
    }
  }, [isOpen, user]);

  const fetchScans = async () => {
    const { data, error } = await supabase
      .from("scans")
      .select(
        "id, target_domain, created_at, total_subdomains, active_subdomains, anomalies, cloud_assets, takeover_vulnerable"
      )
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      toast.error("Failed to load scans");
      return;
    }

    setScans(data || []);
  };

  const compareScans = async () => {
    if (!scan1 || !scan2) {
      toast.error("Please select two scans to compare");
      return;
    }

    setIsLoading(true);

    try {
      // Fetch subdomains for both scans
      const [{ data: subs1 }, { data: subs2 }] = await Promise.all([
        supabase.from("subdomains").select("name").eq("scan_id", scan1),
        supabase.from("subdomains").select("name").eq("scan_id", scan2),
      ]);

      const names1 = new Set((subs1 || []).map((s) => s.name));
      const names2 = new Set((subs2 || []).map((s) => s.name));

      // Calculate differences
      const added = [...names2].filter((n) => !names1.has(n));
      const removed = [...names1].filter((n) => !names2.has(n));
      const unchanged = [...names1].filter((n) => names2.has(n)).length;

      // Get scan stats
      const scanData1 = scans.find((s) => s.id === scan1);
      const scanData2 = scans.find((s) => s.id === scan2);

      const statsChange = {
        total: (scanData2?.total_subdomains || 0) - (scanData1?.total_subdomains || 0),
        active: (scanData2?.active_subdomains || 0) - (scanData1?.active_subdomains || 0),
        anomalies: (scanData2?.anomalies || 0) - (scanData1?.anomalies || 0),
        cloud: (scanData2?.cloud_assets || 0) - (scanData1?.cloud_assets || 0),
        takeover: (scanData2?.takeover_vulnerable || 0) - (scanData1?.takeover_vulnerable || 0),
      };

      setComparison({ added, removed, unchanged, statsChange });
    } catch (error) {
      toast.error("Failed to compare scans");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const StatChange = ({ label, value }: { label: string; value: number }) => (
    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        {value > 0 ? (
          <>
            <TrendingUp className="h-4 w-4 text-accent-green" />
            <span className="text-accent-green font-mono">+{value}</span>
          </>
        ) : value < 0 ? (
          <>
            <TrendingDown className="h-4 w-4 text-accent-red" />
            <span className="text-accent-red font-mono">{value}</span>
          </>
        ) : (
          <>
            <Equal className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground font-mono">0</span>
          </>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <GitCompare className="h-4 w-4 mr-2" />
          Compare Scans
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-primary font-mono">Compare Scans</DialogTitle>
          <DialogDescription>Select two scans to compare and see what changed</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Scan Selectors */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Baseline Scan (older)</label>
              <Select value={scan1} onValueChange={setScan1}>
                <SelectTrigger className="bg-muted/30">
                  <SelectValue placeholder="Select scan..." />
                </SelectTrigger>
                <SelectContent>
                  {scans.map((scan) => (
                    <SelectItem key={scan.id} value={scan.id}>
                      <div className="flex flex-col">
                        <span className="font-mono text-xs">{scan.target_domain}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(scan.created_at)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Comparison Scan (newer)</label>
              <Select value={scan2} onValueChange={setScan2}>
                <SelectTrigger className="bg-muted/30">
                  <SelectValue placeholder="Select scan..." />
                </SelectTrigger>
                <SelectContent>
                  {scans.map((scan) => (
                    <SelectItem key={scan.id} value={scan.id}>
                      <div className="flex flex-col">
                        <span className="font-mono text-xs">{scan.target_domain}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(scan.created_at)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            variant="cyber"
            className="w-full"
            onClick={compareScans}
            disabled={!scan1 || !scan2 || isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <GitCompare className="h-4 w-4 mr-2" />
            )}
            Compare
          </Button>

          {/* Results */}
          {comparison && (
            <div className="space-y-4 animate-fade-in">
              {/* Stats Changes */}
              <Card className="p-4 bg-muted/20 border-border">
                <h4 className="font-mono text-sm text-primary mb-3">Statistics Changes</h4>
                <div className="grid gap-2">
                  <StatChange label="Total Subdomains" value={comparison.statsChange.total} />
                  <StatChange label="Active" value={comparison.statsChange.active} />
                  <StatChange label="Anomalies" value={comparison.statsChange.anomalies} />
                  <StatChange label="Cloud Assets" value={comparison.statsChange.cloud} />
                  <StatChange label="Takeover Risks" value={comparison.statsChange.takeover} />
                </div>
              </Card>

              {/* Summary */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <Card className="p-4 bg-accent-green/10 border-accent-green/30">
                  <Plus className="h-5 w-5 text-accent-green mx-auto mb-2" />
                  <div className="text-2xl font-bold text-accent-green">
                    {comparison.added.length}
                  </div>
                  <div className="text-xs text-muted-foreground">New</div>
                </Card>
                <Card className="p-4 bg-accent-red/10 border-accent-red/30">
                  <Minus className="h-5 w-5 text-accent-red mx-auto mb-2" />
                  <div className="text-2xl font-bold text-accent-red">
                    {comparison.removed.length}
                  </div>
                  <div className="text-xs text-muted-foreground">Removed</div>
                </Card>
                <Card className="p-4 bg-muted/30 border-border">
                  <Equal className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
                  <div className="text-2xl font-bold">{comparison.unchanged}</div>
                  <div className="text-xs text-muted-foreground">Unchanged</div>
                </Card>
              </div>

              {/* New Subdomains */}
              {comparison.added.length > 0 && (
                <Card className="p-4 bg-muted/20 border-border">
                  <h4 className="font-mono text-sm text-accent-green mb-3 flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    New Subdomains ({comparison.added.length})
                  </h4>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                    {comparison.added.slice(0, 50).map((name) => (
                      <Badge
                        key={name}
                        variant="outline"
                        className="text-accent-green border-accent-green/30 font-mono text-xs"
                      >
                        {name}
                      </Badge>
                    ))}
                    {comparison.added.length > 50 && (
                      <Badge variant="outline" className="text-muted-foreground">
                        +{comparison.added.length - 50} more
                      </Badge>
                    )}
                  </div>
                </Card>
              )}

              {/* Removed Subdomains */}
              {comparison.removed.length > 0 && (
                <Card className="p-4 bg-muted/20 border-border">
                  <h4 className="font-mono text-sm text-accent-red mb-3 flex items-center gap-2">
                    <Minus className="h-4 w-4" />
                    Removed Subdomains ({comparison.removed.length})
                  </h4>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                    {comparison.removed.slice(0, 50).map((name) => (
                      <Badge
                        key={name}
                        variant="outline"
                        className="text-accent-red border-accent-red/30 font-mono text-xs"
                      >
                        {name}
                      </Badge>
                    ))}
                    {comparison.removed.length > 50 && (
                      <Badge variant="outline" className="text-muted-foreground">
                        +{comparison.removed.length - 50} more
                      </Badge>
                    )}
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
