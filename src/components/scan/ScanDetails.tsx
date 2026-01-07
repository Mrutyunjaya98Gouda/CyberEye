import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Globe, Shield, Activity, AlertTriangle, Cloud } from "lucide-react";
import { Subdomain } from "@/types/subdomain";

interface ScanDetailsProps {
    scan: any | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const ScanDetails = ({ scan, open, onOpenChange }: ScanDetailsProps) => {
    const [subdomains, setSubdomains] = useState<Subdomain[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (scan && open) {
            fetchSubdomains(scan.id);
        }
    }, [scan, open]);

    const fetchSubdomains = async (scanId: string) => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("subdomains")
                .select("*")
                .eq("scan_id", scanId)
                .order("risk_score", { ascending: false });

            if (error) throw error;

            const mappedSubdomains: Subdomain[] = (data || []).map((sub: any) => ({
                id: sub.id,
                name: sub.name,
                status: sub.status,
                ipAddresses: sub.ip_addresses || [],
                httpStatus: sub.http_status,
                httpsStatus: sub.https_status,
                technologies: sub.technologies || [],
                server: sub.server,
                cloudProvider: sub.cloud_provider,
                riskScore: sub.risk_score || 0,
                isAnomaly: sub.is_anomaly || false,
                anomalyReason: sub.anomaly_reason,
                takeoverVulnerable: sub.takeover_vulnerable || false,
                takeoverType: sub.takeover_type,
                cnameRecord: sub.cname_record,
                dnsRecords: sub.dns_records || {},
                firstSeen: sub.first_seen,
                lastSeen: sub.last_seen,
                waybackUrls: sub.wayback_urls || [],
                ports: sub.ports || [],
            }));

            setSubdomains(mappedSubdomains);
        } catch (error) {
            console.error("Error fetching subdomains:", error);
            toast.error("Failed to load scan details");
        } finally {
            setLoading(false);
        }
    };

    const getRiskColor = (score: number) => {
        if (score >= 80) return "text-destructive";
        if (score >= 50) return "text-warning";
        return "text-success";
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-6 pb-4 border-b">
                    <DialogTitle className="flex items-center gap-2 text-xl font-mono">
                        <Globe className="h-5 w-5 text-primary" />
                        Scan Details: {scan?.target_domain}
                    </DialogTitle>
                    <div className="flex gap-4 mt-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                            <Globe className="h-4 w-4" />
                            <span>{scan?.total_subdomains} Total</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-success">
                            <Activity className="h-4 w-4" />
                            <span>{scan?.active_subdomains} Active</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <span>{scan?.anomalies} Anomalies</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-info">
                            <Cloud className="h-4 w-4" />
                            <span>{scan?.cloud_assets} Cloud</span>
                        </div>
                    </div>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <ScrollArea className="flex-1 p-6">
                        <div className="space-y-6">
                            {/* Subdomains Table */}
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Subdomain</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>IP Address</TableHead>
                                            <TableHead>Tech</TableHead>
                                            <TableHead className="text-right">Risk Score</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {subdomains.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                    No subdomains found for this scan.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            subdomains.map((sub) => (
                                                <TableRow key={sub.id}>
                                                    <TableCell className="font-mono font-medium">
                                                        <div className="flex flex-col">
                                                            <span>{sub.name}</span>
                                                            {sub.takeoverVulnerable && (
                                                                <Badge variant="destructive" className="w-fit mt-1 text-[10px] px-1 py-0 h-4">Takeover</Badge>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={sub.status === "active" ? "success" : "secondary"}>
                                                            {sub.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="font-mono text-xs text-muted-foreground">
                                                        {sub.ipAddresses?.[0] || "N/A"}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-wrap gap-1">
                                                            {sub.technologies?.slice(0, 2).map((tech, i) => (
                                                                <Badge key={i} variant="outline" className="text-[10px] h-5 px-1">
                                                                    {tech}
                                                                </Badge>
                                                            ))}
                                                            {(sub.technologies?.length || 0) > 2 && (
                                                                <span className="text-[10px] text-muted-foreground">+{sub.technologies.length - 2}</span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className={`font-mono font-bold ${getRiskColor(sub.riskScore)}`}>
                                                            {sub.riskScore}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </ScrollArea>
                )}
            </DialogContent>
        </Dialog>
    );
};
