export interface RawRow {
  DATE: string | number;
  SERVER: string;
  IDLE: number;
  BUSY: number;
  FAULT: number;
  TOTAL: number;
  [key: string]: any;
}

export interface ServerRecord {
  date: string;
  serverIp: string;
  idle: number;
  busy: number;
  fault: number;
  total: number;
}

export interface ProcessedFile {
  fileName: string;
  records: ServerRecord[];
  fileTotalRow: ServerRecord | null; // The specific "TOTAL" row found in the file
}

export interface AggregatedStats {
  totalIdle: number;
  totalBusy: number;
  totalFault: number;
  totalCalls: number;
  avgIdle: number;
  avgBusy: number;
  avgFault: number;
  utilizationIdle: number;
  utilizationBusy: number;
  utilizationFault: number;
  serverBreakdown: ServerRecord[]; // Aggregated by Server IP across files
}

export interface ComparisonPeriod {
  id: string;
  month: string;
  year: string;
  files: File[];
  stats: AggregatedStats | null;
}