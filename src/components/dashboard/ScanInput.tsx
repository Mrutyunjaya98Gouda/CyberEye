import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Zap, Settings2 } from "lucide-react";
import { ScanOptions } from "@/types/subdomain";

interface ScanInputProps {
  onScan: (domain: string, options?: ScanOptions) => void;
  isScanning: boolean;
}

export function ScanInput({ onScan, isScanning }: ScanInputProps) {
  const [domain, setDomain] = useState("");
  const [options, setOptions] = useState<ScanOptions>({
    ctLogs: true,
    dnsBruteforce: true,
    httpProbe: true,
    techFingerprint: true,
    takeoverCheck: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (domain.trim()) {
      onScan(domain.trim(), options);
    }
  };

  const updateOption = (key: keyof ScanOptions, value: boolean) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
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

          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-12 w-12 shrink-0"
                disabled={isScanning}
              >
                <Settings2 className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div className="space-y-1">
                  <h4 className="font-mono font-semibold text-sm">Scan Options</h4>
                  <p className="text-xs text-muted-foreground">
                    Configure what the scan should include
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="ctLogs" className="flex flex-col gap-0.5">
                      <span>Certificate Transparency</span>
                      <span className="text-xs text-muted-foreground font-normal">
                        Query CT logs for subdomains
                      </span>
                    </Label>
                    <Switch
                      id="ctLogs"
                      checked={options.ctLogs}
                      onCheckedChange={(checked) => updateOption("ctLogs", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="dnsBruteforce" className="flex flex-col gap-0.5">
                      <span>DNS Brute Force</span>
                      <span className="text-xs text-muted-foreground font-normal">
                        Test common subdomain wordlist
                      </span>
                    </Label>
                    <Switch
                      id="dnsBruteforce"
                      checked={options.dnsBruteforce}
                      onCheckedChange={(checked) => updateOption("dnsBruteforce", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="httpProbe" className="flex flex-col gap-0.5">
                      <span>HTTP Probe</span>
                      <span className="text-xs text-muted-foreground font-normal">
                        Check if subdomains respond
                      </span>
                    </Label>
                    <Switch
                      id="httpProbe"
                      checked={options.httpProbe}
                      onCheckedChange={(checked) => updateOption("httpProbe", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="techFingerprint" className="flex flex-col gap-0.5">
                      <span>Tech Fingerprinting</span>
                      <span className="text-xs text-muted-foreground font-normal">
                        Detect technologies used
                      </span>
                    </Label>
                    <Switch
                      id="techFingerprint"
                      checked={options.techFingerprint}
                      onCheckedChange={(checked) => updateOption("techFingerprint", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="takeoverCheck" className="flex flex-col gap-0.5">
                      <span>Takeover Check</span>
                      <span className="text-xs text-muted-foreground font-normal">
                        Check for vulnerable CNAMEs
                      </span>
                    </Label>
                    <Switch
                      id="takeoverCheck"
                      checked={options.takeoverCheck}
                      onCheckedChange={(checked) => updateOption("takeoverCheck", checked)}
                    />
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

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
            <span
              className={`h-1.5 w-1.5 rounded-full ${options.ctLogs ? "bg-success" : "bg-muted-foreground/50"}`}
            />
            Passive Enum
          </span>
          <span className="flex items-center gap-1">
            <span
              className={`h-1.5 w-1.5 rounded-full ${options.dnsBruteforce ? "bg-success" : "bg-muted-foreground/50"}`}
            />
            Active Brute
          </span>
          <span className="flex items-center gap-1">
            <span
              className={`h-1.5 w-1.5 rounded-full ${options.httpProbe ? "bg-success" : "bg-muted-foreground/50"}`}
            />
            DNS Validation
          </span>
          <span className="flex items-center gap-1">
            <span
              className={`h-1.5 w-1.5 rounded-full ${options.techFingerprint ? "bg-success" : "bg-muted-foreground/50"}`}
            />
            Tech Fingerprint
          </span>
        </div>
      </form>
    </Card>
  );
}
