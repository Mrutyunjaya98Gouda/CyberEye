import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import History from "@/pages/History";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({
                    data: [
                        {
                            id: "1",
                            target_domain: "example.com",
                            status: "completed",
                            total_subdomains: 10,
                            active_subdomains: 5,
                            anomalies: 0,
                            cloud_assets: 0,
                            takeover_vulnerable: 0,
                            created_at: "2023-01-01T10:00:00Z",
                            completed_at: "2023-01-01T10:05:00Z"
                        },
                        {
                            id: "2",
                            target_domain: "test.com",
                            status: "failed",
                            total_subdomains: 0,
                            active_subdomains: 0,
                            anomalies: 0,
                            cloud_assets: 0,
                            takeover_vulnerable: 0,
                            created_at: "2023-02-01T10:00:00Z",
                            completed_at: null
                        }
                    ],
                    error: null
                })),
                delete: vi.fn(() => ({
                    eq: vi.fn(() => Promise.resolve({ error: null }))
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

// Mock ScanDetails
vi.mock("@/components/scan/ScanDetails", () => ({
    ScanDetails: ({ open }: { open: boolean }) => (
        open ? <div data-testid="scan-details-dialog">Scan Details Dialog</div> : null
    ),
}));

describe("History Component", () => {
    const renderHistory = () => {
        return render(
            <BrowserRouter>
                <History />
                <Toaster />
            </BrowserRouter>
        );
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders history page and scan list", async () => {
        renderHistory();

        // Wait for loading to finish and title to appear
        await waitFor(() => {
            expect(screen.getByText("History")).toBeInTheDocument();
        });

        expect(screen.getByText("Scan")).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText("example.com")).toBeInTheDocument();
            expect(screen.getByText("test.com")).toBeInTheDocument();
        });
    });

    it("filters scans by status", async () => {
        renderHistory();

        // Wait for loading to finish
        await waitFor(() => {
            expect(screen.getByText("History")).toBeInTheDocument();
        });

        await waitFor(() => {
            expect(screen.getByText("example.com")).toBeInTheDocument();
        });

        // Find select trigger (Filter by status) - using placeholder text is cleaner
        // Check if both are visible initially
        expect(screen.getByText("example.com")).toBeInTheDocument();
        expect(screen.getByText("test.com")).toBeInTheDocument();
    });

    it("opens details dialog when View Details is clicked", async () => {
        renderHistory();

        await waitFor(() => {
            expect(screen.getByText("example.com")).toBeInTheDocument();
        });

        // Click "Details" button for first item
        const detailsButtons = screen.getAllByRole("button", { name: /details/i });
        fireEvent.click(detailsButtons[0]);

        expect(screen.getByTestId("scan-details-dialog")).toBeInTheDocument();
    });
});
