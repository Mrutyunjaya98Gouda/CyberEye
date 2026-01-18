# Subdomain Sentinel - Improvement Recommendations

## ✅ Completed Improvements (v2.1.0)

The following improvements from the original recommendations have been implemented:

| Improvement                                    | Status         |
| ---------------------------------------------- | -------------- |
| Real CT log integration (crt.sh)               | ✅ Implemented |
| Takeover verification with error signatures    | ✅ Implemented |
| Deterministic risk scoring (no random factors) | ✅ Implemented |
| Extended wordlist (~200 patterns)              | ✅ Implemented |
| DNS permutation generation                     | ✅ Implemented |
| Rate limiting & concurrency control            | ✅ Implemented |
| Enhanced tech fingerprinting (20+ signatures)  | ✅ Implemented |
| Wayback Machine integration                    | ✅ Implemented |
| CSV export with full fields                    | ✅ Implemented |
| Markdown report export                         | ✅ Implemented |

---

## 🔴 High Priority - Next Phase

### 1. Add API Key Management for External Services

**Current Issue:** External APIs (Shodan, SecurityTrails, VirusTotal) are not integrated due to missing key management.

**Recommendation:** Create a secure settings page for API key storage:

```typescript
interface APIKeys {
  shodan?: string;
  securityTrails?: string;
  virusTotal?: string;
  censys?: string;
  binaryEdge?: string;
}

// Store encrypted in Supabase
async function saveAPIKeys(userId: string, keys: APIKeys): Promise<void> {
  const encrypted = await encryptKeys(keys);
  await supabase.from("user_settings").upsert({
    user_id: userId,
    api_keys: encrypted,
  });
}
```

---

### 2. Implement Active Port Scanning

**Current Issue:** Port scanning structure exists but no actual scanning is performed.

**Recommendation:** Add passive port data from Shodan when API key is available:

```typescript
async function getPortsFromShodan(ip: string, apiKey: string): Promise<PortInfo[]> {
  const response = await fetch(`https://api.shodan.io/shodan/host/${ip}?key=${apiKey}`);
  const data = await response.json();
  return (
    data.ports?.map((port) => ({
      port,
      service: data.data?.find((d) => d.port === port)?.product || "unknown",
      state: "open",
      banner: data.data?.find((d) => d.port === port)?.data?.substring(0, 200),
    })) || []
  );
}
```

---

### 3. Add Scan Resume Capability

**Current Issue:** Interrupted scans lose all progress.

**Recommendation:** Store scan progress checkpoints:

```sql
ALTER TABLE scans ADD COLUMN checkpoint JSONB;
ALTER TABLE scans ADD COLUMN processed_count INTEGER DEFAULT 0;
```

```typescript
// Save checkpoint every N subdomains
if (processedCount % 50 === 0) {
  await supabase
    .from("scans")
    .update({
      checkpoint: { lastIndex: processedCount, partialResults: results },
      processed_count: processedCount,
    })
    .eq("id", scanId);
}
```

---

### 4. Implement Diff/Change Detection

**Current Issue:** No way to track changes between scans.

**Recommendation:** Add comparison logic:

```typescript
interface ScanDiff {
  newSubdomains: string[];
  removedSubdomains: string[];
  changedSubdomains: {
    name: string;
    changes: { field: string; old: any; new: any }[];
  }[];
}

async function compareScan(currentScanId: string, previousScanId: string): Promise<ScanDiff> {
  const current = await getSubdomains(currentScanId);
  const previous = await getSubdomains(previousScanId);

  const currentNames = new Set(current.map((s) => s.name));
  const previousNames = new Set(previous.map((s) => s.name));

  return {
    newSubdomains: [...currentNames].filter((n) => !previousNames.has(n)),
    removedSubdomains: [...previousNames].filter((n) => !currentNames.has(n)),
    changedSubdomains: detectChanges(current, previous),
  };
}
```

---

## 🟡 Medium Priority

### 5. Add Scheduled/Recurring Scans

Allow users to schedule periodic scans with notifications for changes.

```typescript
interface ScheduledScan {
  id: string;
  userId: string;
  domain: string;
  frequency: "daily" | "weekly" | "monthly";
  lastRun: string;
  nextRun: string;
  notifyOnChange: boolean;
}
```

**Implementation:** Use Supabase Edge Function with cron triggers.

---

### 6. Add DNS Zone Transfer Detection

Test for misconfigured DNS servers allowing zone transfers:

```typescript
async function checkZoneTransfer(domain: string): Promise<boolean> {
  // Query for NS records
  const nsRecords = await queryDNS(domain, "NS");

  for (const ns of nsRecords) {
    try {
      // Attempt AXFR
      const axfrResult = await attemptAXFR(ns, domain);
      if (axfrResult.success) {
        return true; // Vulnerable!
      }
    } catch {
      continue;
    }
  }
  return false;
}
```

---

### 7. Add WHOIS Integration

Fetch domain registration details for context:

```typescript
interface WhoisData {
  registrar: string;
  createdDate: string;
  expiryDate: string;
  nameServers: string[];
  dnssec: boolean;
}

