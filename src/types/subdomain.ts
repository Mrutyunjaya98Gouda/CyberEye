export interface Subdomain {
  id: string;
  name: string;
  status: "active" | "inactive" | "unknown";
  ipAddresses: string[];
  httpStatus: number | null;
  httpsStatus: number | null;
  technologies: string[];
  server: string | null;
  cloudProvider:
    | "aws"
    | "azure"
    | "gcp"
    | "cloudflare"
    | "digitalocean"
    | "heroku"
    | "vercel"
    | "netlify"
    | null;
  riskScore: number;
  isAnomaly: boolean;
  anomalyReason: string | null;
  takeoverVulnerable: boolean;
  takeoverType: string | null;
  cnameRecord: string | null;
  dnsRecords: Record<string, any>;
  firstSeen: string;
  lastSeen: string;
  waybackUrls: string[];
  ports: { port: number; service: string; state: string }[];
}

export interface ScanResult {
  id: string;
  targetDomain: string;
  status: "pending" | "running" | "completed" | "failed";
  totalSubdomains: number;
  activeSubdomains: number;
  anomalies: number;
  cloudAssets: number;
  takeoverVulnerable: number;
  subdomains: Subdomain[];
  scanStarted: string | null;
  scanCompleted: string | null;
}

export interface ScanOptions {
  ctLogs?: boolean;
  dnsBruteforce?: boolean;
  httpProbe?: boolean;
  techFingerprint?: boolean;
  takeoverCheck?: boolean;
}

export type ViewMode = "table" | "graph" | "json";

export interface FilterOptions {
  activeOnly: boolean;
  anomaliesOnly: boolean;
  cloudAssetsOnly: boolean;
  takeoverVulnerable: boolean;
  keyword: string;
  minScore: number;
  cloudProvider: string | null;
}

export interface AnalysisResult {
  riskLevel: string;
  summary: string;
  findings: {
    type: string;
    severity: string;
    description: string;
    subdomains: string[];
  }[];
  recommendations: string[];
}

export const defaultScanResult: ScanResult = {
  id: "",
  targetDomain: "",
  status: "pending",
  totalSubdomains: 0,
  activeSubdomains: 0,
  anomalies: 0,
  cloudAssets: 0,
  takeoverVulnerable: 0,
  subdomains: [],
  scanStarted: null,
  scanCompleted: null,
};
