import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Settings as SettingsIcon,
  User,
  Shield,
  Bell,
  Palette,
  Database,
  Key,
  Save,
  Trash2,
} from "lucide-react";

const Settings = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [settings, setSettings] = useState({
    notifications: {
      emailOnComplete: true,
      emailOnAnomaly: true,
      pushNotifications: false,
    },
    scanning: {
      autoSave: true,
      deepScan: false,
      maxSubdomains: 1000,
      timeout: 30,
    },
    display: {
      darkMode: true,
      compactView: false,
      showRiskScores: true,
    },
    api: {
      rateLimit: 10,
      webhookUrl: "",
    },
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const handleSave = () => {
    // Save to localStorage for now
    localStorage.setItem("cybereye_settings", JSON.stringify(settings));
    toast.success("Settings saved successfully");
  };

  const handleReset = () => {
    setSettings({
      notifications: {
        emailOnComplete: true,
        emailOnAnomaly: true,
        pushNotifications: false,
      },
      scanning: {
        autoSave: true,
        deepScan: false,
        maxSubdomains: 1000,
        timeout: 30,
      },
      display: {
        darkMode: true,
        compactView: false,
        showRiskScores: true,
      },
      api: {
        rateLimit: 10,
        webhookUrl: "",
      },
    });
    toast.info("Settings reset to defaults");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-mono text-foreground flex items-center gap-3">
              <SettingsIcon className="h-6 w-6 text-primary" />
              <span>Settings</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configure your CyberEye preferences
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleReset}>
              <Trash2 className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button variant="cyber" onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Account Settings */}
          <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-mono font-semibold text-foreground">Account</h2>
                <p className="text-xs text-muted-foreground">Manage your account settings</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="bg-muted/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="userId">User ID</Label>
                <Input
                  id="userId"
                  value={user?.id || ""}
                  disabled
                  className="bg-muted/50 font-mono text-xs"
                />
              </div>
            </div>
          </Card>

          {/* Notification Settings */}
          <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-accent/10">
                <Bell className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h2 className="font-mono font-semibold text-foreground">Notifications</h2>
                <p className="text-xs text-muted-foreground">Configure alert preferences</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Email on Scan Complete</Label>
                  <p className="text-xs text-muted-foreground">Get notified when scans finish</p>
                </div>
                <Switch
                  checked={settings.notifications.emailOnComplete}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, emailOnComplete: checked },
                    })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Email on Anomaly Detection</Label>
                  <p className="text-xs text-muted-foreground">Alert when anomalies found</p>
                </div>
                <Switch
                  checked={settings.notifications.emailOnAnomaly}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, emailOnAnomaly: checked },
                    })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Push Notifications</Label>
                  <p className="text-xs text-muted-foreground">Browser push alerts</p>
                </div>
                <Switch
                  checked={settings.notifications.pushNotifications}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, pushNotifications: checked },
                    })
                  }
                />
              </div>
            </div>
          </Card>

          {/* Scanning Settings */}
          <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-info/10">
                <Database className="h-5 w-5 text-info" />
              </div>
              <div>
                <h2 className="font-mono font-semibold text-foreground">Scanning</h2>
                <p className="text-xs text-muted-foreground">Scan behavior settings</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-save Results</Label>
                  <p className="text-xs text-muted-foreground">Automatically save scan results</p>
                </div>
                <Switch
                  checked={settings.scanning.autoSave}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      scanning: { ...settings.scanning, autoSave: checked },
                    })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Deep Scan Mode</Label>
                  <p className="text-xs text-muted-foreground">More thorough but slower</p>
                </div>
                <Switch
                  checked={settings.scanning.deepScan}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      scanning: { ...settings.scanning, deepScan: checked },
                    })
                  }
                />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="maxSubs">Max Subdomains</Label>
                <Input
                  id="maxSubs"
                  type="number"
                  value={settings.scanning.maxSubdomains}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      scanning: {
                        ...settings.scanning,
                        maxSubdomains: parseInt(e.target.value) || 1000,
                      },
                    })
                  }
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeout">Timeout (seconds)</Label>
                <Input
                  id="timeout"
                  type="number"
                  value={settings.scanning.timeout}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      scanning: { ...settings.scanning, timeout: parseInt(e.target.value) || 30 },
                    })
                  }
                  className="bg-background/50"
                />
              </div>
            </div>
          </Card>

          {/* Display Settings */}
          <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-success/10">
                <Palette className="h-5 w-5 text-success" />
              </div>
              <div>
                <h2 className="font-mono font-semibold text-foreground">Display</h2>
                <p className="text-xs text-muted-foreground">Customize appearance</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Dark Mode</Label>
                  <p className="text-xs text-muted-foreground">Use dark theme</p>
                </div>
                <Switch
                  checked={settings.display.darkMode}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      display: { ...settings.display, darkMode: checked },
                    })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Compact View</Label>
                  <p className="text-xs text-muted-foreground">Denser data display</p>
                </div>
                <Switch
                  checked={settings.display.compactView}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      display: { ...settings.display, compactView: checked },
                    })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Show Risk Scores</Label>
                  <p className="text-xs text-muted-foreground">Display risk indicators</p>
                </div>
                <Switch
                  checked={settings.display.showRiskScores}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      display: { ...settings.display, showRiskScores: checked },
                    })
                  }
                />
              </div>
            </div>
          </Card>

          {/* API Settings */}
          <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm lg:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-destructive/10">
                <Key className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h2 className="font-mono font-semibold text-foreground">API & Integrations</h2>
                <p className="text-xs text-muted-foreground">Configure API access and webhooks</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="rateLimit">Rate Limit (requests/min)</Label>
                <Input
                  id="rateLimit"
                  type="number"
                  value={settings.api.rateLimit}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      api: { ...settings.api, rateLimit: parseInt(e.target.value) || 10 },
                    })
                  }
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="webhook">Webhook URL</Label>
                <Input
                  id="webhook"
                  type="url"
                  placeholder="https://your-webhook.com/endpoint"
                  value={settings.api.webhookUrl}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      api: { ...settings.api, webhookUrl: e.target.value },
                    })
                  }
                  className="bg-background/50"
                />
              </div>
            </div>
          </Card>

          {/* Security Info */}
          <Card className="p-6 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-mono font-semibold text-foreground">Security Status</h2>
                <p className="text-xs text-muted-foreground">Your account security overview</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-card/50 border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                  <span className="text-sm font-mono text-foreground">Authenticated</span>
                </div>
                <p className="text-xs text-muted-foreground">Signed in via email</p>
              </div>
              <div className="p-4 rounded-lg bg-card/50 border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                  <span className="text-sm font-mono text-foreground">RLS Enabled</span>
                </div>
                <p className="text-xs text-muted-foreground">Row-level security active</p>
              </div>
              <div className="p-4 rounded-lg bg-card/50 border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                  <span className="text-sm font-mono text-foreground">Encrypted</span>
                </div>
                <p className="text-xs text-muted-foreground">All data encrypted at rest</p>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Settings;
