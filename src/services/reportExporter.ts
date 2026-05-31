import { formatLocalDate } from "../lib/utils/date";
import { buildAddressLine, formatCNPJ, formatPhone } from "./companySettingsHelper";
import type { CompanySettings } from "../types";

export interface CompanyInfo {
  settings?: CompanySettings | null;
  logoDataUrl?: string | null;
}

interface ExportOptions {
  title: string;
  company?: CompanyInfo;
  /** @deprecated use company.settings.company_name instead — kept for backwards compat */
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
 * Renders the PDF header block with logo + company info.
 * Returns the Y position after the header.
 */
function renderPDFHeader(
  doc: any,
  title: string,
  options: ExportOptions
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const s = options.company?.settings;
  const logoDataUrl = options.company?.logoDataUrl;
  const name = s?.company_name || options.companyName || "";
  const now = options.generatedAt || new Date().toLocaleString("pt-BR");

  let y = 15;
  let leftX = 20;

  // ── Logo ───────────────────────────────────────────────────────────────────
  if (logoDataUrl) {
    try {
      const props = doc.getImageProperties(logoDataUrl);
      const ratio = props.width / props.height;
      const maxLogoSize = 18;
      let imgW = maxLogoSize;
      let imgH = maxLogoSize;
      if (ratio > 1) {
        imgH = maxLogoSize / ratio;
      } else {
        imgW = maxLogoSize * ratio;
      }
      doc.addImage(logoDataUrl, leftX, y - 4, imgW, imgH);
      leftX = leftX + imgW + 5;
    } catch {
      // ignore if logo can't be rendered
    }
  }

  // ── Title ─────────────────────────────────────────────────────────────────
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 58, 138);
  doc.text(title, pageWidth / 2, y, { align: "center" });
  y += 8;

  // ── Company Name ──────────────────────────────────────────────────────────
  if (name) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text(name, pageWidth / 2, y, { align: "center" });
    y += 6;
  }

  // ── Company Details ───────────────────────────────────────────────────────
  if (s) {
    const details: string[] = [];
    if (s.cnpj) details.push(`CNPJ: ${formatCNPJ(s.cnpj)}`);
    if (s.phone) details.push(`Tel: ${formatPhone(s.phone)}`);
    if (s.email) details.push(s.email);
    const addressLine = buildAddressLine(s);

    if (details.length > 0) {
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text(details.join("   |   "), pageWidth / 2, y, { align: "center" });
      y += 5;
    }
    if (addressLine) {
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(130);
      doc.text(addressLine, pageWidth / 2, y, { align: "center" });
      y += 5;
    }
  }

  // ── Divider ───────────────────────────────────────────────────────────────
  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(0.5);
  doc.line(20, y, pageWidth - 20, y);
  y += 4;

  // ── Period & Generated ────────────────────────────────────────────────────
  if (options.period) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80);
    doc.text(`Período: ${options.period}`, pageWidth / 2, y, { align: "center" });
    y += 5;
  }

  doc.setFontSize(7.5);
  doc.setTextColor(150);
  doc.text(`Gerado em: ${now}`, pageWidth / 2, y, { align: "center" });
  y += 6;

  return y;
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

  const startY = renderPDFHeader(doc, options.title, options);

  // Table
  const headers = data.columns.map((c) => c.header);
  const body = data.rows.map((row) =>
    data.columns.map((col) => {
      const val = row[col.dataKey];
      return val !== null && val !== undefined ? String(val) : "-";
    })
  );

  autoTable(doc, {
    head: [headers],
    body,
    startY,
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
  const s = options.company?.settings;
  const name = s?.company_name || options.companyName || "";

  const infoRows: string[][] = [
    [options.title],
    name ? [`Empresa: ${name}`] : [],
    s?.cnpj ? [`CNPJ: ${formatCNPJ(s.cnpj)}`] : [],
    s?.phone ? [`Telefone: ${formatPhone(s.phone)}`] : [],
    s?.email ? [`E-mail: ${s.email}`] : [],
    options.period ? [`Período: ${options.period}`] : [],
    [`Gerado em: ${options.generatedAt || new Date().toLocaleString("pt-BR")}`],
    [],
  ].filter((r) => r.length > 0);

  const headers = data.columns.map((c) => c.header);
  const rows = data.rows.map((row) =>
    data.columns.map((col) => {
      const val = row[col.dataKey];
      return val !== null && val !== undefined ? val : "";
    })
  );

  const sheetData = [...infoRows, headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws["!cols"] = data.columns.map((col) => ({
    wch: Math.max(col.header.length + 4, 15),
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Relatório");

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
