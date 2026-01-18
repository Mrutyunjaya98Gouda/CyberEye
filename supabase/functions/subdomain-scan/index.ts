import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ScanRequest {
  scanId: string;
  domain: string;
  options?: {
    ctLogs?: boolean;
    dnsBruteforce?: boolean;
    httpProbe?: boolean;
    techFingerprint?: boolean;
    takeoverCheck?: boolean;
  };
}

// Domain validation regex - allows only valid domain names
const DOMAIN_REGEX = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.[A-Za-z0-9-]{1,63})*\.[A-Za-z]{2,}$/;

// Blocked TLDs that could indicate internal/local resources
const BLOCKED_TLDS = [".local", ".internal", ".localhost", ".lan", ".home", ".corp", ".private"];

// Private/internal IP ranges to block
const PRIVATE_IP_PATTERNS = [
  /^127\./, // Loopback
  /^10\./, // RFC 1918
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // RFC 1918
  /^192\.168\./, // RFC 1918
  /^169\.254\./, // Link-local
  /^0\./, // This network
  /^224\./, // Multicast
  /^240\./, // Reserved
];

// Cloud metadata endpoints to block
const BLOCKED_DOMAINS = [
  "169.254.169.254", // AWS/GCP metadata
  "metadata.google.internal",
  "metadata.azure.com",
];

// Rate limiting configuration
const RATE_LIMIT_MS = 100; // Min ms between requests to same domain
const MAX_CONCURRENT = 10; // Max parallel requests
const rateLimiter = new Map<string, number>();

function isValidDomain(domain: string): { valid: boolean; error?: string } {
  // Check if it's an IP address (not allowed)
  if (/^[\d.]+$/.test(domain)) {
    return { valid: false, error: "IP addresses are not allowed. Please provide a domain name." };
  }

  // Check for IPv6 format
  if (domain.includes(":")) {
    return { valid: false, error: "IPv6 addresses are not allowed. Please provide a domain name." };
  }

  // Check blocked domains
  if (BLOCKED_DOMAINS.some((blocked) => domain.toLowerCase().includes(blocked))) {
    return { valid: false, error: "This domain is not allowed for scanning." };
  }

  // Check blocked TLDs
  const lowerDomain = domain.toLowerCase();
  if (BLOCKED_TLDS.some((tld) => lowerDomain.endsWith(tld))) {
    return { valid: false, error: "Internal/local domains are not allowed for scanning." };
  }

  // Check domain format
  if (!DOMAIN_REGEX.test(domain)) {
    return { valid: false, error: "Invalid domain format. Please provide a valid domain name." };
  }

  // Check length
  if (domain.length > 253) {
    return { valid: false, error: "Domain name is too long." };
  }

  return { valid: true };
}

function isPrivateIP(ip: string): boolean {
  return PRIVATE_IP_PATTERNS.some((pattern) => pattern.test(ip));
}

