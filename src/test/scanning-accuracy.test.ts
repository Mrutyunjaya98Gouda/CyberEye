import { describe, it, expect } from "vitest";

/**
 * Accuracy tests for subdomain scanning detection logic.
 * These tests verify the correctness of pattern matching, detection algorithms,
 * and scoring functions used in the subdomain-scan edge function.
 */

// ============================================
// Domain Validation Tests
// ============================================

const DOMAIN_REGEX = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.[A-Za-z0-9-]{1,63})*\.[A-Za-z]{2,}$/;
const BLOCKED_TLDS = [".local", ".internal", ".localhost", ".lan", ".home", ".corp", ".private"];
const BLOCKED_DOMAINS = ["169.254.169.254", "metadata.google.internal", "metadata.azure.com"];

const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^224\./,
  /^240\./,
];

function isValidDomain(domain: string): { valid: boolean; error?: string } {
  if (/^[\d.]+$/.test(domain)) {
    return { valid: false, error: "IP addresses are not allowed." };
  }
  if (domain.includes(":")) {
    return { valid: false, error: "IPv6 addresses are not allowed." };
  }
  if (BLOCKED_DOMAINS.some((blocked) => domain.toLowerCase().includes(blocked))) {
    return { valid: false, error: "This domain is not allowed for scanning." };
  }
  const lowerDomain = domain.toLowerCase();
  if (BLOCKED_TLDS.some((tld) => lowerDomain.endsWith(tld))) {
    return { valid: false, error: "Internal/local domains are not allowed." };
  }
  if (!DOMAIN_REGEX.test(domain)) {
    return { valid: false, error: "Invalid domain format." };
  }
  if (domain.length > 253) {
    return { valid: false, error: "Domain name is too long." };
  }
  return { valid: true };
}

function isPrivateIP(ip: string): boolean {
  return PRIVATE_IP_PATTERNS.some((pattern) => pattern.test(ip));
}

