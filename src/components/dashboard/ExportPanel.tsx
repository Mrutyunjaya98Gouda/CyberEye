import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Subdomain } from "@/types/subdomain";
import { Download, FileJson, FileText, FileSpreadsheet, FileCode } from "lucide-react";
import { toast } from "sonner";

interface ExportPanelProps {
  subdomains: Subdomain[];
  targetDomain: string;
}

export function ExportPanel({ subdomains, targetDomain }: ExportPanelProps) {
  const exportJson = () => {
    const blob = new Blob([JSON.stringify(subdomains, null, 2)], { type: "application/json" });
    downloadFile(blob, `${targetDomain}-subdomains.json`);
    toast.success("Exported to JSON");
  };

  const exportCsv = () => {
    const headers = [
      "name",
      "status",
      "ip_addresses",
      "http_status",
      "https_status",
      "risk_score",
      "cloud_provider",
      "is_anomaly",
      "anomaly_reason",
      "takeover_vulnerable",
      "takeover_type",
      "technologies",
      "server",
      "cname_record",
      "wayback_urls_count",
      "first_seen",
      "last_seen",
    ];

    const escapeCSV = (value: string | null | undefined): string => {
      if (value === null || value === undefined) return "";
      const str = String(value);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = subdomains.map((sub) => [
      escapeCSV(sub.name),
      escapeCSV(sub.status),
      escapeCSV(sub.ipAddresses.join(";")),
      sub.httpStatus || "",
      sub.httpsStatus || "",
      sub.riskScore,
      escapeCSV(sub.cloudProvider),
      sub.isAnomaly,
      escapeCSV(sub.anomalyReason),
      sub.takeoverVulnerable,
      escapeCSV(sub.takeoverType),
      escapeCSV(sub.technologies.join(";")),
      escapeCSV(sub.server),
      escapeCSV(sub.cnameRecord),
      sub.waybackUrls?.length || 0,
      sub.firstSeen,
      sub.lastSeen,
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    downloadFile(blob, `${targetDomain}-subdomains.csv`);
    toast.success("Exported to CSV");
  };

  const exportTxt = () => {
    const txt = subdomains.map((sub) => sub.name).join("\n");
    const blob = new Blob([txt], { type: "text/plain" });
    downloadFile(blob, `${targetDomain}-subdomains.txt`);
    toast.success("Exported to TXT");
  };

  const exportMarkdown = () => {
    const now = new Date().toISOString();
    const activeCount = subdomains.filter((s) => s.status === "active").length;
    const anomalyCount = subdomains.filter((s) => s.isAnomaly).length;
    const takeoverCount = subdomains.filter((s) => s.takeoverVulnerable).length;
    const cloudCount = subdomains.filter((s) => s.cloudProvider).length;
    const highRiskCount = subdomains.filter((s) => s.riskScore >= 70).length;
    const mediumRiskCount = subdomains.filter((s) => s.riskScore >= 40 && s.riskScore < 70).length;
    const lowRiskCount = subdomains.filter((s) => s.riskScore < 40).length;

    let md = `# Subdomain Reconnaissance Report\n\n`;
    md += `**Target Domain:** ${targetDomain}\n`;
    md += `**Generated:** ${now}\n`;
    md += `**Tool:** Subdomain Sentinel\n\n`;

    md += `## Executive Summary\n\n`;
    md += `| Metric | Count |\n`;
    md += `|--------|-------|\n`;
    md += `| Total Subdomains | ${subdomains.length} |\n`;
    md += `| Active | ${activeCount} |\n`;
    md += `| Anomalies | ${anomalyCount} |\n`;
    md += `| Takeover Vulnerable | ${takeoverCount} |\n`;
    md += `| Cloud Assets | ${cloudCount} |\n\n`;

    md += `## Risk Distribution\n\n`;
    md += `| Risk Level | Count |\n`;
    md += `|------------|-------|\n`;
    md += `| 🔴 High (70-100) | ${highRiskCount} |\n`;
    md += `| 🟡 Medium (40-69) | ${mediumRiskCount} |\n`;
    md += `| 🟢 Low (0-39) | ${lowRiskCount} |\n\n`;

    // High risk subdomains section
    const highRiskSubs = subdomains
      .filter((s) => s.riskScore >= 70)
      .sort((a, b) => b.riskScore - a.riskScore);
    if (highRiskSubs.length > 0) {
      md += `## ⚠️ High Risk Subdomains\n\n`;
      for (const sub of highRiskSubs) {
        md += `### ${sub.name}\n`;
        md += `- **Risk Score:** ${sub.riskScore}/100\n`;
        md += `- **Status:** ${sub.status}\n`;
        if (sub.takeoverVulnerable) md += `- **🚨 Takeover Vulnerable:** ${sub.takeoverType}\n`;
        if (sub.isAnomaly) md += `- **⚡ Anomaly:** ${sub.anomalyReason}\n`;
        if (sub.cloudProvider) md += `- **Cloud Provider:** ${sub.cloudProvider}\n`;
        if (sub.technologies.length > 0)
          md += `- **Technologies:** ${sub.technologies.join(", ")}\n`;
        md += `\n`;
      }
    }

    // Takeover vulnerabilities section
    const takeoverSubs = subdomains.filter((s) => s.takeoverVulnerable);
    if (takeoverSubs.length > 0) {
      md += `## 🔓 Subdomain Takeover Vulnerabilities\n\n`;
      md += `| Subdomain | Type | CNAME | Status |\n`;
      md += `|-----------|------|-------|--------|\n`;
      for (const sub of takeoverSubs) {
        md += `| ${sub.name} | ${sub.takeoverType || "Unknown"} | ${sub.cnameRecord || "N/A"} | ${sub.status} |\n`;
      }
      md += `\n`;
    }

    // Cloud assets section
    const cloudSubs = subdomains.filter((s) => s.cloudProvider);
    if (cloudSubs.length > 0) {
      md += `## ☁️ Cloud Assets\n\n`;
      const byProvider: Record<string, Subdomain[]> = {};
      for (const sub of cloudSubs) {
        const provider = sub.cloudProvider || "unknown";
        if (!byProvider[provider]) byProvider[provider] = [];
        byProvider[provider].push(sub);
      }
      for (const [provider, subs] of Object.entries(byProvider)) {
        md += `### ${provider.toUpperCase()}\n`;
        for (const sub of subs) {
          md += `- ${sub.name}\n`;
        }
        md += `\n`;
      }
    }

    // All subdomains table
    md += `## All Subdomains\n\n`;
    md += `| Subdomain | Status | Risk | Technologies | Cloud |\n`;
    md += `|-----------|--------|------|--------------|-------|\n`;
    for (const sub of subdomains.sort((a, b) => b.riskScore - a.riskScore)) {
      const riskEmoji = sub.riskScore >= 70 ? "🔴" : sub.riskScore >= 40 ? "🟡" : "🟢";
      md += `| ${sub.name} | ${sub.status} | ${riskEmoji} ${sub.riskScore} | ${sub.technologies.slice(0, 3).join(", ")} | ${sub.cloudProvider || "-"} |\n`;
    }
    md += `\n`;

    md += `---\n`;
    md += `*Report generated by Subdomain Sentinel*\n`;

    const blob = new Blob([md], { type: "text/markdown" });
    downloadFile(blob, `${targetDomain}-report.md`);
    toast.success("Exported Markdown Report");
  };

  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="p-4 border-border/50 bg-card/30 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Download className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Export Results</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportJson}>
            <FileJson className="h-4 w-4" />
            <span>JSON</span>
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <FileSpreadsheet className="h-4 w-4" />
            <span>CSV</span>
          </Button>
          <Button variant="outline" size="sm" onClick={exportTxt}>
            <FileText className="h-4 w-4" />
            <span>TXT</span>
          </Button>
          <Button variant="outline" size="sm" onClick={exportMarkdown}>
            <FileCode className="h-4 w-4" />
            <span>Report</span>
          </Button>
        </div>
      </div>
    </Card>
  );
}