// Extended subdomain wordlist - ~200+ common subdomains
const COMMON_SUBDOMAINS = [
  // Core services
  "www",
  "mail",
  "ftp",
  "localhost",
  "webmail",
  "smtp",
  "pop",
  "ns1",
  "ns2",
  "ns3",
  "ns4",
  "admin",
  "administrator",
  "blog",
  "dev",
  "development",
  "staging",
  "test",
  "testing",
  "api",
  "api-v1",
  "api-v2",
  "api-v3",
  "app",
  "apps",
  "mobile",
  "cdn",
  "static",
  "assets",
  "images",
  "img",
  "media",
  "video",
  "audio",
  "files",
  "download",
  "downloads",
  "upload",

  // Documentation & Support
  "docs",
  "documentation",
  "help",
  "support",
  "kb",
  "knowledge",
  "wiki",
  "faq",
  "guide",

  // Infrastructure
  "portal",
  "vpn",
  "remote",
  "gateway",
  "proxy",
  "cache",
  "edge",
  "node",
  "server",
  "git",
  "gitlab",
  "github",
  "bitbucket",
  "jenkins",
  "ci",
  "cd",
  "build",
  "deploy",
  "prod",
  "production",
  "beta",
  "alpha",
  "demo",
  "sandbox",
  "uat",
  "qa",
  "stage",
  "old",
  "new",
  "legacy",
  "backup",
  "bak",
  "temp",
  "tmp",
  "archive",
  "mirror",

  // E-commerce
  "shop",
  "store",
  "cart",
  "checkout",
  "pay",
  "payment",
  "payments",
  "billing",
  "invoice",
  "order",
  "orders",
  "catalog",
  "product",
  "products",
  "inventory",
  "merchant",

  // Security
  "secure",
  "ssl",
  "https",
  "login",
  "signin",
  "auth",
  "authentication",
  "sso",
  "oauth",
  "account",
  "accounts",
  "profile",
  "user",
  "users",
  "member",
  "members",
  "register",

  // Admin panels
  "panel",
  "cpanel",
  "whm",
  "plesk",
  "webmin",
  "phpmyadmin",
  "adminer",
  "mysql",
  "directadmin",
  "ispconfig",
  "hestia",
  "virtualmin",
  "webpanel",
  "dashboard",

  // Databases & Storage
  "db",
  "database",
  "sql",
  "mysql",
  "postgres",
  "postgresql",
  "mongo",
  "mongodb",
  "redis",
  "elastic",
  "elasticsearch",
  "solr",
  "s3",
  "bucket",
  "storage",
  "cloud",

  // Monitoring
  "grafana",
  "prometheus",
  "kibana",
  "logstash",
  "splunk",
  "datadog",
  "newrelic",
  "sentry",
  "status",
  "health",
  "monitor",
  "monitoring",
  "metrics",
  "analytics",
  "tracking",
  "events",
  "logs",
  "logging",
  "audit",
  "reports",
  "reporting",

  // Internal/Corporate
  "internal",
  "intranet",
  "extranet",
  "private",
  "corp",
  "corporate",
  "office",
  "hr",
  "finance",
  "sales",
  "marketing",
  "engineering",
  "legal",
  "it",
  "ops",
  "jira",
  "confluence",
  "slack",
  "teams",
  "zoom",
  "meet",
  "calendar",

  // Communication
  "ws",
  "websocket",
  "socket",
  "realtime",
  "push",
  "notifications",
  "notify",
  "email",
  "newsletter",
  "subscribe",
  "unsubscribe",
  "preferences",
  "settings",
  "forum",
  "community",
  "discuss",
  "chat",
  "message",
  "messaging",

  // Mobile/Apps
  "m",
  "mobile",
  "ios",
  "android",
  "app",
  "apps",
  "pwa",

  // CDN/Network
  "origin",
  "lb",
  "loadbalancer",
  "haproxy",
  "nginx",
  "apache",
  "web",
  "www2",
  "www3",
  "assets1",
  "assets2",
  "static1",
  "static2",
  "cdn1",
  "cdn2",
  "media1",
  "media2",

  // Development
  "dev1",
  "dev2",
  "test1",
  "test2",
  "staging1",
  "staging2",
  "preview",
  "canary",
  "feature",
  "experiment",
  "debug",
  "trace",
  "api-dev",
  "api-staging",
  "api-test",

  // Geographic
  "us",
  "eu",
  "asia",
  "uk",
  "de",
  "fr",
  "jp",
  "cn",
  "au",
  "ca",
  "br",
  "in",
  "us-east",
  "us-west",
  "eu-west",
  "eu-central",
  "ap-south",
  "ap-northeast",

  // Miscellaneous
  "console",
  "control",
  "manage",
  "management",
  "config",
  "configuration",
  "service",
  "services",
  "microservice",
  "lambda",
  "function",
  "functions",
  "rest",
  "graphql",
  "grpc",
  "rpc",
  "soap",
  "wsdl",
  "xml",
  "json",
];

