import type { Implement, Vehicle } from "../../types";

type CrlvFields = Partial<Pick<
  Vehicle & Implement,
  "year" | "year_manufacture" | "chassi" | "renavam" | "color" | "crlv_fuel" | "load_capacity" | "crlv_category"
>>;

interface CrlvExtractedFieldsProps {
  extras: CrlvFields;
  onChange: (patch: CrlvFields) => void;
  showYear?: boolean;
}

const inputClass =
  "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

export function CrlvExtractedFields({ extras, onChange, showYear = false }: CrlvExtractedFieldsProps) {
  return (
    <div className="space-y-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
      <p className="text-xs font-semibold text-gray-500 uppercase">Dados extraídos do documento (editáveis)</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {showYear && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Ano modelo</label>
            <input
              type="number"
              className={inputClass}
              value={extras.year ?? ""}
              onChange={(e) => onChange({ year: e.target.value ? parseInt(e.target.value, 10) : undefined })}
            />
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Ano fabricação</label>
          <input
            type="number"
            className={inputClass}
            value={extras.year_manufacture ?? ""}
            onChange={(e) => onChange({ year_manufacture: e.target.value ? parseInt(e.target.value, 10) : undefined })}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Chassi</label>
          <input
            type="text"
            className={inputClass}
            value={extras.chassi || ""}
            onChange={(e) => onChange({ chassi: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">RENAVAM</label>
          <input
            type="text"
            className={inputClass}
            value={extras.renavam || ""}
            onChange={(e) => onChange({ renavam: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Cor</label>
          <input
            type="text"
            className={inputClass}
            value={extras.color || ""}
            onChange={(e) => onChange({ color: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Combustível</label>
          <input
            type="text"
            className={inputClass}
            value={extras.crlv_fuel || ""}
            onChange={(e) => onChange({ crlv_fuel: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Capacidade de carga</label>
          <input
            type="text"
            className={inputClass}
            value={extras.load_capacity || ""}
            onChange={(e) => onChange({ load_capacity: e.target.value })}
            placeholder="kg"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Categoria / espécie</label>
          <input
            type="text"
            className={inputClass}
            value={extras.crlv_category || ""}
            onChange={(e) => onChange({ crlv_category: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
