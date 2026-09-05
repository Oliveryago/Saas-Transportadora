import { extractNfeKey } from "../../types/pneu";
import { NfeImportError, type NfeItemExtraido, type NfeNota } from "../../types/nfe";

const MEDIDA_RADIAL = /(\d{3})\s*\/\s*(\d{2})\s*R\s*(\d{2}(?:\.\d)?)/i;
const MEDIDA_CURTA = /(\d{3,4})\s*[\-R]\s*(\d{2})/i;

export function ncmEhPneu(ncm: string): boolean {
  return String(ncm || "").replace(/\D/g, "").startsWith("4011");
}

export function extrairMedidaPneu(xProd: string): string | null {
  const texto = String(xProd || "");
  const radial = texto.match(MEDIDA_RADIAL);
  if (radial) return `${radial[1]}/${radial[2]}R${radial[3]}`.toUpperCase();
  const curta = texto.match(MEDIDA_CURTA);
  if (curta) return `${curta[1]}${curta[0].includes("-") ? "-" : "R"}${curta[2]}`.toUpperCase();
  return null;
}

export function somenteDigitos(valor: string): string {
  return String(valor || "").replace(/\D/g, "");
}

export function parseNfeXml(xml: string): { nota: NfeNota; itens: NfeItemExtraido[] } {
  const raw = String(xml || "").trim();
  if (!raw) throw new NfeImportError("XML da NF-e está vazio.");

  const doc = new DOMParser().parseFromString(raw, "text/xml");
  const parseError = doc.querySelector("parsererror");
  if (parseError) throw new NfeImportError("XML da NF-e inválido.");

  const inf = primeiroPorNome(doc, "infNFe");
  if (!inf) throw new NfeImportError("Tag infNFe não encontrada no XML.");

  const idAttr = inf.getAttribute("Id") || inf.getAttribute("id") || "";
  const chave = extractNfeKey(idAttr.replace(/^NFe/i, ""));
  if (!/^\d{44}$/.test(chave)) {
    throw new NfeImportError("Chave de acesso da NF-e inválida (esperados 44 dígitos).");
  }

  const ide = primeiroPorNome(inf, "ide");
  const emit = primeiroPorNome(inf, "emit");
  const total = primeiroPorNome(inf, "ICMSTot") || primeiroPorNome(inf, "total");

  const nota: NfeNota = {
    chave_acesso: chave,
    numero_nota: textoFilho(ide, "nNF"),
    data_emissao: normalizarData(textoFilho(ide, "dhEmi") || textoFilho(ide, "dEmi")),
    fornecedor_nome: textoFilho(emit, "xNome"),
    fornecedor_cnpj: somenteDigitos(textoFilho(emit, "CNPJ") || textoFilho(emit, "CPF")),
    valor_total: numeroXml(textoFilho(total, "vNF")),
  };

  const dets = todosPorNome(inf, "det");
  if (dets.length === 0) throw new NfeImportError("A NF-e não contém itens (det).");

  const itens = dets.map((det, index) => {
    const prod = primeiroPorNome(det, "prod") ?? det;
    const descricao = textoFilho(prod, "xProd");
    const ncm = textoFilho(prod, "NCM");
    const is_pneu = ncmEhPneu(ncm);
    const nItemAttr = Number(det.getAttribute("nItem") || "");
    return {
      n_item: Number.isFinite(nItemAttr) && nItemAttr > 0 ? nItemAttr : index + 1,
      descricao,
      codigo_fornecedor: textoFilho(prod, "cProd"),
      ncm,
      unidade: textoFilho(prod, "uCom"),
      quantidade: numeroXml(textoFilho(prod, "qCom")),
      valor_unitario: numeroXml(textoFilho(prod, "vUnCom")),
      is_pneu,
      medida_extraida: is_pneu ? extrairMedidaPneu(descricao) : null,
    } satisfies NfeItemExtraido;
  });

  return { nota, itens };
}

function nomeLocal(el: Element): string {
  return (el.localName || el.tagName || "").replace(/^.*:/, "");
}

function todosPorNome(root: Document | Element, nome: string): Element[] {
  const base = root instanceof Document ? root.documentElement : root;
  if (!base) return [];
  const out: Element[] = [];
  const walk = (el: Element) => {
    if (nomeLocal(el) === nome) out.push(el);
    for (const child of Array.from(el.children)) walk(child);
  };
  if (root instanceof Document) walk(base);
  else for (const child of Array.from(root.children)) walk(child);
  return out;
}

function primeiroPorNome(root: Document | Element | null, nome: string): Element | null {
  if (!root) return null;
  return todosPorNome(root, nome)[0] ?? null;
}

function textoFilho(parent: Element | null, nome: string): string {
  if (!parent) return "";
  return (primeiroPorNome(parent, nome)?.textContent || "").trim();
}

function numeroXml(valor: string): number {
  const n = Number(String(valor || "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function normalizarData(valor: string): string {
  const raw = String(valor || "").trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return raw.slice(0, 10);
}
