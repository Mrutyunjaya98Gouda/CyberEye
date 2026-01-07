import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { FilterOptions } from "@/types/subdomain";
import { Search, Filter, X } from "lucide-react";

interface FilterBarProps {
  filters: FilterOptions;
  onChange: (filters: FilterOptions) => void;
  resultCount: number;
}

export function FilterBar({ filters, onChange, resultCount }: FilterBarProps) {
  const toggleFilter = (key: keyof FilterOptions) => {
    onChange({ ...filters, [key]: !filters[key] });
  };

  const clearFilters = () => {
    onChange({
      activeOnly: false,
      anomaliesOnly: false,
      cloudAssetsOnly: false,
      takeoverVulnerable: false,
      keyword: "",
      minScore: 0,
      cloudProvider: null,
    });
  };

  const hasActiveFilters =
    filters.activeOnly ||
    filters.anomaliesOnly ||
    filters.cloudAssetsOnly ||
    filters.takeoverVulnerable ||
    filters.keyword ||
    filters.minScore > 0;

  return (
    <Card className="p-4 border-border/50 bg-card/30 backdrop-blur-sm">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Filters</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-muted-foreground">
              Showing <span className="text-primary">{resultCount}</span> results
            </span>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 px-2 text-xs">
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search subdomains..."
              value={filters.keyword}
              onChange={(e) => onChange({ ...filters, keyword: e.target.value })}
              className="pl-9 h-9 bg-background/50"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge
              variant={filters.activeOnly ? "success" : "outline"}
              className="cursor-pointer hover:bg-success/20 transition-colors"
              onClick={() => toggleFilter("activeOnly")}
            >
              Active Only
            </Badge>
            <Badge
              variant={filters.anomaliesOnly ? "anomaly" : "outline"}
              className="cursor-pointer hover:bg-destructive/20 transition-colors"
              onClick={() => toggleFilter("anomaliesOnly")}
            >
              Anomalies
            </Badge>
            <Badge
              variant={filters.cloudAssetsOnly ? "cloud" : "outline"}
              className="cursor-pointer hover:bg-info/20 transition-colors"
              onClick={() => toggleFilter("cloudAssetsOnly")}
            >
              Cloud Assets
            </Badge>
            <Badge
              variant={filters.takeoverVulnerable ? "warning" : "outline"}
              className="cursor-pointer hover:bg-accent/20 transition-colors"
              onClick={() => toggleFilter("takeoverVulnerable")}
            >
              Takeover Risk
            </Badge>
          </div>

          <div className="flex items-center gap-3 min-w-[180px]">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Min Score:</span>
            <Slider
              value={[filters.minScore]}
              onValueChange={([value]) => onChange({ ...filters, minScore: value })}
              max={100}
              step={5}
              className="w-24"
            />
            <span className="text-xs font-mono text-primary w-8">{filters.minScore}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
