import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Activity,
  Globe,
  AlertTriangle,
  Cloud,
  Shield,
  TrendingUp,
  Clock,
  Target,
  Zap,
  BarChart3,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

interface DashboardStats {
  totalScans: number;
  totalSubdomains: number;
  totalAnomalies: number;
  totalTakeovers: number;
  totalCloudAssets: number;
  activeSubdomains: number;
  recentScans: any[];
}

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalScans: 0,
    totalSubdomains: 0,
    totalAnomalies: 0,
    totalTakeovers: 0,
    totalCloudAssets: 0,
    activeSubdomains: 0,
    recentScans: [],
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchDashboardStats();
    }
  }, [user]);

  const fetchDashboardStats = async () => {
    try {
      // Fetch all scans
      const { data: scans, error: scansError } = await supabase
        .from("scans")
        .select("*")
        .order("created_at", { ascending: false });

      if (scansError) throw scansError;

      // Calculate totals
      const totalScans = scans?.length || 0;
      const totalSubdomains = scans?.reduce((acc, s) => acc + (s.total_subdomains || 0), 0) || 0;
      const totalAnomalies = scans?.reduce((acc, s) => acc + (s.anomalies || 0), 0) || 0;
      const totalTakeovers = scans?.reduce((acc, s) => acc + (s.takeover_vulnerable || 0), 0) || 0;
      const totalCloudAssets = scans?.reduce((acc, s) => acc + (s.cloud_assets || 0), 0) || 0;
      const activeSubdomains = scans?.reduce((acc, s) => acc + (s.active_subdomains || 0), 0) || 0;

      setStats({
        totalScans,
        totalSubdomains,
        totalAnomalies,
        totalTakeovers,
        totalCloudAssets,
        activeSubdomains,
        recentScans: scans?.slice(0, 5) || [],
      });
    } catch (error: any) {
      console.error("Error fetching dashboard stats:", error);
      toast.error("Failed to load dashboard");
    } finally {
      setLoadingStats(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-success";
      case "running":
        return "bg-info animate-pulse";
      case "failed":
        return "bg-destructive";
      default:
        return "bg-muted-foreground";
    }
  };

  if (loading || loadingStats) {
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

      <main className="container mx-auto px-6 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-mono text-foreground flex items-center gap-3">
              <BarChart3 className="h-6 w-6 text-primary" />
              Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Overview of your reconnaissance activity
            </p>
          </div>
          <Button variant="cyber" onClick={() => navigate("/")}>
            <Zap className="h-4 w-4 mr-2" />
            New Scan
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <Card className="p-5 border-primary/30 bg-gradient-to-br from-primary/10 to-transparent hover:border-primary/50 transition-all">
            <div className="flex items-center justify-between mb-3">
              <Target className="h-5 w-5 text-primary" />
              <Badge variant="cyber" className="text-xs">
                Total
              </Badge>
            </div>
            <div className="text-3xl font-bold font-mono text-primary text-glow">
              {stats.totalScans}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Scans Completed</div>
          </Card>

          <Card className="p-5 border-border/50 bg-card/50 hover:border-primary/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <Globe className="h-5 w-5 text-foreground" />
              <Badge variant="outline" className="text-xs">
                Discovered
              </Badge>
            </div>
            <div className="text-3xl font-bold font-mono text-foreground">
              {stats.totalSubdomains}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Total Subdomains</div>
          </Card>

          <Card className="p-5 border-success/30 bg-gradient-to-br from-success/10 to-transparent hover:border-success/50 transition-all">
            <div className="flex items-center justify-between mb-3">
              <Activity className="h-5 w-5 text-success" />
              <Badge variant="success" className="text-xs">
                Active
              </Badge>
            </div>
            <div className="text-3xl font-bold font-mono text-success">
              {stats.activeSubdomains}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Active Subdomains</div>
          </Card>

          <Card className="p-5 border-destructive/30 bg-gradient-to-br from-destructive/10 to-transparent hover:border-destructive/50 transition-all">
            <div className="flex items-center justify-between mb-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <Badge variant="destructive" className="text-xs">
                Alert
              </Badge>
            </div>
            <div className="text-3xl font-bold font-mono text-destructive">
              {stats.totalAnomalies}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Anomalies Found</div>
          </Card>

          <Card className="p-5 border-warning/30 bg-gradient-to-br from-warning/10 to-transparent hover:border-warning/50 transition-all">
            <div className="flex items-center justify-between mb-3">
              <Shield className="h-5 w-5 text-warning" />
              <Badge variant="warning" className="text-xs">
                Risk
              </Badge>
            </div>
            <div className="text-3xl font-bold font-mono text-warning">{stats.totalTakeovers}</div>
            <div className="text-xs text-muted-foreground mt-1">Takeover Risks</div>
          </Card>

          <Card className="p-5 border-info/30 bg-gradient-to-br from-info/10 to-transparent hover:border-info/50 transition-all">
            <div className="flex items-center justify-between mb-3">
              <Cloud className="h-5 w-5 text-info" />
              <Badge variant="info" className="text-xs">
                Cloud
              </Badge>
            </div>
            <div className="text-3xl font-bold font-mono text-info">{stats.totalCloudAssets}</div>
            <div className="text-xs text-muted-foreground mt-1">Cloud Assets</div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Scans */}
          <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-mono font-semibold text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Recent Scans
              </h2>
              <Button variant="ghost" size="sm" onClick={() => navigate("/history")}>
                View All
              </Button>
            </div>

            {stats.recentScans.length === 0 ? (
              <div className="text-center py-8">
                <Globe className="h-12 w-12 text-primary/30 mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">No scans yet</p>
                <Button variant="cyber" size="sm" className="mt-4" onClick={() => navigate("/")}>
                  Start First Scan
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recentScans.map((scan) => (
                  <div
                    key={scan.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/history`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${getStatusColor(scan.status)}`} />
                      <div>
                        <div className="font-mono text-sm text-foreground">
                          {scan.target_domain}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(scan.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-mono">
                      <span className="text-muted-foreground">
                        {scan.total_subdomains || 0} subs
                      </span>
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Quick Actions & Stats */}
          <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-mono font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Quick Stats
              </h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                <span className="text-sm text-muted-foreground">Average Subdomains/Scan</span>
                <span className="font-mono font-bold text-foreground">
                  {stats.totalScans > 0 ? Math.round(stats.totalSubdomains / stats.totalScans) : 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                <span className="text-sm text-muted-foreground">Active Rate</span>
                <span className="font-mono font-bold text-success">
                  {stats.totalSubdomains > 0
                    ? Math.round((stats.activeSubdomains / stats.totalSubdomains) * 100)
                    : 0}
                  %
                </span>
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                <span className="text-sm text-muted-foreground">Anomaly Rate</span>
                <span className="font-mono font-bold text-destructive">
                  {stats.totalSubdomains > 0
                    ? Math.round((stats.totalAnomalies / stats.totalSubdomains) * 100)
                    : 0}
                  %
                </span>
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                <span className="text-sm text-muted-foreground">Cloud Coverage</span>
                <span className="font-mono font-bold text-info">
                  {stats.totalSubdomains > 0
                    ? Math.round((stats.totalCloudAssets / stats.totalSubdomains) * 100)
                    : 0}
                  %
                </span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-border/50">
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="w-full" onClick={() => navigate("/")}>
                  <Zap className="h-4 w-4 mr-2" />
                  New Scan
                </Button>
                <Button variant="outline" className="w-full" onClick={() => navigate("/history")}>
                  <Clock className="h-4 w-4 mr-2" />
                  View History
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
