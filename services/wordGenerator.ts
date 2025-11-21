import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, TextRun, HeadingLevel, AlignmentType, BorderStyle } from "docx";
import FileSaver from "file-saver";
import { AggregatedStats } from "../types";

export const generateWordReport = async (
    mainStats: AggregatedStats, 
    mainLabel: string, 
    serverCount: number,
    history: { label: string, stats: AggregatedStats }[] = [],
    customTitle?: string,
    customSummary?: string
) => {
  
  const FONT_FAMILY = "Calibri";

  // --- Helper for Borders ---
  const noBorder = { style: BorderStyle.NONE, size: 0, color: "auto" };
  const standardBorder = { style: BorderStyle.SINGLE, size: 4, color: "000000" };

  // --- Main Table Construction ---

  // 1. Header Row
  const headerRow = new TableRow({
    children: ["SERVER", "IDLE", "BUSY", "FAULT", "TOTAL"].map(text => 
      new TableCell({
        children: [new Paragraph({ 
            text, 
            style: "TableHeader",
            alignment: text === "SERVER" ? AlignmentType.LEFT : AlignmentType.RIGHT 
        })],
        width: { size: 20, type: WidthType.PERCENTAGE },
        margins: { top: 100, bottom: 100, left: 100, right: 100 },
        borders: {
            bottom: standardBorder,
            top: noBorder,
            left: noBorder,
            right: noBorder,
        }
      })
    ),
  });

  // 2. Data Rows
  const dataRows = mainStats.serverBreakdown.map(server => 
    new TableRow({
      children: [
        server.serverIp,
        server.idle.toString(),
        server.busy.toString(),
        server.fault.toString(),
        server.total.toString()
      ].map((text, index) => 
        new TableCell({ 
          children: [new Paragraph({ 
            text, 
            style: "TableData",
            alignment: index === 0 ? AlignmentType.LEFT : AlignmentType.RIGHT 
          })],
          margins: { top: 100, bottom: 100, left: 100, right: 100 },
          borders: { bottom: noBorder, top: noBorder, left: noBorder, right: noBorder }
        })
      )
    })
  );

  // 3. Total Row
  const totalRow = new TableRow({
    children: [
      "TOTAL",
      mainStats.totalIdle.toString(),
      mainStats.totalBusy.toString(),
      mainStats.totalFault.toString(),
      mainStats.totalCalls.toString()
    ].map((text, index) => 
      new TableCell({ 
        children: [new Paragraph({ 
          text, 
          style: "TableData", 
          alignment: index === 0 ? AlignmentType.LEFT : AlignmentType.RIGHT 
        })],
        margins: { top: 100, bottom: 100, left: 100, right: 100 },
        borders: {
            top: standardBorder,
            bottom: noBorder,
            left: noBorder,
            right: noBorder,
        }
      })
    )
  });

  // 4. Utilization Row
  const utilizationRow = new TableRow({
    children: [
      "UTILIZATION",
      `${mainStats.utilizationIdle.toFixed(2)}%`,
      `${mainStats.utilizationBusy.toFixed(2)}%`,
      `${mainStats.utilizationFault.toFixed(2)}%`,
      "" // Total col is empty for utilization
    ].map((text, index) => 
      new TableCell({ 
        children: [new Paragraph({ 
          text, 
          style: "TableData",
          alignment: index === 0 ? AlignmentType.LEFT : AlignmentType.RIGHT 
        })],
        margins: { top: 100, bottom: 100, left: 100, right: 100 },
        borders: { bottom: noBorder, top: noBorder, left: noBorder, right: noBorder }
      })
    )
  });

  const mainTable = new Table({
    rows: [headerRow, ...dataRows, totalRow, utilizationRow],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
        top: noBorder,
        bottom: { style: BorderStyle.SINGLE, size: 4, color: "888888" },
        left: noBorder,
        right: noBorder,
        insideHorizontal: noBorder,
        insideVertical: noBorder,
    }
  });

  // --- Comparison Table Construction (Multi-Month) ---
  let comparisonContent: any[] = [];

  if (history.length > 0) {
    // Combine history + current mainStats for the full table
    // Sort primarily by assumption that history is ordered, but let's just append Main to end
    const fullTimeline = [...history, { label: mainLabel, stats: mainStats }];

    // Columns: Metric | Month 1 | Month 2 | ... | Month N
    const headerTexts = ["METRIC", ...fullTimeline.map(h => h.label)];
    
    const compHeaderRow = new TableRow({
        children: headerTexts.map(text => 
          new TableCell({
            children: [new Paragraph({ text, style: "TableHeader", alignment: AlignmentType.CENTER })],
            borders: { bottom: standardBorder, top: noBorder, left: noBorder, right: noBorder }
          })
        )
    });

    const createCompRow = (label: string, accessor: (s: AggregatedStats) => number | string) => {
        return new TableRow({
            children: [
                new TableCell({ children: [new Paragraph({ text: label, style: "TableData" })], borders: { bottom: noBorder, top: noBorder, left: noBorder, right: noBorder } }),
                ...fullTimeline.map(item => {
                    const val = accessor(item.stats);
                    return new TableCell({ 
                        children: [new Paragraph({ text: val.toString(), style: "TableData", alignment: AlignmentType.CENTER })],
                        borders: { bottom: noBorder, top: noBorder, left: noBorder, right: noBorder }
                    });
                })
            ]
        });
    };

    const compRows = [
        createCompRow("Total Volume", (s) => s.totalCalls.toLocaleString()),
        createCompRow("Idle Count", (s) => s.totalIdle.toLocaleString()),
        createCompRow("Fault Count", (s) => s.totalFault.toLocaleString()),
        createCompRow("Fault %", (s) => `${s.utilizationFault.toFixed(2)}%`),
        createCompRow("Idle %", (s) => `${s.utilizationIdle.toFixed(2)}%`)
    ];

    const compTable = new Table({
        rows: [compHeaderRow, ...compRows],
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: { top: noBorder, bottom: { style: BorderStyle.SINGLE, size: 4, color: "888888" }, left: noBorder, right: noBorder, insideHorizontal: noBorder, insideVertical: noBorder }
    });

    comparisonContent = [
        new Paragraph({
            text: "3. Comparative Trend Analysis",
            style: "SectionHeading",
            pageBreakBefore: true
        }),
        new Paragraph({
            text: `The table below outlines the performance trend across the selected periods, culminating in ${mainLabel}.`,
            style: "NormalText",
        }),
        compTable
    ];
  }

  // Calculate the rounded idle utilization for the summary text (default fallback)
  const roundedUtilization = Math.round(mainStats.utilizationIdle);
  
  const defaultSummary = `This report provides a summary of ${roundedUtilization}% utilization for the call servers monitored for ${mainLabel}. The data includes user distribution across call servers, with segmentation into online (idle) and offline (fault) states. Key performance insights and utilization percentages are presented below.`;

  const finalSummary = customSummary ? customSummary : defaultSummary;
  const finalTitle = customTitle ? customTitle : `Call Server Utilization Report for ${mainLabel}`;

  const doc = new Document({
    styles: {
      paragraphStyles: [
        {
          id: "ReportTitle",
          name: "Report Title",
          run: {
            size: 28, // 14pt
            bold: true,
            font: FONT_FAMILY,
          },
          paragraph: {
            spacing: { after: 400 },
          },
        },
        {
          id: "SectionHeading",
          name: "Section Heading",
          run: {
            size: 24, // 12pt
            bold: true,
            font: FONT_FAMILY,
          },
          paragraph: {
            spacing: { before: 400, after: 200 },
          },
        },
        {
          id: "NormalText",
          name: "Normal Text",
          run: {
            size: 22, // 11pt
            font: FONT_FAMILY,
          },
          paragraph: {
            spacing: { line: 276 }, // 1.15 spacing
          },
        },
        {
            id: "TableHeader",
            name: "Table Header",
            run: {
              size: 20,
              font: FONT_FAMILY,
              bold: false, 
              allCaps: true,
            },
        },
        {
            id: "TableData",
            name: "Table Data",
            run: {
              size: 20,
              font: FONT_FAMILY,
            },
        },
      ],
    },
    sections: [
      {
        properties: {
            page: {
                margin: {
                    top: 1440, // 1 inch
                    right: 1440,
                    bottom: 1440,
                    left: 1440,
                }
            }
        },
        children: [
          // Title
          new Paragraph({
            text: finalTitle,
            style: "ReportTitle",
          }),
          
          // 1. Executive Summary
          new Paragraph({
            text: "1. Executive Summary",
            style: "SectionHeading",
          }),
          
          new Paragraph({
            style: "NormalText",
            children: [new TextRun(finalSummary)]
          }),

          // 2. Utilization Statistics
          new Paragraph({
            text: "2. Utilization Statistics",
            style: "SectionHeading",
          }),

          mainTable,

          // 3. Comparative Analysis (if applicable)
          ...comparisonContent
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const saveAs = (FileSaver as any).saveAs || FileSaver;
  saveAs(blob, `Utilization_Report_${mainLabel.replace(/[\/\s]/g, '_')}.docx`);
};