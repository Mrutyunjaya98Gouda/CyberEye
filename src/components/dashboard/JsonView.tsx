import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Subdomain } from "@/types/subdomain";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

interface JsonViewProps {
  subdomains: Subdomain[];
}

export function JsonView({ subdomains }: JsonViewProps) {
  const [copied, setCopied] = useState(false);

  const jsonString = JSON.stringify(subdomains, null, 2);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Escape HTML entities to prevent XSS attacks
  const escapeHtml = (str: string): string => {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const highlightJson = (json: string) => {
    // First escape HTML entities, then apply syntax highlighting
    const escaped = escapeHtml(json);
    return escaped
      .replace(/&quot;([^&]+)&quot;:/g, '<span class="text-info">&quot;$1&quot;</span>:')
      .replace(/: &quot;([^&]*)&quot;/g, ': <span class="text-success">&quot;$1&quot;</span>')
      .replace(/: (\d+)/g, ': <span class="text-accent">$1</span>')
      .replace(/: (true|false|null)/g, ': <span class="text-primary">$1</span>');
  };

  return (
    <Card className="border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden">
      <div className="p-4 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-primary">RAW JSON OUTPUT</span>
          <span className="text-xs text-muted-foreground font-mono">
            ({subdomains.length} records)
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={handleCopy} className="h-8">
          {copied ? (
            <>
              <Check className="h-4 w-4 text-success" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              <span>Copy</span>
            </>
          )}
        </Button>
      </div>
      <div className="p-4 max-h-[600px] overflow-auto">
        <pre
          className="font-mono text-xs text-foreground/80 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: highlightJson(jsonString) }}
        />
      </div>
    </Card>
  );
}
