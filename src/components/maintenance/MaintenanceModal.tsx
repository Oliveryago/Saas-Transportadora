import { useState, useEffect, useMemo, useRef } from "react";
import { FileUp, Loader2, X } from "lucide-react";
import { useMaintenanceRecords } from "../../hooks/useMaintenanceRecords";
import { useVehicles } from "../../hooks/useVehicles";
import { useImplements } from "../../hooks/useImplements";
import { useEstoque } from "../../hooks/useEstoque";
import { useNfeImportacao } from "../../hooks/useNfeImportacao";
import { useAuth } from "../../contexts/AuthContext";
import type { MaintenancePart, MaintenanceRecord } from "../../types";
import { getLocalDateString } from "../../lib/utils/date";
import { formatBRL } from "../../lib/utils/money";
import { supabase } from "../../lib/supabase";
import {
  PecasManutencaoFields,
  emptyPecaLinha,
  linhasFromParts,
  partsTotal,
  toMaintenanceParts,
  validatePecaLinhas,
  type PecaLinha,
} from "./PecasManutencaoFields";
import { PecasNfeManutencaoTable, validarLinhasNfeManutencao } from "./PecasNfeManutencaoTable";
import { ComposicaoConsumoPecas } from "./ComposicaoConsumoPecas";
import {
  aplicarLinhasNfeNaManutencao,
  listarPneusEmEstoque,
  type LinhaNfeManutencao,
} from "../../services/estoque/consumoManutencao";
import { consumirPeps, custoTotalPartes, saldosPorItem } from "../../services/estoque/peps";
import type { PneuIndividual } from "../../types/pneu";
import type { NfeNota } from "../../types/nfe";

interface MaintenanceModalProps {
    open: boolean;
    onClose: () => void;
    editingRecord?: MaintenanceRecord | null;
}

