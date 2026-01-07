import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface ScanProgressProps {
  progress: number;
  status: string;
  currentTask: string;
}

export function ScanProgress({ progress, status, currentTask }: ScanProgressProps) {
  return (
    <Card className="p-6 border-primary/30 bg-card/50 backdrop-blur-sm animate-pulse-glow">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-3 w-3 rounded-full bg-primary animate-ping absolute" />
              <div className="h-3 w-3 rounded-full bg-primary" />
            </div>
            <span className="font-mono text-primary text-sm uppercase tracking-wider">
              {status}
            </span>
          </div>
          <span className="font-mono text-primary text-lg font-bold">{progress}%</span>
        </div>

        <div className="relative">
          <Progress value={progress} className="h-2 bg-secondary" />
          <div
            className="absolute top-0 left-0 h-2 bg-gradient-to-r from-primary/50 to-primary rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
          <div
            className="absolute top-0 h-2 w-20 bg-gradient-to-r from-transparent via-primary/50 to-transparent animate-scan rounded-full"
            style={{ left: `${Math.min(progress, 80)}%` }}
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
          <span className="text-primary">&gt;</span>
          <span className="truncate">{currentTask}</span>
        </div>

        <div className="grid grid-cols-4 gap-4 pt-2">
          {[
            { label: "CT Logs", done: progress > 20 },
            { label: "DNS Brute", done: progress > 45 },
            { label: "Validation", done: progress > 70 },
            { label: "Analysis", done: progress > 90 },
          ].map((step, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div
                className={`h-2 w-2 rounded-full transition-colors duration-300 ${
                  step.done
                    ? "bg-success"
                    : progress > i * 25
                      ? "bg-primary animate-pulse"
                      : "bg-muted"
                }`}
              />
              <span
                className={`text-xs font-mono ${step.done ? "text-success" : "text-muted-foreground"}`}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
