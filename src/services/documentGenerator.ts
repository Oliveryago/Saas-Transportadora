import { formatBRL, formatDate } from "./reportExporter";
import { buildAddressLine, formatCNPJ, formatPhone } from "./companySettingsHelper";
import type { CompanySettings } from "../types";

export interface CompanyInfo {
  settings?: CompanySettings | null;
  logoDataUrl?: string | null;
}

// Tipos para os documentos
export interface MaintenanceOSData {
  id: string;
  vehiclePlate: string;
  vehicleModel: string;
  date: string;
  type: string;
  description: string;
  parts: { name: string; quantity: number; cost: number }[];
  totalValue: number;
  tenantName?: string;
  company?: CompanyInfo;
}

export interface VehicleSheetData {
  plate: string;
  model: string;
  year: number;
  capacity?: number;
  active: boolean;
  tenantName?: string;
  company?: CompanyInfo;
  qrCodeDataURL?: string;
  stats: {
    totalKm: number;
    totalFuelValue: number;
    totalMaintenanceValue: number;
  };
}

export interface VoucherData {
  id: string;
  type: "Combustível" | "Lavagem" | "Pedágio" | "Estacionamento" | "Troca de Óleo" | "Troca de Pneu";
  date: string;
  vehiclePlate: string;
  vehicleModel: string;
  value: number;
  details: Record<string, string | number>;
  tenantName?: string;
  driverName?: string;
  company?: CompanyInfo;
}

export interface DriverProfileData {
  id: string;
  name: string;
  cpf: string;
  birthDate?: string;
  phone?: string;
  cnhNumber?: string;
  cnhCategory?: string;
  cnhValidity?: string;
  address?: string;
  active: boolean;
  photoUrl?: string;
  vehiclePlate?: string;
  implementPlate?: string;
  implement2Plate?: string;
  tenantName?: string;
  company?: CompanyInfo;
}

/**
 * Helper to add a rich header to portrait documents.
 * Returns the Y position after the header block.
 */
function addDocumentHeader(
  doc: any,
  title: string,
  company?: CompanyInfo,
  tenantName?: string
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const s = company?.settings;
  const logoDataUrl = company?.logoDataUrl;
  const name = s?.company_name || tenantName || "";

  let y = 18;

  // Logo (top-left, portrait)
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
      doc.addImage(logoDataUrl, 20, y - 4, imgW, imgH);
    } catch {
      // ignore
    }
  }

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 58, 138);
  doc.text(title, pageWidth / 2, y, { align: "center" });
  y += 8;

  // Company name
  if (name) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text(name, pageWidth / 2, y, { align: "center" });
    y += 6;
  }

  // Company details inline
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

  // Divider
  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(0.5);
  doc.line(20, y, pageWidth - 20, y);
  y += 6;

  return y;
}

/**
 * Helper to add footer to document
 */
function addDocumentFooter(doc: any) {
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const now = new Date().toLocaleString("pt-BR");

  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(`Documento gerado em: ${now} - SaaS Transportadora`, pageWidth / 2, pageHeight - 10, { align: "center" });
}

/**
 * Gera Ordem de Serviço (OS) de Manutenção
 */
