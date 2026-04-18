import { formatBRL, formatDate } from "./reportExporter";

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
}

export interface VehicleSheetData {
  plate: string;
  model: string;
  year: number;
  capacity?: number;
  active: boolean;
  tenantName?: string;
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
}

/**
 * Helper to add header to document
 */
function addDocumentHeader(doc: any, title: string, tenantName?: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(title, pageWidth / 2, 25, { align: "center" });

  if (tenantName) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text(tenantName, pageWidth / 2, 33, { align: "center" });
  }

  doc.setLineWidth(0.5);
  doc.line(20, 38, pageWidth - 20, 38);
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
  
  addDocumentHeader(doc, "ORDEM DE SERVIÇO - MANUTENÇÃO", data.tenantName);

  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text("Informações da Manutenção", 20, 50);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`OS Número: ${data.id.substring(0, 8).toUpperCase()}`, 20, 60);
  doc.text(`Data: ${formatDate(data.date)}`, 120, 60);
  doc.text(`Veículo: ${data.vehiclePlate} - ${data.vehicleModel}`, 20, 68);
  doc.text(`Tipo de Serviço: ${data.type}`, 20, 76);
  
  doc.setFont("helvetica", "bold");
  doc.text("Descrição:", 20, 88);
  doc.setFont("helvetica", "normal");
  const splitDesc = doc.splitTextToSize(data.description || "Nenhuma descrição fornecida.", 170);
  doc.text(splitDesc, 20, 94);

  let currentY = 100 + (splitDesc.length * 5);

  doc.setFont("helvetica", "bold");
  doc.text("Peças / Serviços:", 20, currentY);

  if (data.parts && data.parts.length > 0) {
    autoTable(doc, {
      startY: currentY + 5,
      head: [["Descrição", "Qtd", "Custo Unitário", "Subtotal"]],
      body: data.parts.map(p => [
        p.name, 
        p.quantity, 
        formatBRL(p.cost), 
        formatBRL(p.quantity * p.cost)
      ]),
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] }, // Indigo-600
      styles: { fontSize: 9 },
      columnStyles: {
        1: { halign: 'center' },
        2: { halign: 'right' },
        3: { halign: 'right' }
      }
    });
    currentY = (doc as any).lastAutoTable.finalY + 15;
  } else {
    doc.setFont("helvetica", "italic");
    doc.text("Nenhuma peça registrada separadamente.", 20, currentY + 8);
    currentY += 15;
  }

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`Valor Total: ${formatBRL(data.totalValue)}`, 190, currentY, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  
  const signatureY = currentY + 40;
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
  
  addDocumentHeader(doc, "FICHA CADASTRAL DO VEÍCULO", data.tenantName);

  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text("Dados Básicos", 20, 50);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Placa: ${data.plate}`, 20, 60);
  doc.text(`Modelo: ${data.model}`, 20, 68);
  doc.text(`Ano: ${data.year}`, 20, 76);
  doc.text(`Capacidade: ${data.capacity ? data.capacity + " kg" : "N/I"}`, 120, 60);
  doc.text(`Status: ${data.active ? "Ativo" : "Inativo"}`, 120, 68);

  doc.setFont("helvetica", "bold");
  doc.text("Estatísticas (Estimadas)", 20, 95);
  doc.setFont("helvetica", "normal");
  doc.text(`KM Total Registrado: ${data.stats.totalKm.toLocaleString("pt-BR")} km`, 20, 105);
  doc.text(`Custo Total Combustível: ${formatBRL(data.stats.totalFuelValue)}`, 20, 113);
  doc.text(`Custo Total Manutenção: ${formatBRL(data.stats.totalMaintenanceValue)}`, 20, 121);

  if (data.qrCodeDataURL) {
    doc.setFont("helvetica", "bold");
    doc.text("QR Code do Veículo", 20, 145);
    // Add image (data URL, "PNG", x, y, width, height)
    try {
      doc.addImage(data.qrCodeDataURL, "PNG", 20, 150, 50, 50);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("Scaneie para acesso rápido no app", 45, 205, { align: "center" });
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

  // Format as a smaller receipt
  const doc = new jsPDF({ orientation: "portrait", format: "a5" });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(`COMPROVANTE - ${data.type.toUpperCase()}`, pageWidth / 2, 20, { align: "center" });

  if (data.tenantName) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(data.tenantName, pageWidth / 2, 27, { align: "center" });
  }

  doc.setLineWidth(0.5);
  doc.line(10, 32, pageWidth - 10, 32);

  doc.setFontSize(10);
  doc.text(`Cód: ${data.id.substring(0, 8).toUpperCase()}`, 15, 42);
  doc.text(`Data: ${formatDate(data.date)}`, pageWidth - 15, 42, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.text(`Veículo: ${data.vehiclePlate} (${data.vehicleModel})`, 15, 52);
  
  if (data.driverName) {
    doc.text(`Motorista: ${data.driverName}`, 15, 60);
  }

  const detailsArray = Object.entries(data.details).map(([key, val]) => [key, String(val)]);
  
  autoTable(doc, {
    startY: 70,
    head: [["Item", "Detalhe"]],
    body: detailsArray,
    theme: 'plain',
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] },
    styles: { fontSize: 10, cellPadding: 3 },
    margin: { left: 15, right: 15 }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 15;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`Total: ${formatBRL(data.value)}`, pageWidth - 15, finalY, { align: "right" });

  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(150);
  doc.text("Documento gerado eletronicamente.", pageWidth / 2, pageHeight - 10, { align: "center" });

  doc.save(`Comprovante_${data.type}_${data.vehiclePlate}_${data.id.substring(0, 8)}.pdf`);
}