// DNS permutation patterns for discovery
function generatePermutations(base: string, domain: string): string[] {
  const suffixes = ["1", "2", "01", "02", "-dev", "-prod", "-api", "-v2", "-new", "-old", "-test"];
  const prefixes = ["dev-", "staging-", "test-", "api-", "admin-", "internal-", "prod-"];

  const permutations: string[] = [];

  // Add suffix permutations
  for (const suffix of suffixes) {
    permutations.push(`${base}${suffix}.${domain}`);
  }

  // Add prefix permutations
  for (const prefix of prefixes) {
    permutations.push(`${prefix}${base}.${domain}`);
  }

  return permutations;
}

// Anomalous subdomain patterns
const ANOMALY_PATTERNS = [
  /backup/i,
  /bak/i,
  /old/i,
  /temp/i,
  /tmp/i,
  /test/i,
  /dev/i,
  /staging/i,
  /internal/i,
  /admin/i,
  /debug/i,
  /legacy/i,
  /archive/i,
];

// Cloud provider patterns
const CLOUD_PATTERNS: Record<string, RegExp[]> = {
  aws: [/\.amazonaws\.com$/i, /\.aws\.amazon\.com$/i, /s3\./i, /ec2\./i, /\.elb\./i],
  azure: [
    /\.azure\.com$/i,
    /\.azurewebsites\.net$/i,
    /\.cloudapp\.azure\.com$/i,
    /\.blob\.core\.windows\.net$/i,
  ],
  gcp: [
    /\.googleapis\.com$/i,
    /\.appspot\.com$/i,
    /\.cloud\.google\.com$/i,
    /\.storage\.googleapis\.com$/i,
  ],
  cloudflare: [/\.cloudflare\.com$/i, /\.cdn\.cloudflare\.net$/i],
  digitalocean: [/\.digitalocean\.com$/i, /\.digitaloceanspaces\.com$/i],
  heroku: [/\.herokuapp\.com$/i],
  vercel: [/\.vercel\.app$/i, /\.now\.sh$/i],
  netlify: [/\.netlify\.app$/i, /\.netlify\.com$/i],
};

// Takeover fingerprints with verification functions
const TAKEOVER_FINGERPRINTS: Record<string, { patterns: RegExp[]; errorSignatures: string[] }> = {
  "AWS S3": {
    patterns: [/\.s3\.amazonaws\.com$/i, /\.s3-[a-z0-9-]+\.amazonaws\.com$/i],
    errorSignatures: ["NoSuchBucket", "The specified bucket does not exist"],
  },
  "GitHub Pages": {
    patterns: [/\.github\.io$/i],
    errorSignatures: ["There isn't a GitHub Pages site here", "404"],
  },
  Heroku: {
    patterns: [/\.herokuapp\.com$/i],
    errorSignatures: [
      "no-such-app",
      "There is no app configured at that hostname",
      "herokucdn.com/error-pages",
    ],
  },
  Azure: {
    patterns: [/\.azurewebsites\.net$/i, /\.cloudapp\.azure\.com$/i],
    errorSignatures: ["404 Web Site not found", "Azure Web App - Default", "does not exist"],
  },
  CloudFront: {
    patterns: [/\.cloudfront\.net$/i],
    errorSignatures: ["Bad request", "ERROR: The request could not be satisfied"],
  },
  Pantheon: {
    patterns: [/\.pantheon\.io$/i],
    errorSignatures: ["404 error unknown site", "The gods are wise"],
  },
  Fastly: {
    patterns: [/\.fastly\.net$/i],
    errorSignatures: ["Fastly error: unknown domain"],
  },
  Shopify: {
    patterns: [/\.myshopify\.com$/i],
    errorSignatures: ["Sorry, this shop is currently unavailable", "Only one step left"],
  },
  Tumblr: {
    patterns: [/\.tumblr\.com$/i],
    errorSignatures: ["There's nothing here", "Whatever you were looking for"],
  },
  WordPress: {
    patterns: [/\.wordpress\.com$/i],
    errorSignatures: ["Do you want to register"],
  },
  Ghost: {
    patterns: [/\.ghost\.io$/i],
    errorSignatures: ["The thing you were looking for is no longer here"],
  },
};

