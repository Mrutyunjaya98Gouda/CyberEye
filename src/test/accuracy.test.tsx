import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import Index from "@/pages/Index";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import { ScanResult, Subdomain } from "@/types/subdomain";

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        order: vi.fn(() => ({
                            limit: vi.fn(() => Promise.resolve({ data: [] }))
                        }))
                    }))
                }))
            })),
        })),
    },
}));

// Mock Auth
vi.mock("@/hooks/useAuth", () => ({
    useAuth: () => ({
        user: { id: "test-user" },
        loading: false,
    }),
}));

// Mock useScans to control the data
const mockStartScan = vi.fn();
const mockStopScan = vi.fn();
const mockPauseScan = vi.fn();
const mockResumeScan = vi.fn();
const mockLoadPreviousScan = vi.fn();
const mockClearResults = vi.fn();

const mockSubdomains: Subdomain[] = [
    {
        id: "1",
        name: "sub1.example.com",
        status: "active",
        ipAddresses: ["1.1.1.1"],
        httpStatus: 200,
        httpsStatus: 200,
        technologies: ["React"],
        server: "nginx",
        cloudProvider: null,
        riskScore: 10,
        isAnomaly: false,
        anomalyReason: null,
        takeoverVulnerable: false,
        takeoverType: null,
        cnameRecord: null,
        dnsRecords: {},
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        waybackUrls: [],
        ports: [{ port: 80, service: "http", state: "open" }, { port: 443, service: "https", state: "open" }]
    },
    {
        id: "2",
        name: "sub2.example.com",
        status: "inactive",
        ipAddresses: ["1.1.1.2"],
        httpStatus: null,
        httpsStatus: null,
        technologies: [],
        server: null,
        cloudProvider: null,
        riskScore: 80,
        isAnomaly: true,
        anomalyReason: "Unusual behavior",
        takeoverVulnerable: false,
        takeoverType: null,
        cnameRecord: null,
        dnsRecords: {},
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        waybackUrls: [],
        ports: []
    },
    {
        id: "3",
        name: "cloud.example.com",
        status: "active",
        ipAddresses: ["1.1.1.3"],
        httpStatus: 200,
        httpsStatus: null,
        technologies: ["AWS"],
        server: "Apache",
        cloudProvider: "aws",
        riskScore: 20,
        isAnomaly: false,
        anomalyReason: null,
        takeoverVulnerable: false,
        takeoverType: null,
        cnameRecord: null,
        dnsRecords: {},
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        waybackUrls: [],
        ports: [{ port: 80, service: "http", state: "open" }]
    },
    {
        id: "4",
        name: "vuln.example.com",
        status: "active",
        ipAddresses: ["1.1.1.4"],
        httpStatus: 404,
        httpsStatus: null,
        technologies: [],
        server: null,
        cloudProvider: null,
        riskScore: 90,
        isAnomaly: false,
        anomalyReason: null,
        takeoverVulnerable: true,
        takeoverType: "S3 Bucket",
        cnameRecord: null,
        dnsRecords: {},
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        waybackUrls: [],
        ports: [{ port: 80, service: "http", state: "open" }]
    },
];

const mockScanResult: ScanResult = {
    id: "scan1",
    targetDomain: "example.com",
    status: "completed",
    totalSubdomains: 4,
    activeSubdomains: 3,
    anomalies: 1,
    cloudAssets: 1,
    takeoverVulnerable: 1,
    subdomains: mockSubdomains,
    scanStarted: new Date().toISOString(),
    scanCompleted: new Date().toISOString(),
};

vi.mock("@/hooks/useScans", () => ({
    useScans: () => ({
        isScanning: false,
        isPaused: false,
        scanProgress: 100,
        currentTask: "Completed",
        scanResult: mockScanResult, // Return our mock data
        startScan: mockStartScan,
        stopScan: mockStopScan,
        pauseScan: mockPauseScan,
        resumeScan: mockResumeScan,
        loadPreviousScan: mockLoadPreviousScan,
        clearResults: mockClearResults,
    }),
}));

// Mock lazy components to avoid suspense issues in test
vi.mock("@/components/dashboard/InteractiveGraph", () => ({
    InteractiveGraph: () => <div data-testid="interactive-graph">Graph</div>
}));
vi.mock("@/components/dashboard/JsonView", () => ({
    JsonView: () => <div data-testid="json-view">JSON</div>
}));
vi.mock("@/components/dashboard/ExportPanel", () => ({
    ExportPanel: () => <div data-testid="export-panel">Export</div>
}));
vi.mock("@/components/dashboard/ReportGenerator", () => ({
    ReportGenerator: () => <div data-testid="report-generator">Report</div>
}));
vi.mock("@/components/dashboard/ScanComparison", () => ({
    ScanComparison: () => <div data-testid="scan-comparison">Comparison</div>
}));
vi.mock("@/components/dashboard/AIAssistant", () => ({
    AIAssistant: () => <div data-testid="ai-assistant">AI</div>
}));

describe("Accuracy Verification", () => {
    it("displays correct statistics statistics based on scan data", async () => {
        render(
            <BrowserRouter>
                <Index />
                <Toaster />
            </BrowserRouter>
        );

        // Wait for content to load
        await waitFor(() => {
            expect(screen.getByText("Total Subdomains")).toBeInTheDocument();
        });

        // Helper to find the Title element that has the specific 'uppercase' class 
        // to distinguish from badges, then check its next sibling for the value
        const verifyStat = (title: string, value: string) => {
            const titleElement = screen.getByText((content, element) => {
                const hasText = content === title;
                const isTitle = element?.classList.contains("uppercase");
                return hasText && !!isTitle;
            });
            expect(titleElement.nextElementSibling).toHaveTextContent(value);
        };

        verifyStat("Total Subdomains", "4");
        verifyStat("Active", "3");
        verifyStat("Anomalies", "1");
        verifyStat("Cloud Assets", "1");
        verifyStat("Takeover Risk", "1");
    });

    it("filters correctly in the UI", async () => {
        render(
            <BrowserRouter>
                <Index />
                <Toaster />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText("sub1.example.com")).toBeInTheDocument();
        });

        expect(screen.getByText("sub1.example.com")).toBeInTheDocument();
        expect(screen.getByText("sub2.example.com")).toBeInTheDocument();
    });
});