export async function generateMaintenanceOS(data: MaintenanceOSData): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait" });

  let currentY = addDocumentHeader(doc, "ORDEM DE SERVIÇO — MANUTENÇÃO", data.company, data.tenantName);

  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text("Informações da Manutenção", 20, currentY);
  currentY += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`OS Número: ${data.id.substring(0, 8).toUpperCase()}`, 20, currentY);
  doc.text(`Data: ${formatDate(data.date)}`, 120, currentY);
  currentY += 7;
  doc.text(`Veículo: ${data.vehiclePlate} - ${data.vehicleModel}`, 20, currentY);
  doc.text(`Tipo de Serviço: ${data.type}`, 20, currentY + 7);
  currentY += 14;

  doc.setFont("helvetica", "bold");
  doc.text("Descrição:", 20, currentY);
  currentY += 5;
  doc.setFont("helvetica", "normal");
  const splitDesc = doc.splitTextToSize(data.description || "Nenhuma descrição fornecida.", 170);
  doc.text(splitDesc, 20, currentY);
  currentY += splitDesc.length * 5 + 5;

  doc.setFont("helvetica", "bold");
  doc.text("Peças / Serviços:", 20, currentY);

  if (data.parts && data.parts.length > 0) {
    autoTable(doc, {
      startY: currentY + 5,
      head: [["Descrição", "Qtd", "Custo Unitário", "Subtotal"]],
      body: data.parts.map((p) => [
        p.name,
        p.quantity,
        formatBRL(p.cost),
        formatBRL(p.quantity * p.cost),
      ]),
      theme: "grid",
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 9 },
      columnStyles: {
        1: { halign: "center" },
        2: { halign: "right" },
        3: { halign: "right" },
      },
    });
    currentY = (doc as any).lastAutoTable.finalY + 15;
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.text("Nenhuma peça registrada separadamente.", 20, currentY + 8);
    currentY += 15;
  }

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 58, 138);
  doc.text(`Valor Total: ${formatBRL(data.totalValue)}`, 190, currentY, { align: "right" });
  doc.setTextColor(0);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  const signatureY = currentY + 35;
  doc.line(30, signatureY, 90, signatureY);
  doc.text("Assinatura do Gestor", 60, signatureY + 5, { align: "center" });
  doc.line(120, signatureY, 180, signatureY);
  doc.text("Assinatura do Mecânico", 150, signatureY + 5, { align: "center" });

  addDocumentFooter(doc);
  doc.save(`OS_Manutencao_${data.vehiclePlate}_${data.id.substring(0, 8)}.pdf`);
}

/**
 * Gera Ficha do Veículo
 */
