import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Plus, QrCode, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useEstoque } from '../../hooks/useEstoque';
import { usePneusIndividuais } from '../../hooks/usePneusIndividuais';
import type { CategoriaItem, ItemEstoque, UnidadeMedida } from '../../types/estoque';
import { extractNfeKey, itemEhRastreavel, nomeParecePneu } from '../../types/pneu';
import { QRCodeScanner } from '../shared/QRCodeScanner';
import { getLocalDateString } from '../../lib/utils/date';

interface Props {
  itens: ItemEstoque[];
  onClose: () => void;
  onSaved: () => void;
}

const CATEGORIAS: { value: CategoriaItem; label: string }[] = [
  { value: 'oleo', label: 'Óleo' },
  { value: 'pneu', label: 'Pneu' },
  { value: 'filtro', label: 'Filtro' },
  { value: 'eletrica', label: 'Elétrica' },
  { value: 'peca_motor', label: 'Peça de Motor' },
  { value: 'outro', label: 'Outro' },
];

const UNIDADES: { value: UnidadeMedida; label: string }[] = [
  { value: 'unidade', label: 'Unidade' },
  { value: 'litro', label: 'Litro' },
  { value: 'kit', label: 'Kit' },
];

export function NovaEntradaModal({ itens, onClose, onSaved }: Props) {
  const { tenant } = useAuth();
  const { registrarEntrada, criarItem } = useEstoque();
  const { criarLoteEntrada } = usePneusIndividuais();

  // Combobox state
  const [busca, setBusca] = useState('');
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState<ItemEstoque | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Campos da entrada
  const [quantidade, setQuantidade] = useState('');
  const [valorUnitario, setValorUnitario] = useState('');

  // Campos para novo item
  const [criandoNovo, setCriandoNovo] = useState(false);
  const [novaCategoria, setNovaCategoria] = useState<CategoriaItem>('outro');
  const [novaUnidade, setNovaUnidade] = useState<UnidadeMedida>('unidade');
  const [estoqueMinimo, setEstoqueMinimo] = useState('1');
  const [rastreavelNovo, setRastreavelNovo] = useState(false);
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [medida, setMedida] = useState('');
  const [notaFiscal, setNotaFiscal] = useState('');
  const [fornecedor, setFornecedor] = useState('');
  const [dataCompra, setDataCompra] = useState(getLocalDateString());
  const [lerQr, setLerQr] = useState(false);

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setDropdownAberto(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const itensFiltrados = itens.filter((item) =>
    item.nome.toLowerCase().includes(busca.toLowerCase())
  );

  const nomeLimpo = busca.trim();
  const parecePneu = nomeParecePneu(nomeLimpo);
  const itemRastreavel = itemSelecionado
    ? itemEhRastreavel(itemSelecionado)
    : rastreavelNovo || novaCategoria === 'pneu' || parecePneu;

  function selecionarItem(item: ItemEstoque) {
    setItemSelecionado(item);
    setBusca(item.nome);
    setCriandoNovo(false);
    setDropdownAberto(false);
  }

  function iniciarCriacaoNovo() {
    setItemSelecionado(null);
    setCriandoNovo(true);
    setDropdownAberto(false);
    if (nomeParecePneu(nomeLimpo)) {
      setNovaCategoria('pneu');
      setRastreavelNovo(true);
    }
  }

  function limparSelecao() {
    setItemSelecionado(null);
    setBusca('');
    setCriandoNovo(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  async function salvar() {
    setErro(null);

    if (!nomeLimpo) {
      setErro('Digite o nome do item.');
      return;
    }
    if (!quantidade || !valorUnitario) {
      setErro('Preencha quantidade e valor unitário.');
      return;
    }

    setSalvando(true);
    try {
      let idItem = itemSelecionado?.id;

      const gerarIndividuais = itemSelecionado
        ? itemEhRastreavel(itemSelecionado)
        : rastreavelNovo || novaCategoria === 'pneu' || nomeParecePneu(nomeLimpo);
      const categoriaFinal: CategoriaItem =
        novaCategoria === 'pneu' || nomeParecePneu(nomeLimpo) ? 'pneu' : novaCategoria;

      if (!idItem) {
        // Criar novo item
        if (!tenant?.id) throw new Error('Tenant não identificado.');
        const novoItem = await criarItem({
          nome: nomeLimpo,
          categoria: categoriaFinal,
          unidade_medida: novaUnidade,
          estoque_minimo: Number(estoqueMinimo) || 1,
          tenant_id: tenant.id,
          rastreavel_individualmente: gerarIndividuais,
        });
        idItem = novoItem.id;
      }

      await registrarEntrada({
        itemId: idItem,
        quantidade: Number(quantidade),
        valorUnitario: Number(valorUnitario),
      });

      if (gerarIndividuais) {
        const qtd = Math.floor(Number(quantidade));
        if (qtd < 1) throw new Error('Para pneus rastreáveis, informe uma quantidade inteira.');
        try {
          await criarLoteEntrada({
            itemId: idItem,
            quantidade: qtd,
            valorUnitario: Number(valorUnitario),
            marca,
            modelo,
            medida,
            notaFiscal,
            fornecedor,
            dataCompra,
          });
        } catch (pneuErr) {
          console.error(pneuErr);
          alert('A entrada de estoque foi salva, mas os códigos de marcação de fogo não foram gerados. Rode o SQL de pneus individuais no Supabase e tente de novo só a marcação, se necessário.');
        }
      }

      onSaved();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar entrada.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-5 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-semibold text-slate-900">Nova entrada de estoque</h2>
          <button onClick={onClose} aria-label="Fechar">
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Campo de item — combobox */}
          <div>
            <label className="text-xs font-medium text-slate-500">Item</label>
            <div className="relative mt-1">
              <div className="flex items-center border border-slate-200 rounded-md px-3 py-2 gap-2 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-200 transition">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Digite ou selecione uma peça..."
                  value={busca}
                  onChange={(e) => {
                    const next = e.target.value;
                    setBusca(next);
                    setItemSelecionado(null);
                    setCriandoNovo(false);
                    setDropdownAberto(true);
                    if (nomeParecePneu(next)) {
                      setNovaCategoria('pneu');
                      setRastreavelNovo(true);
                    }
                  }}
                  onFocus={() => setDropdownAberto(true)}
                  className="flex-1 text-sm bg-transparent outline-none text-slate-800 placeholder:text-slate-400"
                />
                {(itemSelecionado || criandoNovo || busca) && (
                  <button onClick={limparSelecao} className="text-slate-400 hover:text-slate-600">
                    <X size={14} />
                  </button>
                )}
                <ChevronDown
                  size={15}
                  className={`text-slate-400 transition-transform ${dropdownAberto ? 'rotate-180' : ''}`}
                />
              </div>

              {/* Badge de status */}
              {itemSelecionado && (
                <p className="flex items-center gap-1 text-[11px] text-emerald-600 mt-1">
                  <Check size={11} /> Item já cadastrado — entrada será registrada
                </p>
              )}
              {criandoNovo && !itemSelecionado && (
                <p className="flex items-center gap-1 text-[11px] text-blue-600 mt-1">
                  <Plus size={11} /> Novo item — será cadastrado automaticamente
                </p>
              )}

              {/* Dropdown */}
              {dropdownAberto && (
                <div
                  ref={dropdownRef}
                  className="absolute z-10 top-full mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                >
                  {itensFiltrados.length > 0 && (
                    <>
                      <p className="px-3 pt-2 pb-1 text-[10px] text-slate-400 uppercase tracking-wide">
                        Itens cadastrados
                      </p>
                      {itensFiltrados.map((item) => (
                        <button
                          key={item.id}
                          onMouseDown={() => selecionarItem(item)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between group"
                        >
                          <span className="text-slate-800">{item.nome}</span>
                          <span className="text-[11px] text-slate-400 group-hover:text-blue-500">
                            {item.categoria}
                          </span>
                        </button>
                      ))}
                    </>
                  )}

                  {nomeLimpo && (
                    <button
                      onMouseDown={iniciarCriacaoNovo}
                      className="w-full text-left px-3 py-2.5 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2 border-t border-slate-100"
                    >
                      <Plus size={14} />
                      Criar "<span className="font-medium">{nomeLimpo}</span>"
                    </button>
                  )}

                  {!nomeLimpo && itensFiltrados.length === 0 && (
                    <p className="px-3 py-3 text-sm text-slate-400 text-center">
                      Digite para buscar ou criar um item
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Campos extras ao criar novo item */}
          {criandoNovo && !itemSelecionado && (
            <div className="bg-blue-50 rounded-lg p-3 space-y-3 border border-blue-100">
              <p className="text-xs font-medium text-blue-700">Dados do novo item</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500">Categoria</label>
                  <select
                    value={novaCategoria}
                    onChange={(e) => {
                      const next = e.target.value as CategoriaItem;
                      setNovaCategoria(next);
                      setRastreavelNovo(next === 'pneu');
                    }}
                    className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm mt-1 bg-white"
                  >
                    {CATEGORIAS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Unidade</label>
                  <select
                    value={novaUnidade}
                    onChange={(e) => setNovaUnidade(e.target.value as UnidadeMedida)}
                    className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm mt-1 bg-white"
                  >
                    {UNIDADES.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500">Estoque mínimo</label>
                <input
                  type="number"
                  min="0"
                  value={estoqueMinimo}
                  onChange={(e) => setEstoqueMinimo(e.target.value)}
                  className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm mt-1"
                />
              </div>
              <label className="flex items-start gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={rastreavelNovo}
                  onChange={(e) => setRastreavelNovo(e.target.checked)}
                />
                <span>Rastreável individualmente (gera um código de marcação de fogo por unidade)</span>
              </label>
            </div>
          )}

          {/* Quantidade */}
          <div>
            <label className="text-xs font-medium text-slate-500">Quantidade</label>
            <input
              type="number"
              min="0"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm mt-1 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
            />
          </div>

          {/* Valor unitário */}
          <div>
            <label className="text-xs font-medium text-slate-500">Valor unitário pago (R$)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={valorUnitario}
              onChange={(e) => setValorUnitario(e.target.value)}
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm mt-1 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
            />
          </div>

          {itemRastreavel && (
            <div className="space-y-3 border border-orange-100 bg-orange-50 rounded-lg p-3">
              <p className="text-xs font-medium text-orange-800">Dados da nota / pneu (marcação de fogo)</p>
              <div>
                <label className="text-xs text-slate-500">Nota fiscal / chave de acesso</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    value={notaFiscal}
                    onChange={(e) => setNotaFiscal(e.target.value)}
                    placeholder="Chave da NF-e ou número da nota"
                    className="flex-1 border border-slate-200 rounded-md px-3 py-2 text-sm bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setLerQr(true)}
                    className="px-3 py-2 border border-slate-200 rounded-md text-slate-600 hover:bg-white"
                    title="Ler QR da nota"
                  >
                    <QrCode size={16} />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500">Fornecedor</label>
                  <input value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm mt-1 bg-white" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Data da compra</label>
                  <input type="date" value={dataCompra} onChange={(e) => setDataCompra(e.target.value)} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm mt-1 bg-white" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-500">Marca</label>
                  <input value={marca} onChange={(e) => setMarca(e.target.value)} className="w-full border border-slate-200 rounded-md px-2 py-2 text-sm mt-1 bg-white" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Modelo</label>
                  <input value={modelo} onChange={(e) => setModelo(e.target.value)} className="w-full border border-slate-200 rounded-md px-2 py-2 text-sm mt-1 bg-white" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Medida</label>
                  <input value={medida} onChange={(e) => setMedida(e.target.value)} placeholder="275/80R22.5" className="w-full border border-slate-200 rounded-md px-2 py-2 text-sm mt-1 bg-white" />
                </div>
              </div>
              <p className="text-[11px] text-orange-700">
                Cada unidade gera um código (PNEU-ANO-00001) com status “aguardando marcação”.
              </p>
            </div>
          )}

          {erro && <p className="text-xs text-red-500">{erro}</p>}
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="text-sm px-4 py-2 rounded-md border border-slate-200 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            onClick={salvar}
            disabled={salvando || !nomeLimpo}
            className="text-sm px-4 py-2 rounded-md bg-blue-600 text-white disabled:opacity-50 hover:bg-blue-700 transition"
          >
            {salvando ? 'Salvando...' : 'Salvar entrada'}
          </button>
        </div>
      </div>
      {lerQr && (
        <QRCodeScanner
          title="QR da nota fiscal"
          placeholder="Cole a chave de 44 dígitos"
          onScan={(value) => {
            setNotaFiscal(extractNfeKey(value));
            setLerQr(false);
          }}
          onClose={() => setLerQr(false)}
        />
      )}
    </div>
  );
}
