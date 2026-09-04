import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { PneuIndividual } from "../types/pneu";
import { formatDate } from "./reportExporter";

export function gerarEtiquetasMarcacaoPneu(pneus: PneuIndividual[]) {
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text("Marcação de fogo — pneus", 14, 16);
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text("Aplique o código gerado pelo sistema em cada pneu. Não reutilize códigos.", 14, 22);

  autoTable(doc, {
    startY: 28,
    head: [["Código", "Marca / modelo", "Medida", "NF", "Data"]],
    body: pneus.map((pneu) => [
      pneu.codigo_marcacao,
      [pneu.marca, pneu.modelo].filter(Boolean).join(" ") || "-",
      pneu.medida || "-",
      pneu.nota_fiscal || "-",
      pneu.data_compra ? formatDate(pneu.data_compra) : "-",
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [15, 23, 42] },
  });

  doc.save("etiquetas-marcacao-pneus.pdf");
}