export async function generateVehicleSheet(data: VehicleSheetData): Promise<void> {
  const { default: jsPDF } = await import("jspdf");

  const doc = new jsPDF({ orientation: "portrait" });

  let y = addDocumentHeader(doc, "FICHA CADASTRAL DO VEÍCULO", data.company, data.tenantName);

  doc.setFontSize(13);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text("Dados Básicos", 20, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Placa: ${data.plate}`, 20, y);
  doc.text(`Capacidade: ${data.capacity ? data.capacity + " kg" : "N/I"}`, 120, y);
  y += 7;
  doc.text(`Modelo: ${data.model}`, 20, y);
  doc.text(`Status: ${data.active ? "Ativo" : "Inativo"}`, 120, y);
  y += 7;
  doc.text(`Ano: ${data.year}`, 20, y);
  y += 12;

  doc.setFont("helvetica", "bold");
  doc.text("Estatísticas (Estimadas)", 20, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.text(`KM Total Registrado: ${data.stats.totalKm.toLocaleString("pt-BR")} km`, 20, y);
  y += 7;
  doc.text(`Custo Total Combustível: ${formatBRL(data.stats.totalFuelValue)}`, 20, y);
  y += 7;
  doc.text(`Custo Total Manutenção: ${formatBRL(data.stats.totalMaintenanceValue)}`, 20, y);
  y += 15;

  if (data.qrCodeDataURL) {
    doc.setFont("helvetica", "bold");
    doc.text("QR Code do Veículo", 20, y);
    y += 5;
    try {
      doc.addImage(data.qrCodeDataURL, "PNG", 20, y, 50, 50);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("Scaneie para acesso rápido no app", 45, y + 55, { align: "center" });
    } catch (err) {
      console.warn("Could not add QR Code to PDF", err);
    }
  }

  addDocumentFooter(doc);
  doc.save(`Ficha_Veiculo_${data.plate}.pdf`);
}

/**
 * Gera Comprovante
 */
export async function generateVoucher(data: VoucherData): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", format: "a5" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const s = data.company?.settings;
  const logoDataUrl = data.company?.logoDataUrl;
  const name = s?.company_name || data.tenantName || "";

  // Compact header for A5
  let y = 15;

  if (logoDataUrl) {
    try {
      const props = doc.getImageProperties(logoDataUrl);
      const ratio = props.width / props.height;
      const maxLogoSize = 14;
      let imgW = maxLogoSize;
      let imgH = maxLogoSize;
      if (ratio > 1) {
        imgH = maxLogoSize / ratio;
      } else {
        imgW = maxLogoSize * ratio;
      }
      doc.addImage(logoDataUrl, 10, y - 4, imgW, imgH);
    } catch { /* ignore */ }
  }

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 58, 138);
  doc.text(`COMPROVANTE — ${data.type.toUpperCase()}`, pageWidth / 2, y, { align: "center" });
  y += 7;

  if (name) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 30, 30);
    doc.text(name, pageWidth / 2, y, { align: "center" });
    y += 5;
  }

  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(0.5);
  doc.line(10, y, pageWidth - 10, y);
  y += 6;

  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text(`Cód: ${data.id.substring(0, 8).toUpperCase()}`, 15, y);
  doc.text(`Data: ${formatDate(data.date)}`, pageWidth - 15, y, { align: "right" });
  y += 7;

  doc.setFont("helvetica", "bold");
  doc.text(`Veículo: ${data.vehiclePlate} (${data.vehicleModel})`, 15, y);
  y += 6;

  if (data.driverName) {
    doc.text(`Motorista: ${data.driverName}`, 15, y);
    y += 6;
  }

  const detailsArray = Object.entries(data.details).map(([key, val]) => [key, String(val)]);

  autoTable(doc, {
    startY: y,
    head: [["Item", "Detalhe"]],
    body: detailsArray,
    theme: "plain",
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] },
    styles: { fontSize: 9, cellPadding: 2.5 },
    margin: { left: 10, right: 10 },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 12;

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 58, 138);
  doc.text(`Total: ${formatBRL(data.value)}`, pageWidth - 15, finalY, { align: "right" });

  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(150);
  doc.text("Documento gerado eletronicamente.", pageWidth / 2, pageHeight - 8, { align: "center" });

  doc.save(`Comprovante_${data.type}_${data.vehiclePlate}_${data.id.substring(0, 8)}.pdf`);
}

/**
 * Converte uma URL de imagem em base64 para uso no jsPDF
 */
async function urlToBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Gera a Ficha Cadastral do Motorista em PDF
 */
export async function generateDriverProfile(data: DriverProfileData) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const s = data.company?.settings;

  // ── Pré-carregar logo ─────────────────────────────────────────────────────
  // Tentar em ordem: logoDataUrl já em base64 → logo_url no settings → nada
  let logoBase64: string | null = data.company?.logoDataUrl || null;
  if (!logoBase64 && s?.logo_url) {
    logoBase64 = await urlToBase64(s.logo_url);
  }

  // ── Cabeçalho ─────────────────────────────────────────────────────────────
  let y = 14;

  // Logo (canto superior esquerdo, proporção real)
  if (logoBase64) {
    try {
      const props = doc.getImageProperties(logoBase64);
      const ratio = props.width / props.height;
      const maxH = 22;
      const maxW = 45;
      let imgW = maxH * ratio;
      let imgH = maxH;
      if (imgW > maxW) {
        imgW = maxW;
        imgH = maxW / ratio;
      }
      doc.addImage(logoBase64, 15, y - 4, imgW, imgH);
    } catch { /* ignore */ }
  }

  // Título centralizado
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 58, 138);
  doc.text("FICHA CADASTRAL DO MOTORISTA", pageWidth / 2, y, { align: "center" });
  y += 7;

  // Nome da empresa
  const companyName = s?.company_name || data.tenantName || "";
  if (companyName) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40, 40, 40);
    doc.text(companyName, pageWidth / 2, y, { align: "center" });
    y += 5;
  }

  // Linha com CNPJ | Tel | E-mail
  if (s) {
    const details: string[] = [];
    if (s.cnpj) details.push(`CNPJ: ${formatCNPJ(s.cnpj)}`);
    if (s.phone) details.push(`Tel: ${formatPhone(s.phone)}`);
    if (s.email) details.push(s.email);
    if (details.length > 0) {
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      doc.text(details.join("   |   "), pageWidth / 2, y, { align: "center" });
      y += 4;
    }
    const addressLine = buildAddressLine(s);
    if (addressLine) {
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(110, 110, 110);
      doc.text(addressLine, pageWidth / 2, y, { align: "center" });
      y += 4;
    }
  }

  // Linha divisória azul
  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(0.5);
  doc.line(15, y, pageWidth - 15, y);
  y += 8;

  // ── Status Badge ──────────────────────────────────────────────────────────
  const statusText = data.active ? "ATIVO" : "INATIVO";
  const badgeColor: [number, number, number] = data.active ? [34, 197, 94] : [156, 163, 175];
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  const badgeWidth = doc.getTextWidth(statusText) + 8;
  doc.setFillColor(...badgeColor);
  doc.roundedRect(pageWidth - 15 - badgeWidth, y - 1, badgeWidth, 6, 1, 1, "F");
  doc.setTextColor(255, 255, 255);
  doc.text(statusText, pageWidth - 15 - badgeWidth / 2, y + 3.5, { align: "center" });

  // ── Foto + Dados Pessoais ─────────────────────────────────────────────────
  const photoX = 15;
  const photoY = y;
  const photoW = 38;
  const photoH = 38;

  if (data.photoUrl) {
    try {
      const photoBase64 = await urlToBase64(data.photoUrl);
      if (photoBase64) {
        doc.addImage(photoBase64, photoX, photoY, photoW, photoH);
        doc.setDrawColor(200);
        doc.setLineWidth(0.3);
        doc.rect(photoX, photoY, photoW, photoH);
      } else {
        throw new Error("no base64");
      }
    } catch {
      doc.setDrawColor(200);
      doc.setLineWidth(0.3);
      doc.rect(photoX, photoY, photoW, photoH);
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text("Sem foto", photoX + photoW / 2, photoY + photoH / 2, { align: "center" });
    }
  } else {
    doc.setDrawColor(200);
    doc.setLineWidth(0.3);
    doc.rect(photoX, photoY, photoW, photoH);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text("Sem foto", photoX + photoW / 2, photoY + photoH / 2, { align: "center" });
  }

  // Dados pessoais ao lado da foto
  const infoX = photoX + photoW + 6;
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text(data.name, infoX, y + 7);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(70, 70, 70);
  doc.text(`CPF: ${data.cpf}`, infoX, y + 14);
  if (data.birthDate) {
    doc.text(`Nascimento: ${formatDate(data.birthDate)}`, infoX, y + 20);
  }
  if (data.phone) {
    doc.text(`Telefone: ${formatPhone(data.phone)}`, infoX, y + 26);
  }

  y += photoH + 8;

  // ── CNH ───────────────────────────────────────────────────────────────────
  doc.setFillColor(235, 240, 255);
  doc.rect(15, y, pageWidth - 30, 7, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 58, 138);
  doc.text("Documentação (CNH)", 17, y + 5);
  y += 12;

  autoTable(doc, {
    startY: y,
    body: [
      ["Número da CNH:", data.cnhNumber || "Não informado"],
      ["Categoria:", data.cnhCategory || "Não informado"],
      ["Validade:", data.cnhValidity ? formatDate(data.cnhValidity) : "Não informado"],
    ],
    theme: "plain",
    styles: { fontSize: 9.5, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 50, textColor: [60, 60, 60] },
      1: { textColor: [20, 20, 20] }
    },
    margin: { left: 15, right: 15 }
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // ── Endereço ──────────────────────────────────────────────────────────────
  if (data.address) {
    doc.setFillColor(235, 240, 255);
    doc.rect(15, y, pageWidth - 30, 7, "F");
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 58, 138);
    doc.text("Endereço", 17, y + 5);
    y += 12;

    doc.setFontSize(9.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);
    const splitAddress = doc.splitTextToSize(data.address, pageWidth - 30);
    doc.text(splitAddress, 15, y);
    y += (splitAddress.length * 5) + 8;
  }

  // ── Vínculo de Frota ──────────────────────────────────────────────────────
  doc.setFillColor(235, 240, 255);
  doc.rect(15, y, pageWidth - 30, 7, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 58, 138);
  doc.text("Vínculo de Frota", 17, y + 5);
  y += 12;

  const fleetRows: string[][] = [
    ["Cavalo Mecânico:", data.vehiclePlate || "Nenhum vinculado"],
    ["1º Implemento:", data.implementPlate || "Nenhum vinculado"],
  ];
  if (data.implement2Plate) {
    fleetRows.push(["2º Implemento:", data.implement2Plate]);
  }

  autoTable(doc, {
    startY: y,
    body: fleetRows,
    theme: "plain",
    styles: { fontSize: 9.5, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 50, textColor: [60, 60, 60] },
      1: { textColor: [20, 20, 20] }
    },
    margin: { left: 15, right: 15 }
  });

  addDocumentFooter(doc);

  doc.save(`Ficha_Motorista_${data.name.replace(/\s+/g, "_")}.pdf`);
}
