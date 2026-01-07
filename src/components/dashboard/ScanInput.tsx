import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search, Zap, Settings2 } from "lucide-react";

interface ScanInputProps {
  onScan: (domain: string) => void;
  isScanning: boolean;
}

export function ScanInput({ onScan, isScanning }: ScanInputProps) {
  const [domain, setDomain] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (domain.trim()) {
      onScan(domain.trim());
    }
  };

  return (
    <Card className="p-6 border-primary/20 bg-card/50 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="text-sm font-mono text-primary">RECONNAISSANCE CONSOLE</span>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Enter target domain (e.g., example.com)"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="pl-10 h-12 text-lg bg-background/50"
              disabled={isScanning}
            />
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-12 w-12 shrink-0"
            disabled={isScanning}
          >
            <Settings2 className="h-5 w-5" />
          </Button>

          <Button
            type="submit"
            variant="cyber"
            className="h-12 px-6 min-w-[140px]"
            disabled={!domain.trim() || isScanning}
          >
            {isScanning ? (
              <>
                <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span>Scanning...</span>
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                <span>Start Scan</span>
              </>
            )}
          </Button>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Passive Enum
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Active Brute
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            DNS Validation
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Tech Fingerprint
          </span>
        </div>
      </form>
    </Card>
  );
}
