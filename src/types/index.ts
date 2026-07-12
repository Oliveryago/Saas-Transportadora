export type UserRole = "driver" | "manager" | "admin" | "superadmin";

// ─── Date Filter ─────────────────────────────────────────────────────────────
export type DateFilterMode = "month" | "range";
export interface DateFilter {
  mode: DateFilterMode;
  month?: number;   // 0–11 (Jan=0)
  year?: number;
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string;   // YYYY-MM-DD
}

export type ImplementType = "carreta" | "bitrem" | "rodotrem" | "graneleiro" | "sider" | "bau" | "tanque" | "basculante" | "prancha" | "cegonha";

export type FuelType = "diesel_s500" | "diesel_s10" | "gas_natural" | "arla_32" | "gasolina" | "alcool";

export type OilType = "motor" | "cambio" | "diferencial";

export type SupplierType = "posto" | "oficina" | "lavajato" | "estacionamento" | "outro";

export type VehicleWashType = "interna" | "externa" | "cavalo" | "toco" | "truck" | "carreta" | "bitrem" | "rodotrem" | "lubrificacao" | "carro_simples" | "carro_completa" | "moto" | "van" | "outro" | "carro";

export const IMPLEMENT_TYPE_LABELS: Record<ImplementType, string> = {
  carreta: "Carreta",
  bitrem: "Bitrem",
  rodotrem: "Rodotrem",
  graneleiro: "Graneleiro",
  sider: "Sider",
  bau: "Baú",
  tanque: "Tanque",
  basculante: "Basculante",
  prancha: "Prancha",
  cegonha: "Cegonha",
};

export const FUEL_TYPE_LABELS: Record<FuelType, string> = {
  diesel_s500: "Diesel S-500",
  diesel_s10: "Diesel S-10",
  gas_natural: "Gás Natural",
  arla_32: "Arla 32 Granel",
  gasolina: "Gasolina",
  alcool: "Álcool",
};

export const OIL_TYPE_LABELS: Record<OilType, string> = {
  motor: "Motor",
  cambio: "Câmbio",
  diferencial: "Diferencial",
};

export const SUPPLIER_TYPE_LABELS: Record<SupplierType, string> = {
  posto: "Posto de Combustível",
  oficina: "Oficina",
  lavajato: "Lavajato",
  estacionamento: "Estacionamento",
  outro: "Outro",
};

export const VEHICLE_WASH_TYPE_LABELS: Record<VehicleWashType, string> = {
  interna: "Lavagem Interna",
  externa: "Lavagem Externa",
  cavalo: "Lavagem Cavalo",
  toco: "Lavagem Toco",
  truck: "Lavagem Truck",
  carreta: "Lavagem Carreta",
  bitrem: "Lavagem Bitrem",
  rodotrem: "Lavagem Rodotrem",
  lubrificacao: "Lubrificação",
  carro_simples: "Lavagem Carro Simples",
  carro_completa: "Lavagem Carro Completa",
  moto: "Lavagem Moto",
  van: "Lavagem Van",
  outro: "Outro",
  carro: "Carro",
};

export interface Tenant {
  id: string;
  name: string;
  subscription_plan: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  tenant_id: string;
  role: UserRole;
  name: string;
  email: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: string;
  tenant_id: string;
  license_plate: string;
  model: string;
  year?: number;
  current_km: number;
  tank_capacity?: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Implement {
  id: string;
  tenant_id: string;
  type: ImplementType;
  license_plate: string;
  model: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Assignment {
  id: string;
  tenant_id: string;
  vehicle_id: string;
  implement_id: string;
  assigned_date: string;
  unassigned_date?: string;
  created_at: string;
  updated_at: string;
}

export interface FuelRecord {
  id: string;
  tenant_id: string;
  vehicle_id: string;
  driver_id: string;
  date?: string;
  km_digital: number;
  km_photo_url?: string;
  liters: number;
  liters_pump1?: number;
  liters_pump2?: number;
  value_brl?: number;
  arla_liters?: number;
  arla_price_per_liter?: number;
  fuel_station?: string;
  fuel_type?: FuelType;
  price_per_liter?: number;
  has_discount?: boolean;
  discount_value?: number;
  validations: {
    verified: boolean;
    issues: string[];
  };
  is_full_tank?: boolean;
  invoice_photo_url?: string;
  additional_item_description?: string;
  additional_item_value?: number;
  additional_items?: Array<{ description: string; value: number }>;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceRecord {
  id: string;
  tenant_id: string;
  vehicle_id?: string;
  implement_id?: string;
  type: string;
  description?: string;
  value_brl?: number;
  km?: number;
  date: string;
  parts: Array<{ name: string; cost?: number }>;
  invoice_photo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface OilChangeAlert {
  id: string;
  tenant_id: string;
  vehicle_id: string;
  oil_type?: OilType;
  alert_type: "km" | "date" | "both";
  km_interval?: number;
  days_interval?: number;
  last_change_km?: number;
  last_change_date?: string;
  alert_status: "active" | "inactive";
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  tenant_id: string;
  type: SupplierType;
  company_name: string;
  cnpj?: string;
  cep?: string;
  uf?: string;
  city?: string;
  street?: string;
  number?: string;
  phones: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ParkingRecord {
  id: string;
  tenant_id: string;
  vehicle_id: string;
  driver_id?: string;
  entry_date: string;
  exit_date?: string;
  value_brl?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface TireChange {
  id: string;
  tenant_id: string;
  vehicle_id: string;
  brand?: string;
  dimension?: string;
  quantity: number;
  km_at_change?: number;
  next_change_km?: number;
  value_brl?: number;
  has_discount: boolean;
  discount_value?: number;
  date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface WashingRecord {
  id: string;
  tenant_id: string;
  vehicle_id: string;
  driver_id?: string;
  supplier_id?: string;
  wash_place?: string;
  vehicle_type?: VehicleWashType | string;
  date: string;
  value_brl?: number;
  services?: Array<{ type: string; price?: number }>;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface TollRecord {
  id: string;
  tenant_id: string;
  vehicle_id: string;
  driver_id?: string;
  uf?: string;
  city?: string;
  value_brl?: number;
  trip?: string;
  date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface RotationRecord {
  id: string;
  tenant_id: string;
  vehicle_id: string;
  date: string;
  current_odometer?: number;
  next_rotation_km?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface InsuranceRecord {
  id: string;
  tenant_id: string;
  vehicle_id: string;
  broker?: string;
  insurance_type?: string;
  expiration_date?: string;
  insurer?: string;
  policy_number?: string;
  value_brl?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AccidentRecord {
  id: string;
  tenant_id: string;
  vehicle_id: string;
  driver_id?: string;
  description?: string;
  date: string;
  report_number?: string;
  uf?: string;
  city?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Driver {
  id: string;
  tenant_id: string;
  nome_completo: string;
  data_nascimento?: string;
  cpf: string;
  numero_cnh?: string;
  categoria_cnh?: string;
  validade_cnh?: string;
  endereco?: string; // fallback
  cep?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  phone?: string;
  photo_url?: string;
  cnh_url?: string;
  vehicle_id?: string;
  implement_id?: string;
  implement2_id?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompanySettings {
  id: string;
  tenant_id: string;
  company_name?: string;
  cnpj?: string;
  cep?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}
