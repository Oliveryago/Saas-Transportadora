import { formatBRL } from "./reportExporter";

interface TrechoData {
  recordId: string;
  vehicleId: string;
  date: string;
  kmInicial: number;
  kmFinal: number;
  distancia: number;
  liters: number;
  kmPorLitro: number;
  valorTotal: number;
  posto: string;
  isFirst: boolean;
  isFull: boolean;
}

interface VehicleInfo {
  id: string;
  license_plate: string;
  model: string;
}

function formatLocalDate(dateStr: string): string {
  if (!dateStr) return "-";
  const [year, month, day] = dateStr.split("T")[0].split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("pt-BR");
}

function getConsumptionLabel(kml: number): string {
  if (kml <= 0 || kml === -1) return "Parcial";
  if (kml >= 3) return "Bom";
  if (kml >= 2) return "Normal";
  return "Alto consumo";
}

function buildReportRows(trechos: TrechoData[], getVehicleName: (id: string) => string, includeVehicle = true) {
  return trechos.map((t) => ({
    veiculo: includeVehicle ? getVehicleName(t.vehicleId) : undefined,
    data: formatLocalDate(t.date),
    km_inicial: t.isFirst ? "-" : t.kmInicial.toLocaleString("pt-BR"),
    km_final: t.kmFinal.toLocaleString("pt-BR"),
    distancia: t.isFirst ? "-" : `${t.distancia.toLocaleString("pt-BR")} km`,
    litros: `${t.liters.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 3 })} L`,
    valor: formatBRL(t.valorTotal),
    consumo: t.isFirst ? "Aguardando" : t.kmPorLitro === -1 ? "Parcial" : `${t.kmPorLitro.toFixed(2)} km/l`,
    classificacao: t.isFirst ? "-" : t.kmPorLitro > 0 ? getConsumptionLabel(t.kmPorLitro) : "-",
    posto: t.posto,
  }));
}

function buildSummary(trechos: TrechoData[]) {
  const trechosComConsumo = trechos.filter((t) => !t.isFirst && t.kmPorLitro > 0);
  const totalKm = trechosComConsumo.reduce((s, t) => s + t.distancia, 0);
  const totalLitros = trechos.reduce((s, t) => s + t.liters, 0);
  const totalValor = trechos.reduce((s, t) => s + t.valorTotal, 0);
  const consumableLiters = trechosComConsumo.reduce((s, t) => s + t.liters, 0);
  const avgKmL = consumableLiters > 0 ? totalKm / consumableLiters : 0;
  return { totalKm, totalLitros, totalValor, avgKmL, count: trechos.length };
}

/**
 * Gera relatório PDF de combustível
 * @param trechos - lista de trechos (filtrada por veículo se individual)
 * @param vehicles - todos os veículos
 * @param tenantName - nome da empresa
 * @param vehicleId - se definido, relatório é individual
 */
