import { formatLocalDate } from "../lib/utils/date";

interface ExportOptions {
  title: string;
  companyName?: string;
  period?: string;
  generatedAt?: string;
}

interface TableColumn {
  header: string;
  dataKey: string;
  align?: "left" | "center" | "right";
}

interface ExportData {
  columns: TableColumn[];
  rows: Record<string, any>[];
}

/**
 * Exporta dados para PDF usando jsPDF + autoTable (lazy loaded)
 */
export async function exportToPDF(
  data: ExportData,
  options: ExportOptions
): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const now = options.generatedAt || new Date().toLocaleString("pt-BR");

  // Header
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(options.title, pageWidth / 2, 20, { align: "center" });

  if (options.companyName) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(options.companyName, pageWidth / 2, 28, { align: "center" });
  }

  if (options.period) {
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Período: ${options.period}`, pageWidth / 2, 34, { align: "center" });
  }

  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(`Gerado em: ${now}`, pageWidth / 2, 40, { align: "center" });

  // Table
  const headers = data.columns.map(c => c.header);
  const body = data.rows.map(row =>
    data.columns.map(col => {
      const val = row[col.dataKey];
      return val !== null && val !== undefined ? String(val) : "-";
    })
  );

  autoTable(doc, {
    head: [headers],
    body,
    startY: 46,
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
    columnStyles: data.columns.reduce((acc, col, i) => {
      if (col.align === "right") {
        acc[i] = { halign: "right" };
      } else if (col.align === "center") {
        acc[i] = { halign: "center" };
      }
      return acc;
    }, {} as Record<number, any>),
    didDrawPage: (d: any) => {
      // Footer with page number
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Página ${d.pageNumber} de ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: "center" }
      );
    },
  });

  // Download
  const fileName = `${options.title.replace(/\s+/g, "_").toLowerCase()}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}

/**
 * Exporta dados para Excel usando SheetJS (lazy loaded)
 */
export async function exportToExcel(
  data: ExportData,
  options: ExportOptions
): Promise<void> {
  const XLSX = await import("xlsx");

  // Create header info rows
  const infoRows: string[][] = [
    [options.title],
    options.companyName ? [`Empresa: ${options.companyName}`] : [],
    options.period ? [`Período: ${options.period}`] : [],
    [`Gerado em: ${options.generatedAt || new Date().toLocaleString("pt-BR")}`],
    [], // empty row separator
  ].filter(r => r.length > 0);

  // Create data rows
  const headers = data.columns.map(c => c.header);
  const rows = data.rows.map(row =>
    data.columns.map(col => {
      const val = row[col.dataKey];
      return val !== null && val !== undefined ? val : "";
    })
  );

  // Combine
  const sheetData = [...infoRows, headers, ...rows];

  // Create workbook
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Set column widths
  ws["!cols"] = data.columns.map(col => ({
    wch: Math.max(col.header.length + 4, 15),
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Relatório");

  // Download
  const fileName = `${options.title.replace(/\s+/g, "_").toLowerCase()}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Formata valor em Real brasileiro
 */
export function formatBRL(value: number): string {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Formata data para pt-BR
 */
export function formatDate(dateStr: string): string {
  return formatLocalDate(dateStr);
}
