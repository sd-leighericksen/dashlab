export type BeszelStatus = "up" | "down" | "paused" | "pending";

export type BeszelSystemInfo = {
  h?: string; cpu?: number; mp?: number; dp?: number; dt?: number;
  b?: number; u?: number; v?: string; m?: string; c?: number;
};
export type BeszelSystemRecord = {
  id: string; name: string; host: string; port: string;
  status: BeszelStatus; updated: string; info: BeszelSystemInfo;
};
export type BeszelAlertRecord = {
  id: string; system: string; name: string; value: number; min: number; triggered: boolean;
};

export type BeszelSystemSummary = {
  id: string; name: string; hostname: string; status: BeszelStatus;
  cpuPct: number; memPct: number; diskPct: number; tempC: number | null;
  bandwidthMbps: number | null; uptimeSec: number; agentVersion: string;
  lastSeenAt: string;
};
export type BeszelSnapshot = {
  hubUrl: string;
  systems: BeszelSystemSummary[];
  alerts: { id: string; systemId: string; name: string; value: number }[];
  summary: { total: number; up: number; down: number };
};