async function getWhoisData(domain: string): Promise<WhoisData | null> {
  const response = await fetch(`https://whois.iana.org/${domain}`);
  // Parse WHOIS response
  return parseWhoisResponse(await response.text());
}
```

---

### 8. Add SSL/TLS Certificate Analysis

Analyze SSL certificates for security issues:

```typescript
interface SSLAnalysis {
  issuer: string;
  validFrom: string;
  validTo: string;
  daysUntilExpiry: number;
  protocol: string;
  cipherSuite: string;
  vulnerabilities: string[]; // e.g., 'Weak cipher', 'Expired soon'
}
```

---

### 9. Implement Real-time Scan Progress

Add WebSocket or Server-Sent Events for live updates:

```typescript
// In edge function
for (const [index, subdomain] of subdomains.entries()) {
  // Process subdomain...

  // Send progress update
  await supabase.from("scan_progress").insert({
    scan_id: scanId,
    progress: (index / subdomains.length) * 100,
    current_subdomain: subdomain,
    found_count: results.length,
  });
}
```

---

## 🟢 Low Priority

### 10. Add Burp Suite Integration

Export results in Burp Suite compatible format for further testing:

```typescript
function exportToBurp(subdomains: Subdomain[]): string {
  const urls = subdomains.filter((s) => s.status === "active").map((s) => `https://${s.name}`);
  return urls.join("\n");
}
```

---

### 11. Add Nuclei Template Generation

Generate Nuclei templates for discovered vulnerabilities:

```yaml
id: subdomain-takeover-{{subdomain}}
info:
  name: Potential Subdomain Takeover - {{subdomain}}
  severity: high
http:
  - method: GET
    path:
      - "{{BaseURL}}"
    matchers:
      - type: word
        words:
          - "NoSuchBucket"
          - "no-such-app"
```

---

### 12. Add Team Collaboration Features

- Shared workspaces
- Role-based access control
- Scan result sharing via link
- Comments on findings

---

### 13. Implement Dark Web Monitoring

Check for domain mentions in dark web data sources:

```typescript
interface DarkWebMention {
  source: string;
  date: string;
  context: string;
  riskLevel: "low" | "medium" | "high";
}
```

---

### 14. Add Custom Wordlist Support

Allow users to upload/manage custom subdomain wordlists:

```typescript
interface CustomWordlist {
  id: string;
  userId: string;
  name: string;
  words: string[];
  createdAt: string;
}
```

---

## Implementation Priority Matrix

| Priority  | Improvement            | Effort | Impact | Dependencies  |
| --------- | ---------------------- | ------ | ------ | ------------- |
| 🔴 High   | API Key Management     | Medium | High   | None          |
| 🔴 High   | Port Scanning (Shodan) | Low    | High   | API Keys      |
| 🔴 High   | Scan Resume            | Medium | Medium | None          |
| 🔴 High   | Change Detection       | Medium | High   | None          |
| 🟡 Medium | Scheduled Scans        | High   | High   | Cron setup    |
| 🟡 Medium | Zone Transfer          | Low    | Medium | None          |
| 🟡 Medium | WHOIS Integration      | Low    | Low    | None          |
| 🟡 Medium | SSL Analysis           | Medium | Medium | None          |
| 🟡 Medium | Real-time Progress     | Medium | Medium | WebSocket     |
| 🟢 Low    | Burp Integration       | Low    | Low    | None          |
| 🟢 Low    | Nuclei Templates       | Low    | Medium | None          |
| 🟢 Low    | Team Features          | High   | Medium | Auth changes  |
| 🟢 Low    | Dark Web Monitoring    | High   | Medium | External APIs |
| 🟢 Low    | Custom Wordlists       | Medium | Medium | Storage       |

---

## Current Test Coverage

**Total Tests: 118 (all passing)**

- ✅ Domain validation (valid/invalid formats, SSRF prevention)
- ✅ Private IP detection (RFC 1918, loopback, link-local)
- ✅ Cloud provider detection (AWS, Azure, GCP, Cloudflare, etc.)
- ✅ Anomaly detection (backup, staging, dev, admin patterns)
- ✅ Subdomain takeover detection (S3, Heroku, Azure, GitHub Pages)
- ✅ Risk score calculation (deterministic scoring)
- ✅ Statistics calculation accuracy

---

_Last updated: January 2026_
