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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Subdomain, AnalysisResult } from "@/types/subdomain";
import {
  Brain,
  Sparkles,
  Shield,
  Lightbulb,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Info,
} from "lucide-react";
import { toast } from "sonner";

interface AIAssistantProps {
  domain: string;
  subdomains: Subdomain[];
  onPredictionsReady?: (predictions: string[]) => void;
}

export function AIAssistant({ domain, subdomains, onPredictionsReady }: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("predict");
  const [predictions, setPredictions] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);

  const existingNames = subdomains.map((s) => s.name);

  const handlePredict = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-predict", {
        body: {
          domain,
          existingSubdomains: existingNames,
          type: "predict",
        },
      });

      if (error) throw error;

      setPredictions(data.predictions || []);
      if (data.predictions?.length > 0 && onPredictionsReady) {
        onPredictionsReady(data.predictions);
      }
      toast.success(`AI predicted ${data.predictions?.length || 0} potential subdomains`);
    } catch (error) {
      console.error("AI prediction error:", error);
      toast.error("Failed to get AI predictions");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyze = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-predict", {
        body: {
          domain,
          existingSubdomains: existingNames,
          type: "analyze",
        },
      });

      if (error) throw error;

      setAnalysis(data);
      toast.success("AI analysis complete");
    } catch (error) {
      console.error("AI analysis error:", error);
      toast.error("Failed to analyze");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecommend = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-predict", {
        body: {
          domain,
          existingSubdomains: existingNames,
          type: "recommend",
        },
      });

      if (error) throw error;

      setRecommendations(data.recommendations || []);
      toast.success("Recommendations generated");
    } catch (error) {
      console.error("AI recommendation error:", error);
      toast.error("Failed to get recommendations");
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return "text-accent-red border-accent-red/30 bg-accent-red/10";
      case "high":
        return "text-warning border-warning/30 bg-warning/10";
      case "medium":
        return "text-accent-yellow border-accent-yellow/30 bg-accent-yellow/10";
      default:
        return "text-accent-blue border-accent-blue/30 bg-accent-blue/10";
    }
  };

  const getRiskBadge = (level: string) => {
    const colors: Record<string, string> = {
      critical: "bg-accent-red text-white",
      high: "bg-warning text-foreground-inverse",
      medium: "bg-accent-yellow text-foreground-inverse",
      low: "bg-accent-green text-foreground-inverse",
    };
    return colors[level.toLowerCase()] || colors.medium;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-primary/30 hover:border-primary">
          <Brain className="h-4 w-4 mr-2 text-primary" />
          AI Assistant
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="text-primary font-mono flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Reconnaissance Assistant
          </DialogTitle>
          <DialogDescription>
            Powered by advanced AI for subdomain prediction and security analysis
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid grid-cols-3 bg-muted/30">
            <TabsTrigger value="predict" className="data-[state=active]:bg-primary/20">
              <Sparkles className="h-4 w-4 mr-2" />
              Predict
            </TabsTrigger>
            <TabsTrigger value="analyze" className="data-[state=active]:bg-primary/20">
              <Shield className="h-4 w-4 mr-2" />
              Analyze
            </TabsTrigger>
            <TabsTrigger value="recommend" className="data-[state=active]:bg-primary/20">
              <Lightbulb className="h-4 w-4 mr-2" />
              Recommend
            </TabsTrigger>
          </TabsList>

          <TabsContent value="predict" className="mt-4 space-y-4">
            <Card className="p-4 bg-muted/20 border-border">
              <h4 className="font-medium mb-2">ML-Powered Subdomain Prediction</h4>
              <p className="text-sm text-muted-foreground mb-4">
                AI will analyze patterns from {existingNames.length} discovered subdomains and
                predict likely additional targets for {domain}.
              </p>
              <Button
                variant="cyber"
                onClick={handlePredict}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Brain className="h-4 w-4 mr-2" />
                )}
                Generate Predictions
              </Button>
            </Card>

            {predictions.length > 0 && (
              <Card className="p-4 bg-muted/20 border-border">
                <h4 className="font-mono text-sm text-accent-green mb-3">
                  {predictions.length} Predicted Subdomains
                </h4>
                <ScrollArea className="h-60">
                  <div className="flex flex-wrap gap-2">
                    {predictions.map((pred, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="font-mono text-xs border-accent-green/30 text-accent-green"
                      >
                        {pred}.{domain}
                      </Badge>
                    ))}
                  </div>
                </ScrollArea>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="analyze" className="mt-4 space-y-4">
            <Card className="p-4 bg-muted/20 border-border">
              <h4 className="font-medium mb-2">Security Analysis</h4>
              <p className="text-sm text-muted-foreground mb-4">
                AI will analyze your attack surface and identify security concerns.
              </p>
              <Button
                variant="cyber"
                onClick={handleAnalyze}
                disabled={isLoading || existingNames.length === 0}
                className="w-full"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Shield className="h-4 w-4 mr-2" />
                )}
                Analyze Attack Surface
              </Button>
            </Card>

            {analysis && (
              <div className="space-y-4 animate-fade-in">
                <Card className="p-4 bg-muted/20 border-border">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-mono text-sm">Risk Assessment</h4>
                    <Badge className={getRiskBadge(analysis.riskLevel)}>
                      {analysis.riskLevel.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{analysis.summary}</p>
                </Card>

                {analysis.findings && analysis.findings.length > 0 && (
                  <Card className="p-4 bg-muted/20 border-border">
                    <h4 className="font-mono text-sm mb-3">Findings</h4>
                    <ScrollArea className="h-48">
                      <div className="space-y-3">
                        {analysis.findings.map((finding, i) => (
                          <div
                            key={i}
                            className={`p-3 rounded-lg border ${getSeverityColor(finding.severity)}`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              {finding.severity === "critical" || finding.severity === "high" ? (
                                <AlertTriangle className="h-4 w-4" />
                              ) : (
                                <Info className="h-4 w-4" />
                              )}
                              <span className="font-medium text-sm">{finding.type}</span>
                              <Badge variant="outline" className="text-xs ml-auto">
                                {finding.severity}
                              </Badge>
                            </div>
                            <p className="text-xs opacity-80">{finding.description}</p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="recommend" className="mt-4 space-y-4">
            <Card className="p-4 bg-muted/20 border-border">
              <h4 className="font-medium mb-2">Security Recommendations</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Get AI-powered recommendations for securing your attack surface.
              </p>
              <Button
                variant="cyber"
                onClick={handleRecommend}
                disabled={isLoading || existingNames.length === 0}
                className="w-full"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Lightbulb className="h-4 w-4 mr-2" />
                )}
                Get Recommendations
              </Button>
            </Card>

            {recommendations.length > 0 && (
              <Card className="p-4 bg-muted/20 border-border">
                <h4 className="font-mono text-sm text-accent-blue mb-3">
                  Security Recommendations
                </h4>
                <ScrollArea className="h-60">
                  <div className="space-y-3">
                    {recommendations.map((rec, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-3 rounded-lg bg-accent-blue/10 border border-accent-blue/20"
                      >
                        <CheckCircle2 className="h-4 w-4 text-accent-blue mt-0.5 shrink-0" />
                        <p className="text-sm">{rec}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