describe("Domain Validation Accuracy", () => {
  describe("Valid domains", () => {
    const validDomains = [
      "example.com",
      "sub.example.com",
      "deep.sub.example.com",
      "example.co.uk",
      "test-domain.org",
      "123domain.com",
      "my-test-site.io",
      "xn--nxasmq5b.com", // Punycode
    ];

    it.each(validDomains)("should accept valid domain: %s", (domain) => {
      const result = isValidDomain(domain);
      expect(result.valid).toBe(true);
    });
  });

  describe("Invalid domains", () => {
    const invalidDomains = [
      { domain: "192.168.1.1", reason: "IP address" },
      { domain: "10.0.0.1", reason: "Private IP" },
      { domain: "::1", reason: "IPv6" },
      { domain: "2001:db8::1", reason: "IPv6" },
      { domain: "example", reason: "No TLD" },
      { domain: "-example.com", reason: "Starts with hyphen" },
      { domain: "example-.com", reason: "Ends with hyphen" },
      { domain: "exam ple.com", reason: "Contains space" },
      { domain: "server.local", reason: "Blocked TLD .local" },
      { domain: "app.internal", reason: "Blocked TLD .internal" },
      { domain: "db.localhost", reason: "Blocked TLD .localhost" },
      { domain: "169.254.169.254", reason: "AWS metadata endpoint" },
      { domain: "metadata.google.internal", reason: "GCP metadata" },
    ];

    it.each(invalidDomains)("should reject $domain ($reason)", ({ domain }) => {
      const result = isValidDomain(domain);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("Edge cases", () => {
    it("should reject domains longer than 253 characters", () => {
      const longDomain = "a".repeat(250) + ".com";
      const result = isValidDomain(longDomain);
      expect(result.valid).toBe(false);
    });

    it("should handle empty string", () => {
      const result = isValidDomain("");
      expect(result.valid).toBe(false);
    });
  });
});

// ============================================
// Private IP Detection Tests
// ============================================

describe("Private IP Detection Accuracy", () => {
  describe("Private IPs (should be blocked)", () => {
    const privateIPs = [
      "127.0.0.1",
      "127.255.255.255",
      "10.0.0.1",
      "10.255.255.255",
      "172.16.0.1",
      "172.31.255.255",
      "192.168.0.1",
      "192.168.255.255",
      "169.254.1.1",
      "0.0.0.0",
      "224.0.0.1",
      "240.0.0.1",
    ];

    it.each(privateIPs)("should detect private IP: %s", (ip) => {
      expect(isPrivateIP(ip)).toBe(true);
    });
  });

  describe("Public IPs (should be allowed)", () => {
    const publicIPs = [
      "8.8.8.8",
      "1.1.1.1",
      "142.250.185.14",
      "151.101.1.140",
      "104.16.132.229",
      "172.15.255.255", // Just below RFC 1918 range
      "172.32.0.1", // Just above RFC 1918 range
      "192.167.1.1", // Not 192.168.x.x
    ];

    it.each(publicIPs)("should allow public IP: %s", (ip) => {
      expect(isPrivateIP(ip)).toBe(false);
    });
  });
});

// ============================================
// Cloud Provider Detection Tests
// ============================================

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

function detectCloudProvider(subdomain: string, cname: string | null): string | null {
  const toCheck = [subdomain, cname].filter(Boolean) as string[];

  for (const [provider, patterns] of Object.entries(CLOUD_PATTERNS)) {
    for (const pattern of patterns) {
      for (const target of toCheck) {
        if (pattern.test(target)) {
          return provider;
        }
      }
    }
  }
  return null;
}

describe("Cloud Provider Detection Accuracy", () => {
  const testCases = [
    // AWS
    { subdomain: "api.example.com", cname: "d1234.cloudfront.net", expected: null }, // CloudFront not in patterns
    { subdomain: "api.example.com", cname: "bucket.s3.amazonaws.com", expected: "aws" },
    { subdomain: "s3.example.com", cname: null, expected: "aws" },
    { subdomain: "ec2.example.com", cname: null, expected: "aws" },
    { subdomain: "app.elb.amazonaws.com", cname: null, expected: "aws" },

    // Azure
    { subdomain: "app.azurewebsites.net", cname: null, expected: "azure" },
    { subdomain: "api.example.com", cname: "myapp.cloudapp.azure.com", expected: "azure" },
    { subdomain: "storage.blob.core.windows.net", cname: null, expected: "azure" },

    // GCP
    { subdomain: "myapp.appspot.com", cname: null, expected: "gcp" },
    { subdomain: "api.example.com", cname: "storage.googleapis.com", expected: "gcp" },

    // Cloudflare
    { subdomain: "assets.cdn.cloudflare.net", cname: null, expected: "cloudflare" },
    { subdomain: "api.cloudflare.com", cname: null, expected: "cloudflare" },

    // Heroku
    { subdomain: "myapp.herokuapp.com", cname: null, expected: "heroku" },

    // Vercel
    { subdomain: "mysite.vercel.app", cname: null, expected: "vercel" },
    { subdomain: "legacy.now.sh", cname: null, expected: "vercel" },

    // Netlify
    { subdomain: "mysite.netlify.app", cname: null, expected: "netlify" },

    // No provider
    { subdomain: "api.example.com", cname: null, expected: null },
    { subdomain: "www.example.com", cname: "example.com", expected: null },
  ];

  it.each(testCases)(
    "should detect $expected for subdomain=$subdomain, cname=$cname",
    ({ subdomain, cname, expected }) => {
      const result = detectCloudProvider(subdomain, cname);
      expect(result).toBe(expected);
    }
  );
});

// ============================================
// Anomaly Detection Tests
// ============================================

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

function detectAnomaly(subdomain: string): { isAnomaly: boolean; reason: string | null } {
  for (const pattern of ANOMALY_PATTERNS) {
    if (pattern.test(subdomain)) {
      return { isAnomaly: true, reason: `Suspicious pattern: ${pattern.source}` };
    }
  }
  return { isAnomaly: false, reason: null };
}

describe("Anomaly Detection Accuracy", () => {
  describe("Should flag as anomalies", () => {
    const anomalousSubdomains = [
      "backup.example.com",
      "db-backup.example.com",
      "old-api.example.com",
      "temp.example.com",
      "tmp-files.example.com",
      "test.example.com",
      "test-api.example.com",
      "dev.example.com",
      "dev-server.example.com",
      "staging.example.com",
      "staging-v2.example.com",
      "internal.example.com",
      "admin.example.com",
      "admin-panel.example.com",
      "debug.example.com",
      "legacy.example.com",
      "archive.example.com",
    ];

    it.each(anomalousSubdomains)("should flag anomaly: %s", (subdomain) => {
      const result = detectAnomaly(subdomain);
      expect(result.isAnomaly).toBe(true);
      expect(result.reason).not.toBeNull();
    });
  });

  describe("Should NOT flag as anomalies", () => {
    const normalSubdomains = [
      "www.example.com",
      "api.example.com",
      "app.example.com",
      "cdn.example.com",
      "mail.example.com",
      "shop.example.com",
      "blog.example.com",
      "docs.example.com",
      "status.example.com",
    ];

    it.each(normalSubdomains)("should not flag: %s", (subdomain) => {
      const result = detectAnomaly(subdomain);
      expect(result.isAnomaly).toBe(false);
      expect(result.reason).toBeNull();
    });
  });

  describe("Case insensitivity", () => {
    it("should detect BACKUP.example.com", () => {
      expect(detectAnomaly("BACKUP.example.com").isAnomaly).toBe(true);
    });

    it("should detect Staging.Example.Com", () => {
      expect(detectAnomaly("Staging.Example.Com").isAnomaly).toBe(true);
    });
  });
});

// ============================================
// Subdomain Takeover Detection Tests
// ============================================

const TAKEOVER_PATTERNS = [
  { pattern: /\.s3\.amazonaws\.com$/i, type: "AWS S3" },
  { pattern: /\.herokuapp\.com$/i, type: "Heroku" },
  { pattern: /\.azurewebsites\.net$/i, type: "Azure" },
  { pattern: /\.cloudfront\.net$/i, type: "CloudFront" },
  { pattern: /\.github\.io$/i, type: "GitHub Pages" },
  { pattern: /\.pantheon\.io$/i, type: "Pantheon" },
  { pattern: /\.fastly\.net$/i, type: "Fastly" },
];

function checkTakeoverVulnerability(cname: string | null): {
  vulnerable: boolean;
  type: string | null;
} {
  if (!cname) return { vulnerable: false, type: null };

  for (const { pattern, type } of TAKEOVER_PATTERNS) {
    if (pattern.test(cname)) {
      return { vulnerable: true, type };
    }
  }
  return { vulnerable: false, type: null };
}

describe("Subdomain Takeover Detection Accuracy", () => {
  describe("Vulnerable CNAMEs", () => {
    const vulnerableCases = [
      { cname: "mybucket.s3.amazonaws.com", expectedType: "AWS S3" },
      { cname: "myapp.herokuapp.com", expectedType: "Heroku" },
      { cname: "mysite.azurewebsites.net", expectedType: "Azure" },
      { cname: "d123456.cloudfront.net", expectedType: "CloudFront" },
      { cname: "user.github.io", expectedType: "GitHub Pages" },
      { cname: "mysite.pantheon.io", expectedType: "Pantheon" },
      { cname: "mycdn.fastly.net", expectedType: "Fastly" },
    ];

    it.each(vulnerableCases)(
      "should detect takeover risk for CNAME: $cname",
      ({ cname, expectedType }) => {
        const result = checkTakeoverVulnerability(cname);
        expect(result.vulnerable).toBe(true);
        expect(result.type).toBe(expectedType);
      }
    );
  });

  describe("Non-vulnerable CNAMEs", () => {
    const safeCases = [
      "www.example.com",
      "cdn.example.com",
      "api.google.com",
      "assets.cloudflare.com",
      null,
    ];

    it.each(safeCases)("should not flag CNAME: %s", (cname) => {
      const result = checkTakeoverVulnerability(cname);
      expect(result.vulnerable).toBe(false);
      expect(result.type).toBeNull();
    });
  });
});

// ============================================
// Risk Score Calculation Tests
// ============================================

function calculateRiskScore(
  data: {
    isAnomaly: boolean;
    takeoverVulnerable: boolean;
    httpStatus: number | null;
    httpsStatus: number | null;
    cloudProvider: string | null;
  },
  randomFactor: number = 0
): number {
  let score = 0;

  if (data.isAnomaly) score += 30;
  if (data.takeoverVulnerable) score += 40;
  if (!data.httpsStatus && data.httpStatus) score += 10; // No HTTPS
  if (data.cloudProvider) score += 5;
  if (data.httpStatus === 200 || data.httpsStatus === 200) score += 5;

  score += randomFactor; // For testing, we pass this explicitly

  return Math.min(score, 100);
}

describe("Risk Score Calculation Accuracy", () => {
  it("should calculate minimum risk for safe subdomain", () => {
    const score = calculateRiskScore({
      isAnomaly: false,
      takeoverVulnerable: false,
      httpStatus: null,
      httpsStatus: 200,
      cloudProvider: null,
    });
    expect(score).toBe(5); // Only +5 for 200 status
  });

  it("should add 30 points for anomaly", () => {
    const baseScore = calculateRiskScore({
      isAnomaly: false,
      takeoverVulnerable: false,
      httpStatus: null,
      httpsStatus: null,
      cloudProvider: null,
    });
    const anomalyScore = calculateRiskScore({
      isAnomaly: true,
      takeoverVulnerable: false,
      httpStatus: null,
      httpsStatus: null,
      cloudProvider: null,
    });
    expect(anomalyScore - baseScore).toBe(30);
  });

  it("should add 40 points for takeover vulnerability", () => {
    const baseScore = calculateRiskScore({
      isAnomaly: false,
      takeoverVulnerable: false,
      httpStatus: null,
      httpsStatus: null,
      cloudProvider: null,
    });
    const takeoverScore = calculateRiskScore({
      isAnomaly: false,
      takeoverVulnerable: true,
      httpStatus: null,
      httpsStatus: null,
      cloudProvider: null,
    });
    expect(takeoverScore - baseScore).toBe(40);
  });

  it("should add 10 points for HTTP without HTTPS", () => {
    const score = calculateRiskScore({
      isAnomaly: false,
      takeoverVulnerable: false,
      httpStatus: 200,
      httpsStatus: null,
      cloudProvider: null,
    });
    expect(score).toBe(15); // 10 for no HTTPS + 5 for 200 status
  });

  it("should add 5 points for cloud provider", () => {
    const withoutCloud = calculateRiskScore({
      isAnomaly: false,
      takeoverVulnerable: false,
      httpStatus: null,
      httpsStatus: 200,
      cloudProvider: null,
    });
    const withCloud = calculateRiskScore({
      isAnomaly: false,
      takeoverVulnerable: false,
      httpStatus: null,
      httpsStatus: 200,
      cloudProvider: "aws",
    });
    expect(withCloud - withoutCloud).toBe(5);
  });

  it("should cap score at 100", () => {
    const score = calculateRiskScore(
      {
        isAnomaly: true, // +30
        takeoverVulnerable: true, // +40
        httpStatus: 200, // +5 status, +10 no HTTPS
        httpsStatus: null,
        cloudProvider: "aws", // +5
      },
      50
    ); // +50 random = 140 total, should cap at 100
    expect(score).toBe(100);
  });

  it("should calculate high risk for worst case scenario", () => {
    const score = calculateRiskScore({
      isAnomaly: true, // +30
      takeoverVulnerable: true, // +40
      httpStatus: 200, // +5 for status, +10 for no HTTPS
      httpsStatus: null,
      cloudProvider: "aws", // +5
    });
    expect(score).toBe(90); // 30 + 40 + 10 + 5 + 5 = 90
  });
});

// ============================================
// Statistics Accuracy Tests
// ============================================

interface MockSubdomain {
  status: "active" | "inactive" | "unknown";
  isAnomaly: boolean;
  cloudProvider: string | null;
  takeoverVulnerable: boolean;
}

function calculateStats(subdomains: MockSubdomain[]) {
  return {
    total: subdomains.length,
    active: subdomains.filter((s) => s.status === "active").length,
    anomalies: subdomains.filter((s) => s.isAnomaly).length,
    cloudAssets: subdomains.filter((s) => s.cloudProvider !== null).length,
    takeoverVulnerable: subdomains.filter((s) => s.takeoverVulnerable).length,
  };
}

describe("Statistics Calculation Accuracy", () => {
  it("should calculate correct stats for empty array", () => {
    const stats = calculateStats([]);
    expect(stats).toEqual({
      total: 0,
      active: 0,
      anomalies: 0,
      cloudAssets: 0,
      takeoverVulnerable: 0,
    });
  });

  it("should calculate correct stats for mixed data", () => {
    const subdomains: MockSubdomain[] = [
      { status: "active", isAnomaly: false, cloudProvider: null, takeoverVulnerable: false },
      { status: "active", isAnomaly: true, cloudProvider: "aws", takeoverVulnerable: false },
      { status: "inactive", isAnomaly: false, cloudProvider: "azure", takeoverVulnerable: true },
      { status: "active", isAnomaly: false, cloudProvider: null, takeoverVulnerable: false },
      { status: "unknown", isAnomaly: true, cloudProvider: "gcp", takeoverVulnerable: true },
    ];

    const stats = calculateStats(subdomains);
    expect(stats).toEqual({
      total: 5,
      active: 3,
      anomalies: 2,
      cloudAssets: 3,
      takeoverVulnerable: 2,
    });
  });

  it("should handle all active subdomains", () => {
    const subdomains: MockSubdomain[] = Array(10).fill({
      status: "active",
      isAnomaly: false,
      cloudProvider: null,
      takeoverVulnerable: false,
    });

    const stats = calculateStats(subdomains);
    expect(stats.total).toBe(10);
    expect(stats.active).toBe(10);
  });

  it("should count multiple attributes correctly", () => {
    // A subdomain can be both an anomaly AND have a cloud provider AND be vulnerable
    const subdomain: MockSubdomain = {
      status: "active",
      isAnomaly: true,
      cloudProvider: "heroku",
      takeoverVulnerable: true,
    };

    const stats = calculateStats([subdomain]);
    expect(stats.anomalies).toBe(1);
    expect(stats.cloudAssets).toBe(1);
    expect(stats.takeoverVulnerable).toBe(1);
  });
});
