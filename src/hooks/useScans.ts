import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import type { ScanResult, Subdomain, ScanOptions } from "@/types/subdomain";

export function useScans() {
  const { user } = useAuth();
  const [isScanning, setIsScanning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [currentTask, setCurrentTask] = useState("");
  const [currentScanId, setCurrentScanId] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  const startScan = async (
    domain: string,
    options: ScanOptions = {
      ctLogs: true,
      dnsBruteforce: true,
      httpProbe: true,
      techFingerprint: true,
      takeoverCheck: true,
    }
  ) => {
    if (!user) {
      toast.error("Please sign in to start a scan");
      return;
    }

    setIsScanning(true);
    setIsPaused(false);
    setScanProgress(0);
    setCurrentTask("Initializing scan...");

    try {
      // Create scan record
      const { data: scan, error: createError } = await supabase
        .from("scans")
        .insert([
          {
            user_id: user.id,
            target_domain: domain,
            status: "pending" as const,
            scan_options: options as unknown as Record<string, boolean>,
          },
        ])
        .select()
        .single();

      if (createError) throw createError;

      setCurrentScanId(scan.id);

      // Simulate progress while scan runs
      const tasks = [
        "Querying Certificate Transparency logs...",
        "Searching DNS brute-force wordlist...",
        "Validating discovered subdomains...",
        "Running HTTP/HTTPS probes...",
        "Fingerprinting technologies...",
        "Checking for subdomain takeovers...",
        "Analyzing cloud assets...",
        "Computing risk scores...",
        "Generating final report...",
      ];

      // Start progress simulation
      const progressInterval = setInterval(() => {
        setScanProgress((prev) => {
          if (isPaused) return prev;
          const newProgress = Math.min(prev + 2, 95);
          const taskIndex = Math.floor(newProgress / 12);
          setCurrentTask(tasks[taskIndex] || tasks[tasks.length - 1]);
          return newProgress;
        });
      }, 200);

      // Invoke edge function
      const { data, error: invokeError } = await supabase.functions.invoke("subdomain-scan", {
        body: { scanId: scan.id, domain, options },
      });

      clearInterval(progressInterval);

      if (invokeError) throw invokeError;

      setScanProgress(100);
      setCurrentTask("Scan completed!");

      // Fetch results
      await fetchScanResults(scan.id);

      toast.success(`Scan completed! Found ${data.stats.total} subdomains.`);
    } catch (error: any) {
      console.error("Scan error:", error);
      toast.error(`Scan failed: ${error.message}`);
    } finally {
      setIsScanning(false);
      setIsPaused(false);
    }
  };

  const stopScan = useCallback(async () => {
    if (!currentScanId) return;

    try {
      await supabase
        .from("scans")
        .update({ status: "failed" as const })
        .eq("id", currentScanId);

      setIsScanning(false);
      setIsPaused(false);
      setScanProgress(0);
      setCurrentTask("");
      setCurrentScanId(null);
      toast.info("Scan stopped");
    } catch (error: any) {
      console.error("Error stopping scan:", error);
      toast.error("Failed to stop scan");
    }
  }, [currentScanId]);

  const pauseScan = useCallback(() => {
    setIsPaused(true);
    setCurrentTask("Scan paused...");
    toast.info("Scan paused");
  }, []);

  const resumeScan = useCallback(() => {
    setIsPaused(false);
    toast.info("Scan resumed");
  }, []);

  const loadPreviousScan = useCallback(async (scanId: string) => {
    setIsScanning(true);
    setCurrentTask("Loading previous scan data...");
    setScanProgress(50);

    try {
      await fetchScanResults(scanId);
      toast.success("Previous scan loaded");
    } catch (error) {
      console.error("Failed to load previous scan", error);
    } finally {
      setIsScanning(false);
      setScanProgress(0);
      setCurrentTask("");
    }
  }, []);

  const fetchScanResults = async (scanId: string) => {
    try {
      const { data: scan, error: scanError } = await supabase
        .from("scans")
        .select("*")
        .eq("id", scanId)
        .single();

      if (scanError) throw scanError;

      const { data: subdomains, error: subdomainsError } = await supabase
        .from("subdomains")
        .select("*")
        .eq("scan_id", scanId)
        .order("risk_score", { ascending: false });

      if (subdomainsError) throw subdomainsError;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mappedSubdomains: Subdomain[] = (subdomains || []).map((sub: any) => ({
        id: sub.id,
        name: sub.name,
        status: sub.status as "active" | "inactive" | "unknown",
        ipAddresses: sub.ip_addresses || [],
        httpStatus: sub.http_status,
        httpsStatus: sub.https_status,
        technologies: sub.technologies || [],
        server: sub.server,
        cloudProvider: sub.cloud_provider as "aws" | "azure" | "gcp" | "digitalocean" | "heroku" | "netlify" | "vercel" | null,
        riskScore: sub.risk_score || 0,
        isAnomaly: sub.is_anomaly || false,
        anomalyReason: sub.anomaly_reason,
        takeoverVulnerable: sub.takeover_vulnerable || false,
        takeoverType: sub.takeover_type,
        cnameRecord: sub.cname_record,
        dnsRecords: sub.dns_records || {},
        firstSeen: sub.first_seen,
        lastSeen: sub.last_seen,
        waybackUrls: sub.wayback_urls || [],
        ports: sub.ports || [],
      }));

      setScanResult({
        id: scan.id,
        targetDomain: scan.target_domain,
        status: scan.status as "completed",
        totalSubdomains: scan.total_subdomains || 0,
        activeSubdomains: scan.active_subdomains || 0,
        anomalies: scan.anomalies || 0,
        cloudAssets: scan.cloud_assets || 0,
        takeoverVulnerable: scan.takeover_vulnerable || 0,
        subdomains: mappedSubdomains,
        scanStarted: scan.started_at,
        scanCompleted: scan.completed_at,
      });
    } catch (error: any) {
      console.error("Error fetching scan results:", error);
      toast.error("Failed to fetch scan results");
    }
  };

  const fetchRecentScans = async () => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from("scans")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error("Error fetching recent scans:", error);
      return [];
    }
  };

  const clearResults = useCallback(() => {
    setScanResult(null);
    setCurrentScanId(null);
  }, []);

  return {
    isScanning,
    isPaused,
    scanProgress,
    currentTask,
    currentScanId,
    scanResult,
    startScan,
    stopScan,
    pauseScan,
    resumeScan,
    loadPreviousScan,
    fetchScanResults,
    fetchRecentScans,
    clearResults,
  };
}