function MaintenanceModal({ open, onClose, editingRecord }: MaintenanceModalProps) {
    const { tenant } = useAuth();
    const { addRecord, updateRecord } = useMaintenanceRecords();
    const { vehicles } = useVehicles();
    const { implements: implements_ } = useImplements();
    const { itens, itensAtivos, criarItem, recarregar } = useEstoque();
    const { preVisualizarArquivo, loading: lendoXml } = useNfeImportacao();
    const fileRef = useRef<HTMLInputElement>(null);

    const [type, setType] = useState("");
    const [description, setDescription] = useState("");
    const [km, setKm] = useState(0);
    const [date, setDate] = useState(getLocalDateString());
    const [vehicleId, setVehicleId] = useState("");
    const [implementId, setImplementId] = useState("");
    const [lines, setLines] = useState<PecaLinha[]>([emptyPecaLinha()]);
    const [alreadyDeducted, setAlreadyDeducted] = useState<Map<string, number>>(new Map());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [nota, setNota] = useState<NfeNota | null>(null);
    const [notaJaNoEstoque, setNotaJaNoEstoque] = useState(false);
    const [linhasNfe, setLinhasNfe] = useState<LinhaNfeManutencao[]>([]);
    const [saldos, setSaldos] = useState<Map<string, number>>(new Map());
    const [pneusPorItem, setPneusPorItem] = useState<Map<string, PneuIndividual[]>>(new Map());

    useEffect(() => {
        if (editingRecord) {
            setType(editingRecord.type);
            setDescription(editingRecord.description || "");
            setKm(editingRecord.km || 0);
            setDate(editingRecord.date);
            setVehicleId(editingRecord.vehicle_id || "");
            setImplementId(editingRecord.implement_id || "");
            setLines(linhasFromParts(editingRecord.parts));
        } else {
            setType("");
            setDescription("");
            setKm(0);
            setDate(getLocalDateString());
            setVehicleId("");
            setImplementId("");
            setLines([emptyPecaLinha()]);
        }
        setAlreadyDeducted(new Map());
        setNota(null);
        setNotaJaNoEstoque(false);
        setLinhasNfe([]);
        setError(null);
    }, [editingRecord, open]);

    useEffect(() => {
        if (!open || !editingRecord?.id) return;
        let cancelled = false;
        supabase
            .from("manutencao_itens")
            .select("item_id, quantidade")
            .eq("maintenance_id", editingRecord.id)
            .then(({ data }) => {
                if (cancelled) return;
                const deducted = new Map<string, number>();
                for (const row of data || []) {
                    deducted.set(row.item_id, (deducted.get(row.item_id) || 0) + Number(row.quantidade || 0));
                }
                setAlreadyDeducted(deducted);
            });
        return () => { cancelled = true; };
    }, [editingRecord?.id, open]);

    useEffect(() => {
        if (!open || !tenant?.id) return;
        let cancelled = false;
        saldosPorItem(tenant.id).then((mapa) => {
            if (!cancelled) setSaldos(mapa);
        }).catch(() => {
            if (!cancelled) setSaldos(new Map());
        });
        return () => { cancelled = true; };
    }, [open, tenant?.id, itens]);

    const pecasItens = useMemo(() => {
        const selecionados = new Set(lines.filter((line) => line.origin === "estoque" && line.itemId).map((line) => line.itemId));
        for (const linha of linhasNfe) {
            if (linha.item_id) selecionados.add(linha.item_id);
        }
        const byId = new Map(itensAtivos.map((item) => [item.id, item]));
        for (const item of itens) {
            if (selecionados.has(item.id) && !byId.has(item.id)) byId.set(item.id, item);
        }
        return Array.from(byId.values());
    }, [itens, itensAtivos, lines, linhasNfe]);

    const totalNfe = linhasNfe.reduce((sum, linha) => {
        return sum + linha.qty_compra * linha.valor_unitario;
    }, 0);
    const totalManutencao = partsTotal(lines.filter((line) => !nota || line.origin === "avulsa")) + totalNfe;

    async function carregarPneusDosItens(itemIds: string[]) {
        if (!tenant?.id) return;
        const unicos = [...new Set(itemIds.filter(Boolean))];
        const mapa = new Map<string, PneuIndividual[]>();
        await Promise.all(unicos.map(async (itemId) => {
            const lista = await listarPneusEmEstoque(tenant.id, itemId);
            mapa.set(itemId, lista);
        }));
        setPneusPorItem(mapa);
    }

    async function aoEscolherXml(file?: File) {
        if (!file || !tenant?.id) return;
        setError(null);
        try {
            const preview = await preVisualizarArquivo(file);
            setNota(preview.nota);
            setNotaJaNoEstoque(preview.ja_importada);
            if (preview.nota.data_emissao) setDate(preview.nota.data_emissao);
            setDescription((atual) =>
                atual?.trim()
                    ? atual
                    : `NF ${preview.nota.numero_nota || "—"} · ${preview.nota.fornecedor_nome || "oficina"}`
            );
            const linhas: LinhaNfeManutencao[] = preview.itens.map((item) => {
                const total = item.is_pneu ? Math.floor(Number(item.quantidade)) : Number(item.quantidade);
                return {
                    n_item: item.n_item,
                    descricao: item.descricao,
                    codigo_fornecedor: item.codigo_fornecedor,
                    ncm: item.ncm,
                    quantidade_total: total,
                    valor_unitario: Number(item.valor_unitario) || 0,
                    is_pneu: item.is_pneu,
                    medida_extraida: item.medida_extraida,
                    item_id: item.item_id,
                    item_nome: item.item_nome,
                    qty_estoque: 0,
                    qty_compra: total,
                    marcacoes_fogo: item.is_pneu ? Array.from({ length: total }, () => "") : [],
                    pneus_estoque_ids: [],
                };
            });
            setLinhasNfe(linhas);
            setLines([emptyPecaLinha()]);
            await carregarPneusDosItens(linhas.map((l) => l.item_id).filter((id): id is string => Boolean(id)));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erro ao ler o XML.");
        }
    }

    async function handleCriarItemCatalogo(nome: string, linhaIndex: number) {
        if (!tenant?.id) return;
        const linha = linhasNfe[linhaIndex];
        const criado = await criarItem({
            tenant_id: tenant.id,
            nome,
            categoria: linha?.is_pneu ? "pneu" : "peca_motor",
            unidade_medida: "unidade",
            estoque_minimo: 0,
            rastreavel_individualmente: Boolean(linha?.is_pneu),
            ncm: linha?.ncm || null,
            medida: linha?.medida_extraida || null,
        });
        setLinhasNfe((prev) => prev.map((item, i) => (
            i === linhaIndex
                ? { ...item, item_id: criado.id, item_nome: criado.nome }
                : item
        )));
        await recarregar();
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        const linesToSave = nota ? lines.filter((line) => line.origin === "avulsa") : lines;
        const validationError = validatePecaLinhas(linesToSave, pecasItens, alreadyDeducted);
        if (validationError) {
            setError(validationError);
            return;
        }
        if (nota && linhasNfe.length) {
            const nfeError = validarLinhasNfeManutencao(linhasNfe, saldos, notaJaNoEstoque);
            if (nfeError) {
                setError(nfeError);
                return;
            }
        }

        setLoading(true);
        const remainingDeducted = new Map(alreadyDeducted);

        try {
            const avulsas = toMaintenanceParts(linesToSave);
            const data = {
                type,
                description: description || undefined,
                value_brl: totalManutencao,
                km: km || undefined,
                date,
                vehicle_id: vehicleId || undefined,
                implement_id: implementId || undefined,
                parts: avulsas,
            };

            let savedId: string | undefined;
            if (editingRecord) {
                const updated = await updateRecord(editingRecord.id, data);
                savedId = updated?.id ?? editingRecord.id;
            } else {
                const created = await addRecord(data as Omit<MaintenanceRecord, "id" | "created_at" | "updated_at">);
                savedId = created?.id;
            }
            if (!savedId) throw new Error("Não foi possível salvar a manutenção.");

            const partsFinais: MaintenancePart[] = [...avulsas];

            if (nota && linhasNfe.length && tenant?.id && !editingRecord) {
                const nfeParts = await aplicarLinhasNfeNaManutencao({
                    tenantId: tenant.id,
                    maintenanceId: savedId,
                    vehicleId: vehicleId || undefined,
                    nota,
                    linhas: linhasNfe,
                });
                partsFinais.push(...nfeParts);
            }

            if (!nota && tenant?.id) {
                const estoqueParts: MaintenancePart[] = [];
                for (const part of toMaintenanceParts(lines)) {
                    if (part.origin !== "estoque" || !part.item_id) continue;
                    const qty = Number(part.quantity) || 0;
                    const already = remainingDeducted.get(part.item_id) || 0;
                    const delta = qty - already;
                    if (delta > 0) {
                        const lotes = await consumirPeps({
                            tenantId: tenant.id,
                            itemId: part.item_id,
                            quantidade: delta,
                            maintenanceId: savedId,
                            vehicleId: vehicleId || undefined,
                            observacao: "Baixa PEPS via manutencao",
                            origem: "estoque_anterior",
                        });
                        part.lotes = lotes;
                        const custo = custoTotalPartes(lotes);
                        part.cost = qty > 0 ? Math.round((custo / qty) * 100) / 100 : part.cost;
                    }
                    remainingDeducted.set(part.item_id, Math.max(0, already - qty));
                    estoqueParts.push(part);
                }
                if (estoqueParts.length) {
                    const semEstoque = toMaintenanceParts(lines).filter((p) => p.origin !== "estoque");
                    partsFinais.length = 0;
                    partsFinais.push(...semEstoque, ...estoqueParts);
                }
            }

            const valorFinal = partsFinais.reduce((sum, p) => {
                if (p.lotes?.length) return sum + custoTotalPartes(p.lotes);
                return sum + (Number(p.quantity) || 0) * (Number(p.cost) || 0);
            }, 0);

            await updateRecord(savedId, { parts: partsFinais, value_brl: valorFinal });
            await recarregar();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erro ao salvar");
            if (!editingRecord) {
                // manutenção pode ter sido criada; o usuário corrige e tenta de novo
            }
        } finally {
            setLoading(false);
        }
    }

    if (!open) return null;

    const pecasComLotes = (editingRecord?.parts || []).filter((p) => p.lotes?.length);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl flex flex-col max-h-[90vh]">

                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 flex-shrink-0">
                    <h3 className="text-lg font-bold text-gray-900">
                        {editingRecord ? "Editar Manutenção" : "Nova Manutenção"}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
                    {!editingRecord && (
                        <div>
                            <input
                                ref={fileRef}
                                type="file"
                                accept=".xml,text/xml,application/xml"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    e.target.value = "";
                                    void aoEscolherXml(file);
                                }}
                            />
                            <button
                                type="button"
                                disabled={lendoXml}
                                onClick={() => fileRef.current?.click()}
                                className="w-full border-2 border-dashed border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-xl px-4 py-6 text-center transition disabled:opacity-60"
                            >
                                {lendoXml ? (
                                    <Loader2 size={24} className="mx-auto text-blue-600 animate-spin" />
                                ) : (
                                    <FileUp size={24} className="mx-auto text-blue-600" />
                                )}
                                <p className="mt-2 text-sm font-medium text-blue-800">Importar XML da nota</p>
                                <p className="text-xs text-blue-600 mt-1">NF-e de peças da oficina (modelo 55)</p>
                            </button>
                        </div>
                    )}

                    {nota && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs bg-slate-50 rounded-lg p-3">
                            <div>
                                <p className="text-slate-400">Nota</p>
                                <p className="text-slate-800 font-medium">{nota.numero_nota || "—"}</p>
                            </div>
                            <div>
                                <p className="text-slate-400">Emissão</p>
                                <p className="text-slate-800">{nota.data_emissao || "—"}</p>
                            </div>
                            <div className="col-span-2">
                                <p className="text-slate-400">Fornecedor / oficina</p>
                                <p className="text-slate-800">{nota.fornecedor_nome || "—"} · {nota.fornecedor_cnpj || ""}</p>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                <option value="">Selecione</option>
                                <option value="preventiva">Preventiva</option>
                                <option value="corretiva">Corretiva</option>
                                <option value="pneus">Pneus</option>
                                <option value="eletrica">Elétrica</option>
                                <option value="freios">Freios</option>
                                <option value="suspensao">Suspensão</option>
                                <option value="motor">Motor</option>
                                <option value="cambio">Câmbio</option>
                                <option value="outro">Outro</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Data *</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Veículo</label>
                        <select
                            value={vehicleId}
                            onChange={(e) => setVehicleId(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Nenhum</option>
                            {vehicles.map((v) => (
                                <option key={v.id} value={v.id}>{v.license_plate} - {v.model}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Implemento</label>
                        <select
                            value={implementId}
                            onChange={(e) => setImplementId(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Nenhum</option>
                            {implements_.map((i) => (
                                <option key={i.id} value={i.id}>{i.license_plate} - {i.model}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={2}
                            placeholder="Descreva a manutenção realizada..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">KM</label>
                        <input
                            type="number"
                            value={km}
                            onChange={(e) => setKm(parseInt(e.target.value))}
                            min="0"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {linhasNfe.length > 0 && nota && (
                        <PecasNfeManutencaoTable
                            linhas={linhasNfe}
                            onChange={async (next) => {
                                setLinhasNfe(next);
                                const ids = next.map((l) => l.item_id).filter((id): id is string => Boolean(id));
                                const faltando = ids.filter((id) => !pneusPorItem.has(id));
                                if (faltando.length) await carregarPneusDosItens([...pneusPorItem.keys(), ...faltando]);
                            }}
                            itens={pecasItens}
                            saldos={saldos}
                            pneusPorItem={pneusPorItem}
                            onCriarItem={handleCriarItemCatalogo}
                            notaJaNoEstoque={notaJaNoEstoque}
                        />
                    )}

                    {pecasComLotes.length > 0 && editingRecord && (
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-700">Composição já lançada</p>
                            {pecasComLotes.map((p, i) => (
                                <div key={`${p.item_id}-${i}`} className="border border-gray-100 rounded-lg p-2">
                                    <p className="text-sm font-medium text-gray-800">{p.name}</p>
                                    <ComposicaoConsumoPecas lotes={p.lotes} />
                                </div>
                            ))}
                        </div>
                    )}

                    {linhasNfe.length > 0 && nota && (
                        <p className="text-sm font-medium text-gray-700">Peças avulsas / mão de obra (opcional)</p>
                    )}
                    <PecasManutencaoFields
                        lines={lines}
                        onChange={setLines}
                        itens={pecasItens}
                        alreadyDeducted={alreadyDeducted}
                    />

                    </div>

                    <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0 bg-white space-y-3">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{error}</div>
                        )}
                        <div className="flex items-center justify-between gap-4 bg-orange-50 border border-orange-100 rounded-xl px-4 py-3">
                            <div>
                                <p className="text-xs font-medium text-orange-800 uppercase tracking-wide">Valor total da manutenção</p>
                                <p className="text-[11px] text-orange-700">
                                    {nota
                                        ? "Compra desta nota (valor da NF-e) + peças avulsas. O custo do estoque entra na composição por lote."
                                        : "Soma automática das peças (estoque + avulsas)"}
                                </p>
                            </div>
                            <p className="text-2xl font-bold text-orange-700">{formatBRL(totalManutencao)}</p>
                        </div>
                        <div className="flex gap-3">
                            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                                Cancelar
                            </button>
                            <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                                {loading ? "Salvando..." : "Salvar"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default MaintenanceModal;
