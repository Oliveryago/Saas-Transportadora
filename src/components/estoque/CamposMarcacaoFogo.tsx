interface Props {
  quantidade: number;
  marcacoes: string[];
  onChange: (index: number, valor: string) => void;
}

export function CamposMarcacaoFogo({ quantidade, marcacoes, onChange }: Props) {
  const qtd = Math.max(0, Math.floor(Number(quantidade) || 0));
  if (qtd < 1) return null;

  return (
    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
      {Array.from({ length: qtd }, (_, i) => (
        <div key={i}>
          <label className="text-[11px] text-orange-800">Marcação de fogo {i + 1}</label>
          <input
            value={marcacoes[i] ?? ""}
            onChange={(e) => onChange(i, e.target.value.toUpperCase())}
            placeholder={`PNEU-${i + 1}`}
            className="w-full border border-orange-200 rounded-md px-2 py-1.5 text-sm bg-white font-mono"
          />
        </div>
      ))}
    </div>
  );
}

export function marcacoesCompletas(isPneu: boolean, quantidade: number, marcacoes: string[]): boolean {
  if (!isPneu) return true;
  const qtd = Math.floor(Number(quantidade) || 0);
  if (qtd < 1) return false;
  return Array.from({ length: qtd }).every((_, i) => Boolean((marcacoes[i] || "").trim()));
}
