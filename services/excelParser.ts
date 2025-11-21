import * as XLSX from 'xlsx';
import { ProcessedFile, ServerRecord, RawRow, AggregatedStats } from '../types';

// Helper to normalize object keys (uppercase, trimmed)
const normalizeKeys = (obj: any): any => {
  const newObj: any = {};
  Object.keys(obj).forEach((key) => {
    newObj[key.toUpperCase().trim()] = obj[key];
  });
  return newObj;
};

export const parseExcelFiles = async (files: File[]): Promise<ProcessedFile[]> => {
  const processedFiles: ProcessedFile[] = [];

  for (const file of files) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Convert to JSON, raw
      const rawData = XLSX.utils.sheet_to_json(worksheet) as any[];
      
      const records: ServerRecord[] = [];
      let fileTotalRow: ServerRecord | null = null;

      rawData.forEach((row) => {
        const normRow = normalizeKeys(row) as RawRow;
        
        // Basic validation
        // Skip empty rows or rows without critical identifiers
        const serverVal = String(normRow.SERVER || '');
        const dateVal = String(normRow.DATE || '');
        
        if (!serverVal && !dateVal) return;

        const idle = Number(normRow.IDLE) || 0;
        const busy = Number(normRow.BUSY) || 0;
        const fault = Number(normRow.FAULT) || 0;
        const total = Number(normRow.TOTAL) || 0;
        
        const isTotalRow = 
          serverVal.toUpperCase().includes('TOTAL') || 
          dateVal.toUpperCase().includes('TOTAL');

        const record: ServerRecord = {
          date: dateVal,
          serverIp: serverVal,
          idle,
          busy,
          fault,
          total
        };

        if (isTotalRow) {
          fileTotalRow = record;
        } else if (serverVal) {
          // It's a server row. We allow 0 totals if it's a valid server row being reported.
          records.push(record);
        }
      });

      processedFiles.push({
        fileName: file.name,
        records,
        fileTotalRow
      });

    } catch (error) {
      console.error(`Error parsing file ${file.name}:`, error);
      // Skip malformed files or rethrow based on requirements
    }
  }

  return processedFiles;
};

export const calculateAggregates = (files: ProcessedFile[]): AggregatedStats => {
  const fileCount = files.length || 1;
  
  // Map to store sums for each server
  const serverSums = new Map<string, {
    idle: number;
    busy: number;
    fault: number;
    total: number;
  }>();

  files.forEach((file) => {
    file.records.forEach(record => {
       const ip = record.serverIp.trim();
       if (!ip) return;

       const current = serverSums.get(ip) || { idle: 0, busy: 0, fault: 0, total: 0 };
       
       serverSums.set(ip, {
         idle: current.idle + record.idle,
         busy: current.busy + record.busy,
         fault: current.fault + record.fault,
         total: current.total + record.total
       });
    });
  });

  // Calculate Averages per server
  const serverBreakdown: ServerRecord[] = [];
  
  let grandTotalIdle = 0;
  let grandTotalBusy = 0;
  let grandTotalFault = 0;
  let grandTotalCalls = 0;

  serverSums.forEach((sums, ip) => {
      // Calculate average and round to nearest integer as per requirements
      const avgIdle = Math.round(sums.idle / fileCount);
      const avgBusy = Math.round(sums.busy / fileCount);
      const avgFault = Math.round(sums.fault / fileCount);
      
      // Recalculate total based on averaged components to ensure row arithmetic is correct (Idle + Busy + Fault = Total)
      const avgTotal = avgIdle + avgBusy + avgFault; 

      serverBreakdown.push({
          serverIp: ip,
          date: '', // Not used in aggregate view
          idle: avgIdle,
          busy: avgBusy,
          fault: avgFault,
          total: avgTotal
      });

      // Accumulate grand totals from the server averages
      grandTotalIdle += avgIdle;
      grandTotalBusy += avgBusy;
      grandTotalFault += avgFault;
      grandTotalCalls += avgTotal;
  });

  // Sort servers by IP for consistent display
  serverBreakdown.sort((a, b) => a.serverIp.localeCompare(b.serverIp));

  // Utilization percentages based on Grand Totals
  // Avoid division by zero
  const utilizationIdle = grandTotalCalls > 0 ? (grandTotalIdle / grandTotalCalls) * 100 : 0;
  const utilizationBusy = grandTotalCalls > 0 ? (grandTotalBusy / grandTotalCalls) * 100 : 0;
  const utilizationFault = grandTotalCalls > 0 ? (grandTotalFault / grandTotalCalls) * 100 : 0;

  return {
    totalIdle: grandTotalIdle,
    totalBusy: grandTotalBusy,
    totalFault: grandTotalFault,
    totalCalls: grandTotalCalls,
    avgIdle: grandTotalIdle, 
    avgBusy: grandTotalBusy,
    avgFault: grandTotalFault,
    utilizationIdle,
    utilizationBusy,
    utilizationFault,
    serverBreakdown
  };
};
