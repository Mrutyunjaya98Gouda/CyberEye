import { Eye, Radar, Terminal, User, LogOut, Settings, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

export function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isHome = location.pathname === "/";
  const isDashboard = location.pathname === "/dashboard";
  const isHistory = location.pathname === "/history";

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <header className="border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <div className="relative">
              <Eye className="h-8 w-8 text-primary" />
              <div className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-mono text-foreground tracking-tight">
                CYBER<span className="text-primary">EYE</span>
              </h1>
              <p className="text-xs text-muted-foreground font-mono">
                Advanced Attack Surface Intelligence
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <nav className="hidden md:flex items-center gap-2 text-sm">
              <button
                onClick={() => navigate("/")}
                className={cn(
                  "transition-all px-3 py-1.5 rounded-md flex items-center gap-2 font-mono text-xs",
                  isHome
                    ? "bg-primary/15 text-primary border border-primary/30 shadow-[0_0_12px_rgba(var(--primary),0.2)] font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                )}
              >
                <div className="relative">
                  {isHome && (
                    <div className="absolute -top-1 -right-1 h-1.5 w-1.5 bg-primary rounded-full animate-pulse" />
                  )}
                  <Eye className="h-4 w-4" />
                </div>
                <span>Home</span>
              </button>
              <button
                onClick={() => navigate("/dashboard")}
                className={cn(
                  "transition-all px-3 py-1.5 rounded-md flex items-center gap-2 font-mono text-xs",
                  isDashboard
                    ? "bg-primary/15 text-primary border border-primary/30 shadow-[0_0_12px_rgba(var(--primary),0.2)] font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                )}
              >
                <BarChart3 className="h-4 w-4" />
                <span>Dashboard</span>
              </button>
              <button
                onClick={() => navigate("/history")}
                className={cn(
                  "transition-all px-3 py-1.5 rounded-md flex items-center gap-2 font-mono text-xs",
                  isHistory
                    ? "bg-primary/15 text-primary border border-primary/30 shadow-[0_0_12px_rgba(var(--primary),0.2)] font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                )}
              >
                <Radar className="h-4 w-4" />
                <span>History</span>
              </button>
            </nav>

            <div className="flex items-center gap-2 text-xs font-mono">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span className="text-muted-foreground">Online</span>
            </div>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline text-xs font-mono truncate max-w-[120px]">
                      {user.email}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/history")}>
                    <Radar className="h-4 w-4 mr-2" />
                    Scan History
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/settings")}>
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="cyber" size="sm" onClick={() => navigate("/auth")}>
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