// Technology fingerprinting signatures
const TECH_SIGNATURES = {
  headers: {
    "x-powered-by": (v: string) => v,
    server: (v: string) => v,
    "x-aspnet-version": () => "ASP.NET",
    "x-aspnetmvc-version": () => "ASP.NET MVC",
    "x-drupal-cache": () => "Drupal",
    "x-generator": (v: string) => v,
    "x-shopify-stage": () => "Shopify",
    "x-vercel-id": () => "Vercel",
    "x-amz-cf-id": () => "AWS CloudFront",
    "x-amz-cf-pop": () => "AWS CloudFront",
    "x-amz-request-id": () => "AWS S3",
    "cf-ray": () => "Cloudflare",
    "x-github-request-id": () => "GitHub",
    "x-served-by": (v: string) => (v.includes("cache") ? "Varnish/Fastly" : v),
    via: (v: string) =>
      v.includes("cloudfront") ? "AWS CloudFront" : v.includes("varnish") ? "Varnish" : null,
    "x-cache": (v: string) => (v.includes("cloudfront") ? "AWS CloudFront" : null),
    "x-fw-version": () => "Flywheel",
    "x-kinsta-cache": () => "Kinsta",
    "x-litespeed-cache": () => "LiteSpeed",
    "x-sucuri-id": () => "Sucuri",
  } as Record<string, (v: string) => string | null>,

  serverPatterns: [
    { pattern: /nginx/i, tech: "Nginx" },
    { pattern: /apache/i, tech: "Apache" },
    { pattern: /cloudflare/i, tech: "Cloudflare" },
    { pattern: /microsoft-iis/i, tech: "Microsoft IIS" },
    { pattern: /litespeed/i, tech: "LiteSpeed" },
    { pattern: /openresty/i, tech: "OpenResty" },
    { pattern: /caddy/i, tech: "Caddy" },
    { pattern: /gunicorn/i, tech: "Gunicorn (Python)" },
    { pattern: /uvicorn/i, tech: "Uvicorn (Python)" },
    { pattern: /express/i, tech: "Express.js" },
    { pattern: /kestrel/i, tech: "Kestrel (.NET)" },
  ],

  cookies: {
    PHPSESSID: "PHP",
    JSESSIONID: "Java",
    "ASP.NET_SessionId": "ASP.NET",
    _rails_session: "Ruby on Rails",
    laravel_session: "Laravel (PHP)",
    CAKEPHP: "CakePHP",
    ci_session: "CodeIgniter (PHP)",
    symfony: "Symfony (PHP)",
    django: "Django (Python)",
    "express.sid": "Express.js",
  } as Record<string, string>,
};

// Rate-limited fetch with per-domain throttling
async function rateLimitedFetch(
  url: string,
  domain: string,
  options?: RequestInit
): Promise<Response> {
  const lastRequest = rateLimiter.get(domain) || 0;
  const timeSince = Date.now() - lastRequest;

  if (timeSince < RATE_LIMIT_MS) {
    await new Promise((r) => setTimeout(r, RATE_LIMIT_MS - timeSince));
  }

  rateLimiter.set(domain, Date.now());
  return fetch(url, options);
}

// Concurrency limiter
function createLimiter(concurrency: number) {
  let running = 0;
  const queue: (() => void)[] = [];

  return async function limit<T>(fn: () => Promise<T>): Promise<T> {
    while (running >= concurrency) {
      await new Promise<void>((resolve) => queue.push(resolve));
    }
    running++;
    try {
      return await fn();
    } finally {
      running--;
      if (queue.length > 0) {
        const next = queue.shift();
        if (next) next();
      }
    }
  };
}

