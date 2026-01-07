import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Subdomain } from "@/types/subdomain";
import { Download, FileJson, FileText, FileSpreadsheet } from "lucide-react";
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
      "ip",
      "status",
      "httpStatus",
      "riskScore",
      "cloudProvider",
      "isAnomaly",
      "technologies",
      "server",
    ];
    const rows = subdomains.map((sub) => [
      sub.name,
      sub.ipAddresses.join(";") || "",
      sub.status,
      sub.httpStatus || sub.httpsStatus || "",
      sub.riskScore,
      sub.cloudProvider || "",
      sub.isAnomaly,
      sub.technologies.join(";"),
      sub.server || "",
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
        </div>
      </div>
    </Card>
  );
}