export async function generateFuelReportPDF(
  trechos: TrechoData[],
  vehicles: VehicleInfo[],
  tenantName?: string,
  vehicleId?: string
): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const now = new Date().toLocaleString("pt-BR");

  const getVehicleName = (id: string) => {
    const v = vehicles.find((v) => v.id === id);
    return v ? `${v.license_plate} - ${v.model}` : id;
  };

  const vehicle = vehicleId ? vehicles.find((v) => v.id === vehicleId) : null;
  const title = vehicle
    ? `RELATÓRIO DE COMBUSTÍVEL — ${vehicle.license_plate}`
    : "RELATÓRIO DE COMBUSTÍVEL — FROTA COMPLETA";

  // ── Header ──────────────────────────────────────────────────────────────
  doc.setFillColor(16, 120, 60); // dark green
  doc.rect(0, 0, pageWidth, 28, "F");

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(title, pageWidth / 2, 12, { align: "center" });

  if (tenantName) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(tenantName, pageWidth / 2, 20, { align: "center" });
  }

  doc.setFontSize(8);
  doc.setTextColor(200, 255, 200);
  doc.text(`Gerado em: ${now}`, pageWidth / 2, 26, { align: "center" });

  // ── Summary Cards ────────────────────────────────────────────────────────
  const summary = buildSummary(trechos);
  doc.setTextColor(0, 0, 0);
  const cardY = 35;
  const cards = [
    { label: "Registros", value: String(summary.count) },
    { label: "Total Litros", value: `${summary.totalLitros.toLocaleString("pt-BR", { minimumFractionDigits: 1 })} L` },
    { label: "Custo Total", value: formatBRL(summary.totalValor) },
    { label: "KM Percorridos", value: `${summary.totalKm.toLocaleString("pt-BR")} km` },
    { label: "Consumo Médio", value: summary.avgKmL > 0 ? `${summary.avgKmL.toFixed(2)} km/l` : "-" },
  ];

  const cardW = (pageWidth - 30) / cards.length;
  cards.forEach((card, i) => {
    const x = 15 + i * cardW;
    doc.setFillColor(240, 249, 244);
    doc.roundedRect(x, cardY, cardW - 4, 18, 2, 2, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(card.label.toUpperCase(), x + (cardW - 4) / 2, cardY + 6, { align: "center" });
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(16, 120, 60);
    doc.text(card.value, x + (cardW - 4) / 2, cardY + 14, { align: "center" });
  });

  // ── Table ────────────────────────────────────────────────────────────────
  const rows = buildReportRows(trechos, getVehicleName, !vehicleId);
  const head = vehicleId
    ? [["Data", "KM Inicial", "KM Final", "Distância", "Litros", "Valor (R$)", "Consumo", "Classificação", "Posto"]]
    : [["Veículo", "Data", "KM Inicial", "KM Final", "Distância", "Litros", "Valor (R$)", "Consumo", "Classificação", "Posto"]];
  const body = rows.map((r) =>
    vehicleId
      ? [r.data, r.km_inicial, r.km_final, r.distancia, r.litros, r.valor, r.consumo, r.classificacao, r.posto]
      : [r.veiculo, r.data, r.km_inicial, r.km_final, r.distancia, r.litros, r.valor, r.consumo, r.classificacao, r.posto]
  );

  autoTable(doc, {
    head,
    body,
    startY: 58,
    styles: { fontSize: 7.5, cellPadding: 2.5 },
    headStyles: { fillColor: [16, 120, 60], textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 250, 247] },
    columnStyles: {
      [vehicleId ? 0 : 1]: { halign: "center" }, // data
      [vehicleId ? 3 : 4]: { halign: "right" },  // distancia
      [vehicleId ? 4 : 5]: { halign: "right" },  // litros
      [vehicleId ? 5 : 6]: { halign: "right" },  // valor
      [vehicleId ? 6 : 7]: { halign: "center" }, // consumo
      [vehicleId ? 7 : 8]: { halign: "center" }, // classificacao
    },
    didDrawPage: (d: any) => {
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Página ${d.pageNumber} de ${pageCount} — SaaS Transportadora`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: "center" }
      );
    },
  });

  const fileName = vehicle
    ? `Relatorio_Combustivel_${vehicle.license_plate}_${new Date().toISOString().slice(0, 10)}.pdf`
    : `Relatorio_Combustivel_Frota_${new Date().toISOString().slice(0, 10)}.pdf`;

  doc.save(fileName);
}

/**
 * Gera relatório Excel de combustível
 */
export async function generateFuelReportExcel(
  trechos: TrechoData[],
  vehicles: VehicleInfo[],
  tenantName?: string,
  vehicleId?: string
): Promise<void> {
  const XLSX = await import("xlsx");

  const getVehicleName = (id: string) => {
    const v = vehicles.find((v) => v.id === id);
    return v ? `${v.license_plate} - ${v.model}` : id;
  };

  const vehicle = vehicleId ? vehicles.find((v) => v.id === vehicleId) : null;
  const summary = buildSummary(trechos);

  const headerRows = [
    [vehicle ? `Relatório de Combustível — ${vehicle.license_plate}` : "Relatório de Combustível — Frota Completa"],
    tenantName ? [`Empresa: ${tenantName}`] : [],
    [`Gerado em: ${new Date().toLocaleString("pt-BR")}`],
    [],
    ["RESUMO"],
    ["Registros", summary.count],
    ["Total Litros", summary.totalLitros],
    ["Custo Total (R$)", summary.totalValor],
    ["KM Percorridos", summary.totalKm],
    ["Consumo Médio (km/l)", summary.avgKmL > 0 ? summary.avgKmL.toFixed(2) : "-"],
    [],
    ["DETALHAMENTO"],
  ].filter((r) => r.length > 0);

  const colHeaders = vehicleId
    ? ["Data", "KM Inicial", "KM Final", "Distância (km)", "Litros", "Valor (R$)", "Consumo (km/l)", "Classificação", "Posto"]
    : ["Veículo", "Data", "KM Inicial", "KM Final", "Distância (km)", "Litros", "Valor (R$)", "Consumo (km/l)", "Classificação", "Posto"];

  const rows = buildReportRows(trechos, getVehicleName, !vehicleId);
  const dataRows = rows.map((r) =>
    vehicleId
      ? [r.data, r.km_inicial, r.km_final, r.distancia, r.litros, r.valor, r.consumo, r.classificacao, r.posto]
      : [r.veiculo, r.data, r.km_inicial, r.km_final, r.distancia, r.litros, r.valor, r.consumo, r.classificacao, r.posto]
  );

  const sheetData = [...headerRows, colHeaders, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws["!cols"] = colHeaders.map(() => ({ wch: 18 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Combustível");

  const fileName = vehicle
    ? `Relatorio_Combustivel_${vehicle.license_plate}_${new Date().toISOString().slice(0, 10)}.xlsx`
    : `Relatorio_Combustivel_Frota_${new Date().toISOString().slice(0, 10)}.xlsx`;

  XLSX.writeFile(wb, fileName);
}
