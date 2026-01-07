import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  variant?: "default" | "primary" | "warning" | "destructive" | "info";
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const variantStyles = {
  default: {
    card: "border-border hover:border-primary/30",
    icon: "bg-secondary text-foreground",
    value: "text-foreground",
  },
  primary: {
    card: "border-primary/30 hover:border-primary/50 hover:shadow-[0_0_30px_hsl(var(--primary)/0.15)]",
    icon: "bg-primary/10 text-primary",
    value: "text-primary text-glow",
  },
  warning: {
    card: "border-accent/30 hover:border-accent/50 hover:shadow-[0_0_30px_hsl(var(--accent)/0.15)]",
    icon: "bg-accent/10 text-accent",
    value: "text-accent text-glow-accent",
  },
  destructive: {
    card: "border-destructive/30 hover:border-destructive/50",
    icon: "bg-destructive/10 text-destructive",
    value: "text-destructive",
  },
  info: {
    card: "border-info/30 hover:border-info/50 hover:shadow-[0_0_30px_hsl(var(--info)/0.15)]",
    icon: "bg-info/10 text-info",
    value: "text-info",
  },
};

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = "default",
  trend,
}: StatsCardProps) {
  const styles = variantStyles[variant];

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-300 animate-fade-in",
        styles.card
      )}
    >
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              {title}
            </p>
            <p className={cn("text-4xl font-bold font-mono tracking-tight", styles.value)}>
              {typeof value === "number" ? value.toLocaleString() : value}
            </p>
            {subtitle && <p className="text-xs text-muted-foreground font-mono">{subtitle}</p>}
            {trend && (
              <div
                className={cn(
                  "flex items-center gap-1 text-xs font-mono",
                  trend.isPositive ? "text-success" : "text-destructive"
                )}
              >
                <span>{trend.isPositive ? "↑" : "↓"}</span>
                <span>{Math.abs(trend.value)}% from last scan</span>
              </div>
            )}
          </div>
          <div className={cn("p-3 rounded-lg", styles.icon)}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
    </Card>
  );
}
