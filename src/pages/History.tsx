import { useState, useEffect, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Globe, Trash2, Filter, ArrowUpDown, Eye } from "lucide-react";
import { toast } from "sonner";
import { ScanDetails } from "@/components/scan/ScanDetails";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ScanRecord {
  id: string;
  target_domain: string;
  status: string;
  total_subdomains: number;
  active_subdomains: number;
  anomalies: number;
  cloud_assets: number;
  takeover_vulnerable: number;
  created_at: string;
  completed_at: string | null;
}

type SortOption = "date-desc" | "date-asc" | "target-asc" | "target-desc";
type FilterStatus = "all" | "completed" | "running" | "failed";

const History = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [loadingScans, setLoadingScans] = useState(true);
  const [selectedScan, setSelectedScan] = useState<ScanRecord | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Sorting and Filtering State
  const [sortBy, setSortBy] = useState<SortOption>("date-desc");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchScans();
    }
  }, [user]);

  const fetchScans = async () => {
    try {
      const { data, error } = await supabase
        .from("scans")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setScans((data as ScanRecord[]) || []);
    } catch (error: any) {
      console.error("Error fetching scans:", error);
      toast.error("Failed to load scan history");
    } finally {
      setLoadingScans(false);
    }
  };

  const deleteScan = async (scanId: string) => {
    try {
      const { error } = await supabase.from("scans").delete().eq("id", scanId);

      if (error) throw error;

      setScans(scans.filter((s) => s.id !== scanId));
      toast.success("Scan deleted");
    } catch (error: any) {
      console.error("Error deleting scan:", error);
      toast.error("Failed to delete scan");
    }
  };

  const filteredAndSortedScans = useMemo(() => {
    let result = [...scans];

    // Filter
    if (filterStatus !== "all") {
      result = result.filter((scan) => scan.status === filterStatus);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "date-asc":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "target-asc":
          return a.target_domain.localeCompare(b.target_domain);
        case "target-desc":
          return b.target_domain.localeCompare(a.target_domain);
        default:
          return 0;
      }
    });

    return result;
  }, [scans, sortBy, filterStatus]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="success">Completed</Badge>;
      case "running":
        return <Badge variant="info">Running</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const handleViewDetails = (scan: ScanRecord) => {
    setSelectedScan(scan);
    setDetailsOpen(true);
  };

  if (loading || loadingScans) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-6 py-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-mono text-foreground">
              Scan <span className="text-primary">History</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              View and manage your past reconnaissance scans
            </p>
          </div>
          <Button variant="cyber" onClick={() => navigate("/")}>
            New Scan
          </Button>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-center bg-card/30 p-4 rounded-lg border border-border/50">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filterStatus} onValueChange={(value: FilterStatus) => setFilterStatus(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Newest First</SelectItem>
                <SelectItem value="date-asc">Oldest First</SelectItem>
                <SelectItem value="target-asc">Target (A-Z)</SelectItem>
                <SelectItem value="target-desc">Target (Z-A)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="ml-auto text-sm text-muted-foreground">
            Showing {filteredAndSortedScans.length} scans
          </div>
        </div>

        {filteredAndSortedScans.length === 0 ? (
          <Card className="p-12 text-center border-border/50 bg-card/30">
            <Globe className="h-12 w-12 text-primary/30 mx-auto mb-4" />
            <h3 className="text-lg font-mono text-foreground">No scans found</h3>
            <p className="text-sm text-muted-foreground mt-2">
              {scans.length === 0
                ? "Start your first reconnaissance scan to see results here"
                : "Try adjusting your filters to see more results"}
            </p>
            {scans.length === 0 && (
              <Button variant="cyber" className="mt-4" onClick={() => navigate("/")}>
                Start Scanning
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredAndSortedScans.map((scan) => (
              <Card
                key={scan.id}
                className="p-6 border-border/50 bg-card/30 backdrop-blur-sm hover:bg-card/50 transition-colors"
                onClick={() => handleViewDetails(scan)}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <Globe className="h-5 w-5 text-primary" />
                      <span className="font-mono text-lg text-foreground hover:underline cursor-pointer" onClick={(e) => {
                        e.stopPropagation();
                        handleViewDetails(scan);
                      }}>
                        {scan.target_domain}
                      </span>
                      {getStatusBadge(scan.status)}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(scan.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 justify-between md:justify-end w-full md:w-auto">
                    {scan.status === "completed" && (
                      <div className="flex items-center gap-4 text-sm">
                        <div className="text-center">
                          <div className="font-mono font-bold text-foreground">
                            {scan.total_subdomains}
                          </div>
                          <div className="text-xs text-muted-foreground">Total</div>
                        </div>
                        <div className="text-center">
                          <div className="font-mono font-bold text-success">
                            {scan.active_subdomains}
                          </div>
                          <div className="text-xs text-muted-foreground">Active</div>
                        </div>
                        <div className="text-center hidden sm:block">
                          <div className="font-mono font-bold text-destructive">
                            {scan.anomalies}
                          </div>
                          <div className="text-xs text-muted-foreground">Anomalies</div>
                        </div>
                        <div className="text-center hidden sm:block">
                          <div className="font-mono font-bold text-accent">
                            {scan.takeover_vulnerable}
                          </div>
                          <div className="text-xs text-muted-foreground">Takeover</div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetails(scan);
                        }}
                        className="hidden sm:flex"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Details
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteScan(scan.id);
                        }}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <ScanDetails
          scan={selectedScan}
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
        />
      </main>
    </div>
  );
};

export default History;
