import { Subdomain, ScanResult } from "@/types/subdomain";

const cloudProviders: Array<
  "aws" | "azure" | "gcp" | "cloudflare" | "digitalocean" | "heroku" | "vercel" | "netlify"
> = ["aws", "azure", "gcp", "cloudflare", "digitalocean", "heroku", "vercel", "netlify"];

const technologies = [
  "nginx",
  "Apache",
  "Node.js",
  "React",
  "WordPress",
  "PHP",
  "Python",
  "Ruby",
  "Java",
  "Go",
  "Kubernetes",
  "Docker",
];

const anomalyReasons = [
  "Suspicious pattern: backup",
  "Suspicious pattern: temp",
  "Suspicious pattern: old",
  "Suspicious pattern: dev",
  "Suspicious pattern: staging",
  "Suspicious pattern: internal",
];

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomTechnologies(): string[] {
  const count = Math.floor(Math.random() * 4) + 1;
  const techs: string[] = [];
  for (let i = 0; i < count; i++) {
    const tech = randomChoice(technologies);
    if (!techs.includes(tech)) techs.push(tech);
  }
  return techs;
}

function generateSubdomain(domain: string, index: number): Subdomain {
  const prefixes = [
    "www",
    "api",
    "app",
    "mail",
    "dev",
    "staging",
    "test",
    "admin",
    "portal",
    "dashboard",
    "cdn",
    "static",
    "assets",
    "blog",
    "shop",
    "backup",
    "old",
    "temp",
    "internal",
    "vpn",
    "remote",
    "ftp",
    "m",
    "mobile",
    "beta",
    "alpha",
    "v2",
    "legacy",
    "secure",
    "auth",
    "login",
    "sso",
    "oauth",
    "payment",
    "checkout",
    "store",
  ];

  const name = `${prefixes[index % prefixes.length]}.${domain}`;
  const isAnomaly = ["backup", "old", "temp", "internal"].includes(
    prefixes[index % prefixes.length]
  );
  const status = Math.random() > 0.2 ? "active" : Math.random() > 0.5 ? "inactive" : "unknown";
  const cloudProvider = Math.random() > 0.6 ? randomChoice(cloudProviders) : null;
  const takeoverVulnerable = Math.random() > 0.95;

  const ip =
    status !== "unknown"
      ? `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
      : null;

  return {
    id: `sub-${index}`,
    name,
    status,
    ipAddresses: ip ? [ip] : [],
    httpStatus:
      status === "active" ? [200, 301, 302, 403, 404][Math.floor(Math.random() * 5)] : null,
    httpsStatus: status === "active" ? [200, 301, 302][Math.floor(Math.random() * 3)] : null,
    technologies: status === "active" ? randomTechnologies() : [],
    server:
      status === "active" ? randomChoice(["nginx", "Apache", "cloudflare", "AmazonS3"]) : null,
    cloudProvider,
    riskScore: Math.floor(Math.random() * 100),
    isAnomaly,
    anomalyReason: isAnomaly ? randomChoice(anomalyReasons) : null,
    takeoverVulnerable,
    takeoverType: takeoverVulnerable
      ? randomChoice(["AWS S3", "Heroku", "Azure", "GitHub Pages"])
      : null,
    cnameRecord: cloudProvider ? `${name}.cdn.${cloudProvider}.com` : null,
    dnsRecords: {
      A: ip ? [ip] : [],
      CNAME: cloudProvider ? `${name}.cdn.${cloudProvider}.com` : null,
    },
    ports:
      status === "active"
        ? [
            { port: 80, service: "http", state: "open" },
            { port: 443, service: "https", state: "open" },
            ...(Math.random() > 0.7 ? [{ port: 8080, service: "http-alt", state: "open" }] : []),
            ...(Math.random() > 0.8 ? [{ port: 22, service: "ssh", state: "open" }] : []),
          ]
        : [],
    lastSeen: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    firstSeen: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
    waybackUrls: Math.random() > 0.7 ? [`https://web.archive.org/web/${name}`] : [],
  };
}

export function generateMockScanResult(domain: string): ScanResult {
  const subdomainCount = Math.floor(Math.random() * 30) + 20;
  const subdomains = Array.from({ length: subdomainCount }, (_, i) => generateSubdomain(domain, i));

  const activeSubdomains = subdomains.filter((s) => s.status === "active").length;
  const anomalies = subdomains.filter((s) => s.isAnomaly).length;
  const cloudAssets = subdomains.filter((s) => s.cloudProvider !== null).length;
  const takeoverVulnerable = subdomains.filter((s) => s.takeoverVulnerable).length;

  return {
    id: `scan-${Date.now()}`,
    targetDomain: domain,
    status: "completed",
    scanStarted: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    scanCompleted: new Date().toISOString(),
    totalSubdomains: subdomainCount,
    activeSubdomains,
    anomalies,
    cloudAssets,
    takeoverVulnerable,
    subdomains,
  };
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