// Query Certificate Transparency logs via crt.sh
async function queryCTLogs(domain: string): Promise<string[]> {
  try {
    console.log(`Querying CT logs for domain: ${domain}`);
    const response = await fetch(
      `https://crt.sh/?q=%25.${encodeURIComponent(domain)}&output=json`,
      { headers: { "User-Agent": "SubdomainSentinel/1.0" } }
    );

    if (!response.ok) {
      console.log(`CT log query failed with status: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const subdomains = new Set<string>();

    for (const cert of data) {
      if (cert.name_value) {
        const names = cert.name_value.split("\n");
        for (const name of names) {
          const trimmed = name.trim().toLowerCase();
          // Skip wildcards and non-matching domains
          if (
            trimmed &&
            !trimmed.startsWith("*") &&
            trimmed.endsWith(domain.toLowerCase()) &&
            trimmed !== domain.toLowerCase()
          ) {
            subdomains.add(trimmed);
          }
        }
      }
    }

    console.log(`Found ${subdomains.size} subdomains from CT logs`);
    return Array.from(subdomains);
  } catch (error) {
    console.error("CT log query error:", error);
    return [];
  }
}

// Query Wayback Machine for historical URLs
async function getWaybackUrls(subdomain: string): Promise<string[]> {
  try {
    const response = await fetch(
      `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(subdomain)}/*&output=json&collapse=urlkey&limit=50`,
      { headers: { "User-Agent": "SubdomainSentinel/1.0" } }
    );

    if (!response.ok) return [];

    const data = await response.json();
    // First row is headers, skip it
    if (data.length <= 1) return [];

    return data.slice(1).map((row: string[]) => row[2]); // URL is at index 2
  } catch {
    return [];
  }
}

async function resolveDNS(subdomain: string): Promise<{ ips: string[]; cname: string | null }> {
  try {
    const response = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(subdomain)}&type=A`
    );
    const data = await response.json();

    const ips: string[] = [];
    let cname: string | null = null;

    if (data.Answer) {
      for (const answer of data.Answer) {
        if (answer.type === 1) {
          // A record
          // Filter out private/internal IPs to prevent SSRF
          if (!isPrivateIP(answer.data)) {
            ips.push(answer.data);
          }
        } else if (answer.type === 5) {
          // CNAME record
          cname = answer.data;
        }
      }
    }

    return { ips, cname };
  } catch {
    return { ips: [], cname: null };
  }
}

async function checkHTTP(subdomain: string): Promise<{
  httpStatus: number | null;
  httpsStatus: number | null;
  server: string | null;
  technologies: string[];
  responseBody: string | null;
}> {
  let httpStatus: number | null = null;
  let httpsStatus: number | null = null;
  let server: string | null = null;
  const technologies: string[] = [];
  let responseBody: string | null = null;

  // Try HTTPS first
  try {
    const httpsResponse = await rateLimitedFetch(`https://${subdomain}`, subdomain, {
      method: "GET",
      redirect: "follow",
      headers: { "User-Agent": "SubdomainSentinel/1.0" },
    });
    httpsStatus = httpsResponse.status;
    server = httpsResponse.headers.get("server");

    // Collect technologies from headers
    for (const [headerName, detector] of Object.entries(TECH_SIGNATURES.headers)) {
      const headerValue = httpsResponse.headers.get(headerName);
      if (headerValue) {
        const tech = detector(headerValue);
        if (tech && !technologies.includes(tech)) {
          technologies.push(tech);
        }
      }
    }

    // Check server header against patterns
    if (server) {
      for (const { pattern, tech } of TECH_SIGNATURES.serverPatterns) {
        if (pattern.test(server) && !technologies.includes(tech)) {
          technologies.push(tech);
        }
      }
    }

    // Check cookies
    const cookies = httpsResponse.headers.get("set-cookie") || "";
    for (const [cookieName, tech] of Object.entries(TECH_SIGNATURES.cookies)) {
      if (cookies.includes(cookieName) && !technologies.includes(tech)) {
        technologies.push(tech);
      }
    }

    // Get response body for takeover verification (limit size)
    try {
      responseBody = await httpsResponse.text();
      if (responseBody.length > 10000) {
        responseBody = responseBody.substring(0, 10000);
      }
    } catch {
      // Ignore body read errors
    }
  } catch {
    // HTTPS failed, try HTTP
    try {
      const httpResponse = await rateLimitedFetch(`http://${subdomain}`, subdomain, {
        method: "GET",
        redirect: "follow",
        headers: { "User-Agent": "SubdomainSentinel/1.0" },
      });
      httpStatus = httpResponse.status;
      server = httpResponse.headers.get("server");

      // Same header checks for HTTP
      for (const [headerName, detector] of Object.entries(TECH_SIGNATURES.headers)) {
        const headerValue = httpResponse.headers.get(headerName);
        if (headerValue) {
          const tech = detector(headerValue);
          if (tech && !technologies.includes(tech)) {
            technologies.push(tech);
          }
        }
      }

      try {
        responseBody = await httpResponse.text();
        if (responseBody.length > 10000) {
          responseBody = responseBody.substring(0, 10000);
        }
      } catch {
        // Ignore body read errors
      }
    } catch {
      // Both failed
    }
  }

  return { httpStatus, httpsStatus, server, technologies, responseBody };
}

function detectCloudProvider(subdomain: string, cname: string | null): string | null {
  const toCheck = [subdomain, cname].filter(Boolean);

  for (const [provider, patterns] of Object.entries(CLOUD_PATTERNS)) {
    for (const pattern of patterns) {
      for (const target of toCheck) {
        if (target && pattern.test(target)) {
          return provider;
        }
      }
    }
  }
  return null;
}

function detectAnomaly(subdomain: string): { isAnomaly: boolean; reason: string | null } {
  for (const pattern of ANOMALY_PATTERNS) {
    if (pattern.test(subdomain)) {
      return { isAnomaly: true, reason: `Suspicious pattern: ${pattern.source}` };
    }
  }
  return { isAnomaly: false, reason: null };
}

function checkTakeoverVulnerability(
  cname: string | null,
  responseBody: string | null,
  httpStatus: number | null,
  httpsStatus: number | null
): { vulnerable: boolean; type: string | null; verified: boolean } {
  if (!cname) return { vulnerable: false, type: null, verified: false };

  for (const [type, fingerprint] of Object.entries(TAKEOVER_FINGERPRINTS)) {
    for (const pattern of fingerprint.patterns) {
      if (pattern.test(cname)) {
        // Pattern matched - potential vulnerability
        // Now try to verify by checking response body for error signatures
        let verified = false;

        if (responseBody) {
          for (const signature of fingerprint.errorSignatures) {
            if (responseBody.includes(signature)) {
              verified = true;
              break;
            }
          }
        }

        // Also check for 404 status on GitHub Pages
        if (type === "GitHub Pages" && (httpStatus === 404 || httpsStatus === 404)) {
          verified = true;
        }

        return { vulnerable: true, type, verified };
      }
    }
  }
  return { vulnerable: false, type: null, verified: false };
}

function calculateRiskScore(data: {
  isAnomaly: boolean;
  takeoverVulnerable: boolean;
  takeoverVerified: boolean;
  httpStatus: number | null;
  httpsStatus: number | null;
  cloudProvider: string | null;
  server: string | null;
  technologies: string[];
  exposedPorts: number[];
}): number {
  let score = 0;

  // Critical security issues (high weight)
  if (data.takeoverVerified)
    score += 50; // Verified takeover = critical
  else if (data.takeoverVulnerable) score += 30; // Potential takeover
  if (data.isAnomaly) score += 20;

  // HTTPS issues
  if (!data.httpsStatus && data.httpStatus) score += 15; // No HTTPS available

  // Exposure indicators (medium weight)
  if (data.httpStatus === 200 || data.httpsStatus === 200) score += 5; // Publicly accessible
  if (data.cloudProvider) score += 5; // Cloud asset exposure

  // Sensitive port exposure
  const sensitivePorts = [22, 23, 3306, 5432, 6379, 27017, 9200, 11211];
  const exposedSensitive = data.exposedPorts.filter((p) => sensitivePorts.includes(p));
  score += exposedSensitive.length * 10;

  // Information disclosure (low weight)
  if (data.server) score += 2; // Server header exposed
  if (data.technologies.length > 0) score += Math.min(data.technologies.length * 2, 6);

  return Math.min(score, 100);
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Subdomain scan function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { scanId, domain, options = {} }: ScanRequest = await req.json();

    // Validate domain input to prevent SSRF
    const domainValidation = isValidDomain(domain);
    if (!domainValidation.valid) {
      console.error(`Domain validation failed: ${domainValidation.error}`);
      return new Response(JSON.stringify({ error: domainValidation.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Starting scan for domain: ${domain}, scanId: ${scanId}`);

    // Update scan status to running
    await supabase
      .from("scans")
      .update({ status: "running", started_at: new Date().toISOString() })
      .eq("id", scanId);

    const discoveredSubdomains = new Set<string>();

    // 1. Query Certificate Transparency logs (real data source)
    if (options.ctLogs !== false) {
      const ctSubdomains = await queryCTLogs(domain);
      ctSubdomains.forEach((sub) => discoveredSubdomains.add(sub));
      console.log(`CT logs discovered ${ctSubdomains.length} subdomains`);
    }

    // 2. Generate subdomains from wordlist
    if (options.dnsBruteforce !== false) {
      for (const prefix of COMMON_SUBDOMAINS) {
        discoveredSubdomains.add(`${prefix}.${domain}`);
      }
      console.log(`Wordlist added ${COMMON_SUBDOMAINS.length} subdomains`);
    }

    // 3. Generate permutations for common bases
    const commonBases = ["api", "app", "dev", "staging", "test", "admin", "portal", "mail", "www"];
    for (const base of commonBases) {
      const permutations = generatePermutations(base, domain);
      permutations.forEach((p) => discoveredSubdomains.add(p));
    }

    console.log(`Total unique subdomains to check: ${discoveredSubdomains.size}`);

    const results: any[] = [];
    let activeCount = 0;
    let anomalyCount = 0;
    let cloudCount = 0;
    let takeoverCount = 0;

    // Create concurrency limiter
    const limit = createLimiter(MAX_CONCURRENT);

    // Process each subdomain with concurrency limiting
    const processingPromises = Array.from(discoveredSubdomains).map((subdomain) =>
      limit(async () => {
        console.log(`Checking subdomain: ${subdomain}`);

        // DNS Resolution
        const { ips, cname } = await resolveDNS(subdomain);

        // Skip if no DNS records found (subdomain doesn't exist)
        if (ips.length === 0 && !cname) {
          return null; // No real DNS records
        }

        // HTTP Check (with timeout)
        let httpData = {
          httpStatus: null as number | null,
          httpsStatus: null as number | null,
          server: null as string | null,
          technologies: [] as string[],
          responseBody: null as string | null,
        };

        if (options.httpProbe !== false) {
          try {
            httpData = await Promise.race([
              checkHTTP(subdomain),
              new Promise<typeof httpData>((_, reject) =>
                setTimeout(() => reject(new Error("timeout")), 10000)
              ),
            ]);
          } catch {
            // HTTP probe failed/timed out
          }
        }

        const isActive =
          httpData.httpStatus === 200 ||
          httpData.httpsStatus === 200 ||
          (httpData.httpsStatus !== null && httpData.httpsStatus < 500);

        // Cloud detection
        const cloudProvider = detectCloudProvider(subdomain, cname);

        // Anomaly detection
        const anomalyData = detectAnomaly(subdomain);

        // Takeover check with verification
        const takeoverData = checkTakeoverVulnerability(
          cname,
          httpData.responseBody,
          httpData.httpStatus,
          httpData.httpsStatus
        );

        // Get Wayback URLs for active subdomains
        let waybackUrls: string[] = [];
        if (isActive) {
          waybackUrls = await getWaybackUrls(subdomain);
        }

        // Calculate risk score with all data
        const riskScore = calculateRiskScore({
          isAnomaly: anomalyData.isAnomaly,
          takeoverVulnerable: takeoverData.vulnerable,
          takeoverVerified: takeoverData.verified,
          httpStatus: httpData.httpStatus,
          httpsStatus: httpData.httpsStatus,
          cloudProvider,
          server: httpData.server,
          technologies: httpData.technologies,
          exposedPorts: [], // Port scanning not implemented in this version
        });

        return {
          subdomain,
          ips,
          cname,
          httpData,
          isActive,
          cloudProvider,
          anomalyData,
          takeoverData,
          riskScore,
          waybackUrls,
        };
      })
    );

    // Wait for all processing to complete
    const processedResults = await Promise.all(processingPromises);

    // Filter out null results and build final results
    for (const result of processedResults) {
      if (!result) continue;

      if (result.isActive) activeCount++;
      if (result.cloudProvider) cloudCount++;
      if (result.anomalyData.isAnomaly) anomalyCount++;
      if (result.takeoverData.vulnerable) takeoverCount++;

      results.push({
        scan_id: scanId,
        name: result.subdomain,
        status: result.isActive ? "active" : "inactive",
        ip_addresses: result.ips,
        http_status: result.httpData.httpStatus,
        https_status: result.httpData.httpsStatus,
        technologies: result.httpData.technologies,
        server: result.httpData.server,
        cloud_provider: result.cloudProvider,
        risk_score: result.riskScore,
        is_anomaly: result.anomalyData.isAnomaly,
        anomaly_reason: result.anomalyData.reason,
        takeover_vulnerable: result.takeoverData.vulnerable,
        takeover_type: result.takeoverData.type,
        takeover_verified: result.takeoverData.verified,
        cname_record: result.cname,
        dns_records: { A: result.ips, CNAME: result.cname },
        wayback_urls: result.waybackUrls,
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString(),
      });
    }

    console.log(`Discovered ${results.length} real subdomains`);

    // Insert subdomains in batches
    const batchSize = 50;
    for (let i = 0; i < results.length; i += batchSize) {
      const batch = results.slice(i, i + batchSize);
      const { error: insertError } = await supabase.from("subdomains").insert(batch);

      if (insertError) {
        console.error("Error inserting subdomains:", insertError);
      }
    }

    // Update scan with results
    const { error: updateError } = await supabase
      .from("scans")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        total_subdomains: results.length,
        active_subdomains: activeCount,
        anomalies: anomalyCount,
        cloud_assets: cloudCount,
        takeover_vulnerable: takeoverCount,
      })
      .eq("id", scanId);

    if (updateError) {
      console.error("Error updating scan:", updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Scan completed. Found ${results.length} subdomains.`,
        stats: {
          total: results.length,
          active: activeCount,
          anomalies: anomalyCount,
          cloudAssets: cloudCount,
          takeoverVulnerable: takeoverCount,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    // Log the full error server-side for debugging
    console.error("Error in subdomain-scan function:", error.message, error.stack);

    // Return a generic error message to the client (no internal details)
    return new Response(JSON.stringify({ error: "Scan failed. Please try again later." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
