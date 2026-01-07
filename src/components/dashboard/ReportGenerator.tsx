import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Subdomain, ScanResult } from "@/types/subdomain";
import { FileText, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";

interface ReportGeneratorProps {
  scanResult: ScanResult;
  subdomains: Subdomain[];
}

export function ReportGenerator({ scanResult, subdomains }: ReportGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const generatePDF = async () => {
    setIsGenerating(true);

    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPos = 20;

      // Helper function to add new page if needed
      const checkPageBreak = (height: number) => {
        if (yPos + height > pageHeight - 20) {
          pdf.addPage();
          yPos = 20;
        }
      };

      // Header
      pdf.setFillColor(114, 14, 30); // Wine red
      pdf.rect(0, 0, pageWidth, 40, "F");

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(24);
      pdf.setFont("helvetica", "bold");
      pdf.text("CYBEREYE", 20, 25);

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text("Attack Surface Reconnaissance Report", 20, 33);

      yPos = 55;

      // Report Info
      pdf.setTextColor(50, 50, 50);
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text(`Target Domain: ${scanResult.targetDomain}`, 20, yPos);
      yPos += 8;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.text(`Report Generated: ${new Date().toLocaleString()}`, 20, yPos);
      yPos += 5;
      pdf.text(
        `Scan Completed: ${scanResult.scanCompleted ? new Date(scanResult.scanCompleted).toLocaleString() : "N/A"}`,
        20,
        yPos
      );
      yPos += 15;

      // Executive Summary
      checkPageBreak(60);
      pdf.setFillColor(240, 240, 240);
      pdf.rect(15, yPos - 5, pageWidth - 30, 50, "F");

      pdf.setTextColor(114, 14, 30);
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("Executive Summary", 20, yPos + 5);
      yPos += 15;

      pdf.setTextColor(50, 50, 50);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");

      const summaryData = [
        `Total Subdomains Discovered: ${scanResult.totalSubdomains}`,
        `Active Subdomains: ${scanResult.activeSubdomains} (${Math.round((scanResult.activeSubdomains / scanResult.totalSubdomains) * 100) || 0}%)`,
        `Anomalies Detected: ${scanResult.anomalies}`,
        `Cloud Assets: ${scanResult.cloudAssets}`,
        `Takeover Vulnerabilities: ${scanResult.takeoverVulnerable}`,
      ];

      summaryData.forEach((line) => {
        pdf.text(line, 25, yPos);
        yPos += 6;
      });
      yPos += 15;

      // Risk Assessment
      checkPageBreak(30);
      pdf.setTextColor(114, 14, 30);
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("Risk Assessment", 20, yPos);
      yPos += 10;

      const riskLevel =
        scanResult.takeoverVulnerable > 5
          ? "CRITICAL"
          : scanResult.takeoverVulnerable > 0 || scanResult.anomalies > 10
            ? "HIGH"
            : scanResult.anomalies > 5
              ? "MEDIUM"
              : "LOW";

      if (riskLevel === "CRITICAL") pdf.setFillColor(255, 0, 0);
      else if (riskLevel === "HIGH") pdf.setFillColor(255, 100, 0);
      else if (riskLevel === "MEDIUM") pdf.setFillColor(255, 200, 0);
      else pdf.setFillColor(0, 200, 100);
      pdf.roundedRect(20, yPos - 3, 60, 12, 2, 2, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.text(`Overall Risk: ${riskLevel}`, 25, yPos + 5);
      yPos += 20;

      // Detailed Findings
      checkPageBreak(30);
      pdf.setTextColor(114, 14, 30);
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("Detailed Findings", 20, yPos);
      yPos += 12;

      // Anomalies Table
      const anomalies = subdomains.filter((s) => s.isAnomaly);
      if (anomalies.length > 0) {
        checkPageBreak(20 + anomalies.length * 8);
        pdf.setTextColor(50, 50, 50);
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.text("Anomalous Subdomains", 25, yPos);
        yPos += 8;

        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        anomalies.slice(0, 15).forEach((sub) => {
          checkPageBreak(8);
          pdf.text(
            `• ${sub.name} - ${sub.anomalyReason || "Suspicious pattern detected"}`,
            30,
            yPos
          );
          yPos += 6;
        });
        if (anomalies.length > 15) {
          pdf.text(`... and ${anomalies.length - 15} more`, 30, yPos);
          yPos += 6;
        }
        yPos += 8;
      }

      // Takeover Vulnerabilities
      const takeoverVuln = subdomains.filter((s) => s.takeoverVulnerable);
      if (takeoverVuln.length > 0) {
        checkPageBreak(20 + takeoverVuln.length * 8);
        pdf.setTextColor(255, 0, 0);
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.text("Subdomain Takeover Vulnerabilities", 25, yPos);
        yPos += 8;

        pdf.setTextColor(50, 50, 50);
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        takeoverVuln.slice(0, 10).forEach((sub) => {
          checkPageBreak(8);
          pdf.text(`• ${sub.name} - Type: ${sub.takeoverType || "Unknown"}`, 30, yPos);
          yPos += 6;
        });
        yPos += 8;
      }

      // Cloud Assets
      const cloudAssets = subdomains.filter((s) => s.cloudProvider);
      if (cloudAssets.length > 0) {
        checkPageBreak(30);
        pdf.setTextColor(0, 150, 255);
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.text("Cloud Assets", 25, yPos);
        yPos += 8;

        const cloudCounts = cloudAssets.reduce(
          (acc, s) => {
            acc[s.cloudProvider!] = (acc[s.cloudProvider!] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        );

        pdf.setTextColor(50, 50, 50);
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        Object.entries(cloudCounts).forEach(([provider, count]) => {
          checkPageBreak(8);
          pdf.text(`• ${provider.toUpperCase()}: ${count} assets`, 30, yPos);
          yPos += 6;
        });
        yPos += 8;
      }

      // Full Subdomain List (new page)
      pdf.addPage();
      yPos = 20;

      pdf.setTextColor(114, 14, 30);
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("Complete Subdomain List", 20, yPos);
      yPos += 12;

      pdf.setTextColor(50, 50, 50);
      pdf.setFontSize(7);
      pdf.setFont("helvetica", "normal");

      // Table headers
      pdf.setFont("helvetica", "bold");
      pdf.text("Subdomain", 20, yPos);
      pdf.text("Status", 100, yPos);
      pdf.text("Risk", 130, yPos);
      pdf.text("Cloud", 150, yPos);
      yPos += 6;

      pdf.setFont("helvetica", "normal");
      subdomains.forEach((sub, index) => {
        checkPageBreak(6);

        const name = sub.name.length > 45 ? sub.name.substring(0, 42) + "..." : sub.name;
        pdf.text(name, 20, yPos);
        pdf.text(sub.status, 100, yPos);
        pdf.text(String(sub.riskScore), 130, yPos);
        pdf.text(sub.cloudProvider || "-", 150, yPos);
        yPos += 5;
      });

      // Footer on each page
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setTextColor(150, 150, 150);
        pdf.setFontSize(8);
        pdf.text(
          `CyberEye Report - Page ${i} of ${totalPages} - Confidential`,
          pageWidth / 2,
          pageHeight - 10,
          { align: "center" }
        );
      }

      // Save
      pdf.save(`${scanResult.targetDomain}-cybereye-report.pdf`);
      toast.success("PDF report generated successfully");
      setIsOpen(false);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate report");
    } finally {
      setIsGenerating(false);
    }
  };

  const generateHTML = () => {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CyberEye Report - ${scanResult.targetDomain}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0a0a0a; color: #e0e0e0; }
    .header { background: linear-gradient(135deg, #720e1e, #4a0510); padding: 40px; }
    .header h1 { color: white; font-size: 32px; margin-bottom: 8px; }
    .header p { color: rgba(255,255,255,0.8); }
    .container { max-width: 1200px; margin: 0 auto; padding: 40px 20px; }
    .card { background: #1a1a1a; border: 1px solid #2a1515; border-radius: 8px; padding: 24px; margin-bottom: 24px; }
    .card h2 { color: #720e1e; margin-bottom: 16px; font-size: 20px; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
    .stat { background: #0a0a0a; padding: 20px; border-radius: 8px; text-align: center; }
    .stat-value { font-size: 36px; font-weight: bold; color: #720e1e; }
    .stat-label { color: #808080; font-size: 14px; margin-top: 4px; }
    .risk-high { color: #ff3333; }
    .risk-medium { color: #ffcc00; }
    .risk-low { color: #00ff99; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #2a1515; }
    th { color: #720e1e; font-weight: 600; }
    tr:hover { background: rgba(114, 14, 30, 0.1); }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; }
    .badge-active { background: rgba(0, 255, 153, 0.2); color: #00ff99; }
    .badge-inactive { background: rgba(128, 128, 128, 0.2); color: #808080; }
    .badge-anomaly { background: rgba(255, 51, 51, 0.2); color: #ff3333; }
  </style>
</head>
<body>
  <div class="header">
    <h1>CYBEREYE</h1>
    <p>Attack Surface Reconnaissance Report</p>
  </div>
  
  <div class="container">
    <div class="card">
      <h2>Target: ${scanResult.targetDomain}</h2>
      <p>Generated: ${new Date().toLocaleString()}</p>
    </div>

    <div class="card">
      <h2>Summary</h2>
      <div class="stats-grid">
        <div class="stat">
          <div class="stat-value">${scanResult.totalSubdomains}</div>
          <div class="stat-label">Total Subdomains</div>
        </div>
        <div class="stat">
          <div class="stat-value" style="color: #00ff99">${scanResult.activeSubdomains}</div>
          <div class="stat-label">Active</div>
        </div>
        <div class="stat">
          <div class="stat-value" style="color: #ff3333">${scanResult.anomalies}</div>
          <div class="stat-label">Anomalies</div>
        </div>
        <div class="stat">
          <div class="stat-value" style="color: #00ccff">${scanResult.cloudAssets}</div>
          <div class="stat-label">Cloud Assets</div>
        </div>
        <div class="stat">
          <div class="stat-value" style="color: #ffcc00">${scanResult.takeoverVulnerable}</div>
          <div class="stat-label">Takeover Risks</div>
        </div>
      </div>
    </div>

    <div class="card">
      <h2>Subdomain Details</h2>
      <table>
        <thead>
          <tr>
            <th>Subdomain</th>
            <th>Status</th>
            <th>Risk Score</th>
            <th>Cloud</th>
            <th>Technologies</th>
          </tr>
        </thead>
        <tbody>
          ${subdomains
            .map(
              (sub) => `
            <tr>
              <td>${sub.name}</td>
              <td><span class="badge ${sub.isAnomaly ? "badge-anomaly" : sub.status === "active" ? "badge-active" : "badge-inactive"}">${sub.isAnomaly ? "Anomaly" : sub.status}</span></td>
              <td class="${sub.riskScore > 50 ? "risk-high" : sub.riskScore > 25 ? "risk-medium" : "risk-low"}">${sub.riskScore}</td>
              <td>${sub.cloudProvider || "-"}</td>
              <td>${sub.technologies.slice(0, 3).join(", ") || "-"}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${scanResult.targetDomain}-cybereye-report.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("HTML report generated successfully");
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="cyber" size="sm">
          <FileText className="h-4 w-4 mr-2" />
          Generate Report
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-primary font-mono">Generate Report</DialogTitle>
          <DialogDescription>
            Export a comprehensive security report for {scanResult.targetDomain}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <Card className="p-4 bg-muted/30 border-border">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">PDF Report</h4>
                <p className="text-sm text-muted-foreground">Professional formatted document</p>
              </div>
              <Button variant="outline" onClick={generatePDF} disabled={isGenerating}>
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    PDF
                  </>
                )}
              </Button>
            </div>
          </Card>

          <Card className="p-4 bg-muted/30 border-border">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">HTML Report</h4>
                <p className="text-sm text-muted-foreground">Interactive web-based report</p>
              </div>
              <Button variant="outline" onClick={generateHTML}>
                <Download className="h-4 w-4 mr-2" />
                HTML
              </Button>
            </div>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
