import { useState, useMemo, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ScanInput } from "@/components/dashboard/ScanInput";
import { ScanProgress } from "@/components/dashboard/ScanProgress";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { SubdomainTable } from "@/components/dashboard/SubdomainTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const InteractiveGraph = lazy(() => import("@/components/dashboard/InteractiveGraph").then(module => ({ default: module.InteractiveGraph })));
const JsonView = lazy(() => import("@/components/dashboard/JsonView").then(module => ({ default: module.JsonView })));
const ExportPanel = lazy(() => import("@/components/dashboard/ExportPanel").then(module => ({ default: module.ExportPanel })));
const ReportGenerator = lazy(() => import("@/components/dashboard/ReportGenerator").then(module => ({ default: module.ReportGenerator })));
const ScanComparison = lazy(() => import("@/components/dashboard/ScanComparison").then(module => ({ default: module.ScanComparison })));
const AIAssistant = lazy(() => import("@/components/dashboard/AIAssistant").then(module => ({ default: module.AIAssistant })));
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useScans } from "@/hooks/useScans";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { FilterOptions, ViewMode, defaultScanResult } from "@/types/subdomain";
import {
  Globe,
  Activity,
  AlertTriangle,
  Cloud,
  Table,
  Share2,
  Code,
  Shield,
  Pause,
  Play,
  Square,
  History,
  RefreshCw,
} from "lucide-react";

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const {
    isScanning,
    isPaused,
    scanProgress,
    currentTask,
    scanResult,
    startScan,
    stopScan,
    pauseScan,
    resumeScan,
    loadPreviousScan,
    clearResults,
  } = useScans();
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [filters, setFilters] = useState<FilterOptions>({
    activeOnly: false,
    anomaliesOnly: false,
    cloudAssetsOnly: false,
    takeoverVulnerable: false,
    keyword: "",
    minScore: 0,
    cloudProvider: null,
  });
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [selectedPreviousScan, setSelectedPreviousScan] = useState<string>("");

  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  const fetchRecentScans = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("scans")
      .select("id, target_domain, created_at, status")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(10);
    setRecentScans(data || []);
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchRecentScans();
    }
  }, [user, fetchRecentScans]);

  const currentScanResult = scanResult || defaultScanResult;

  const handleScan = async (domain: string) => {
    await startScan(domain);
    await fetchRecentScans();
  };

  const handleLoadPreviousScan = async (scanId: string) => {
    if (scanId) {
      await loadPreviousScan(scanId);
      setSelectedPreviousScan(scanId);
    }
  };

  const filteredSubdomains = useMemo(() => {
    return currentScanResult.subdomains.filter((sub) => {
      if (filters.activeOnly && sub.status !== "active") return false;
      if (filters.anomaliesOnly && !sub.isAnomaly) return false;
      if (filters.cloudAssetsOnly && !sub.cloudProvider) return false;
      if (filters.takeoverVulnerable && !sub.takeoverVulnerable) return false;
      if (filters.keyword && !sub.name.toLowerCase().includes(filters.keyword.toLowerCase()))
        return false;
      if (filters.minScore > 0 && sub.riskScore < filters.minScore) return false;
      if (filters.cloudProvider && sub.cloudProvider !== filters.cloudProvider) return false;
      return true;
    });
  }, [currentScanResult.subdomains, filters]);

  const hasResults =
    currentScanResult.status === "completed" && currentScanResult.subdomains.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-6 py-8 space-y-8">
        {/* Scan Input */}
        <ScanInput onScan={handleScan} isScanning={isScanning} />

        {/* Auth notice for non-logged in users */}
        {!authLoading && !user && (
          <div className="text-center py-8 space-y-4">
            <div className="flex items-center justify-center gap-3 text-muted-foreground">
              <Shield className="h-8 w-8 text-primary/50" />
              <p className="text-sm font-mono">
                Sign in to save your scans and access full features
              </p>
            </div>
          </div>
        )}

        {/* Previous Scans Selector */}
        {user && recentScans.length > 0 && !isScanning && (
          <Card className="p-4 border-border/50 bg-card/30 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <History className="h-4 w-4" />
                <span>Load Previous Scan:</span>
              </div>
              <Select value={selectedPreviousScan} onValueChange={handleLoadPreviousScan}>
                <SelectTrigger className="w-[300px] bg-background/50">
                  <SelectValue placeholder="Select a previous scan..." />
                </SelectTrigger>
                <SelectContent>
                  {recentScans.map((scan) => (
                    <SelectItem key={scan.id} value={scan.id}>
                      {scan.target_domain} - {new Date(scan.created_at).toLocaleDateString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {scanResult && (
                <Button variant="ghost" size="sm" onClick={clearResults}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Clear Results
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Progress with Controls */}
        {isScanning && (
          <div className="space-y-4">
            <ScanProgress
              progress={scanProgress}
              status={isPaused ? "Scan paused" : "Reconnaissance in progress"}
              currentTask={currentTask}
            />
            <div className="flex items-center justify-center gap-3">
              {isPaused ? (
                <Button variant="cyber" onClick={resumeScan}>
                  <Play className="h-4 w-4 mr-2" />
                  Resume
                </Button>
              ) : (
                <Button variant="outline" onClick={pauseScan}>
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </Button>
              )}
              <Button variant="destructive" onClick={stopScan}>
                <Square className="h-4 w-4 mr-2" />
                Stop Scan
              </Button>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        {!isScanning && hasResults && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 animate-fade-in">
            <StatsCard
              title="Total Subdomains"
              value={currentScanResult.totalSubdomains}
              subtitle={`Target: ${currentScanResult.targetDomain}`}
              icon={Globe}
              variant="primary"
            />
            <StatsCard
              title="Active"
              value={currentScanResult.activeSubdomains}
              subtitle={`${Math.round((currentScanResult.activeSubdomains / currentScanResult.totalSubdomains) * 100) || 0}% responding`}
              icon={Activity}
              variant="primary"
            />
            <StatsCard
              title="Anomalies"
              value={currentScanResult.anomalies}
              subtitle="Suspicious patterns"
              icon={AlertTriangle}
              variant="warning"
            />
            <StatsCard
              title="Cloud Assets"
              value={currentScanResult.cloudAssets}
              subtitle="AWS, Azure, GCP"
              icon={Cloud}
              variant="info"
            />
            <StatsCard
              title="Takeover Risk"
              value={currentScanResult.takeoverVulnerable}
              subtitle="Vulnerable to takeover"
              icon={Shield}
              variant="destructive"
            />
          </div>
        )}

        {/* Results Section */}
        {!isScanning && hasResults && (
          <div className="space-y-4 animate-slide-up">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <FilterBar
                  filters={filters}
                  onChange={setFilters}
                  resultCount={filteredSubdomains.length}
                />
              </div>
              <div className="flex items-center gap-2">
                <Suspense fallback={<Skeleton className="h-10 w-32" />}>
                  <AIAssistant
                    domain={currentScanResult.targetDomain}
                    subdomains={filteredSubdomains}
                  />
                  <ScanComparison />
                  <ReportGenerator scanResult={currentScanResult} subdomains={filteredSubdomains} />
                </Suspense>
              </div>
              <Suspense fallback={<Skeleton className="h-10 w-32" />}>
                <ExportPanel
                  subdomains={filteredSubdomains}
                  targetDomain={currentScanResult.targetDomain}
                />
              </Suspense>
            </div>

            <Tabs
              defaultValue="table"
              className="w-full"
              onValueChange={(v) => setViewMode(v as ViewMode)}
            >
              <TabsList className="bg-card/50 border border-border/50">
                <TabsTrigger
                  value="table"
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                >
                  <Table className="h-4 w-4 mr-2" />
                  Table View
                </TabsTrigger>
                <TabsTrigger
                  value="graph"
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Graph View
                </TabsTrigger>
                <TabsTrigger
                  value="json"
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                >
                  <Code className="h-4 w-4 mr-2" />
                  Raw JSON
                </TabsTrigger>
              </TabsList>

              <TabsContent value="table" className="mt-4">
                <SubdomainTable subdomains={filteredSubdomains} />
              </TabsContent>

              <TabsContent value="graph" className="mt-4">
                <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
                  <InteractiveGraph
                    subdomains={filteredSubdomains}
                    targetDomain={currentScanResult.targetDomain}
                  />
                </Suspense>
              </TabsContent>

              <TabsContent value="json" className="mt-4">
                <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
                  <JsonView subdomains={filteredSubdomains} />
                </Suspense>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Empty state */}
        {!isScanning && !hasResults && (
          <div className="text-center py-16 space-y-4">
            <div className="relative inline-block">
              <Globe className="h-16 w-16 text-primary/30 mx-auto animate-float" />
              <div className="absolute -top-2 -right-2 h-4 w-4 bg-primary/50 rounded-full animate-pulse" />
            </div>
            <h2 className="text-xl font-mono text-foreground">Ready to Scan</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Enter a target domain above to begin subdomain enumeration and attack surface
              reconnaissance.
            </p>
          </div>
        )}
      </main>

      <footer className="border-t border-border py-6 mt-auto">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
            <span>CYBEREYE v2.0.0</span>
            <span>© 2026 Advanced Attack Surface Intelligence</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
