import { Subdomain } from "@/types/subdomain";

export const SCANS_STORAGE_KEY = "cybereye_local_scans";
export const SUBDOMAINS_STORAGE_PREFIX = "cybereye_local_subdomains_";

export interface LocalScanRecord {
  id: string;
  target_domain: string;
  status: string;
  total_subdomains: number;
  active_subdomains: number;
  anomalies: number;
  cloud_assets: number;
  takeover_vulnerable: number;
  created_at: string;
  completed_at: string | null;
  user_id?: string;
}

function getStorage(): Storage | null {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }
  return null;
}

export function getLocalScans(): LocalScanRecord[] {
  try {
    const storage = getStorage();
    if (!storage) return [];
    const raw = storage.getItem(SCANS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalScan(scan: LocalScanRecord, subdomains: Subdomain[]): void {
  try {
    const storage = getStorage();
    if (!storage) return;
    const scans = getLocalScans();
    const filtered = scans.filter((s) => s.id !== scan.id);
    storage.setItem(SCANS_STORAGE_KEY, JSON.stringify([scan, ...filtered]));
    storage.setItem(`${SUBDOMAINS_STORAGE_PREFIX}${scan.id}`, JSON.stringify(subdomains));
  } catch (_e) {
    void _e;
  }
}

export function deleteLocalScan(scanId: string): void {
  try {
    const storage = getStorage();
    if (!storage) return;
    const scans = getLocalScans().filter((s) => s.id !== scanId);
    storage.setItem(SCANS_STORAGE_KEY, JSON.stringify(scans));
    storage.removeItem(`${SUBDOMAINS_STORAGE_PREFIX}${scanId}`);
  } catch (_e) {
    void _e;
  }
}

export function getLocalSubdomains(scanId: string): Subdomain[] {
  try {
    const storage = getStorage();
    if (!storage) return [];
    const raw = storage.getItem(`${SUBDOMAINS_STORAGE_PREFIX}${scanId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
