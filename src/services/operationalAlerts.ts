import { supabase } from "../lib/supabase";
import { OIL_TYPE_LABELS, type OilType } from "../types";

export type OperationalAlertType = "info" | "warning" | "error";
export type OperationalAlertCategory = "oil" | "stock" | "insurance" | "cnh";

export interface OperationalAlert {
  id: string;
  title: string;
  message: string;
  date: string;
  type: OperationalAlertType;
  path: string;
  category: OperationalAlertCategory;
  urgency: number;
}

const UNIT_LABEL: Record<string, string> = {
  litro: "L",
  unidade: "un",
  kit: "kit",
};

function daysFromToday(dateStr: string): number {
  const iso = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
  const target = new Date(`${iso ? iso[1] : dateStr}T12:00:00`);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.ceil((target.getTime() - today) / 86400000);
}

export async function fetchOperationalAlerts(tenantId: string): Promise<OperationalAlert[]> {
  const nowIso = new Date().toISOString();
  const items: OperationalAlert[] = [];

  const [vehiclesRes, oilRes, fuelRes, insuranceRes, driversRes, stockRes] = await Promise.all([
    supabase
      .from("vehicles")
      .select("id, license_plate, model, current_km")
      .eq("tenant_id", tenantId),
    supabase
      .from("oil_change_alerts")
      .select("id, vehicle_id, oil_type, km_interval, days_interval, last_change_km, last_change_date, alert_status")
      .eq("tenant_id", tenantId)
      .eq("alert_status", "active"),
    supabase
      .from("fuel_records")
      .select("vehicle_id, km_digital, created_at")
      .eq("tenant_id", tenantId)
      .not("km_digital", "is", null)
      .order("created_at", { ascending: false })
      .limit(2000),
    supabase
      .from("insurance_records")
      .select("id, vehicle_id, expiration_date, insurer")
      .eq("tenant_id", tenantId),
    supabase
      .from("drivers")
      .select("id, nome_completo, active, validade_cnh")
      .eq("tenant_id", tenantId),
    supabase
      .from("itens_estoque")
      .select("id, nome, estoque_atual, estoque_minimo, unidade_medida")
      .eq("tenant_id", tenantId)
      .eq("ativo", true),
  ]);

  const vehicles = vehiclesRes.data ?? [];
  const vehicleMap = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));

  const kmByVehicle = new Map<string, number>();
  for (const vehicle of vehicles) {
    if (vehicle.current_km != null) kmByVehicle.set(vehicle.id, Number(vehicle.current_km));
  }
  for (const record of fuelRes.data ?? []) {
    const km = Number(record.km_digital);
    if (!Number.isFinite(km)) continue;
    const previous = kmByVehicle.get(record.vehicle_id);
    if (previous == null || km > previous) kmByVehicle.set(record.vehicle_id, km);
  }

  for (const alert of oilRes.data ?? []) {
    const vehicle = vehicleMap.get(alert.vehicle_id);
    if (!vehicle) continue;

    const plate = vehicle.license_plate || "Veículo";
    const oilLabel = OIL_TYPE_LABELS[alert.oil_type as OilType] || alert.oil_type || "Óleo";

    if (alert.km_interval != null && alert.last_change_km != null) {
      const currentKm = kmByVehicle.get(alert.vehicle_id) ?? 0;
      const remaining = Number(alert.last_change_km) + Number(alert.km_interval) - currentKm;

      if (remaining <= 0) {
        items.push({
          id: `oil-km-${alert.id}`,
          title: "Troca de óleo vencida",
          message: `${plate} — ${oilLabel}: ${Math.abs(remaining).toLocaleString("pt-BR")} km além do limite`,
          date: nowIso,
          type: "error",
          path: "/oil-change",
          category: "oil",
          urgency: 0,
        });
      } else if (remaining <= 1000) {
        items.push({
          id: `oil-km-${alert.id}`,
          title: "Troca de óleo próxima",
          message: `${plate} — ${oilLabel}: faltam ${remaining.toLocaleString("pt-BR")} km`,
          date: nowIso,
          type: "warning",
          path: "/oil-change",
          category: "oil",
          urgency: 1,
        });
      }
    }

    if (alert.days_interval != null && alert.last_change_date) {
      const lastDate = new Date(alert.last_change_date);
      const nextDate = new Date(lastDate.getTime() + Number(alert.days_interval) * 86400000);
      const daysLeft = Math.ceil((nextDate.getTime() - Date.now()) / 86400000);

      if (daysLeft < 0) {
        items.push({
          id: `oil-date-${alert.id}`,
          title: "Troca de óleo vencida",
          message: `${plate} — ${oilLabel}: vencida há ${Math.abs(daysLeft)} dia(s)`,
          date: nowIso,
          type: "error",
          path: "/oil-change",
          category: "oil",
          urgency: 0,
        });
      } else if (daysLeft === 0) {
        items.push({
          id: `oil-date-${alert.id}`,
          title: "Troca de óleo vence hoje",
          message: `${plate} — ${oilLabel}: vence hoje`,
          date: nowIso,
          type: "error",
          path: "/oil-change",
          category: "oil",
          urgency: 0,
        });
      } else if (daysLeft <= 30) {
        items.push({
          id: `oil-date-${alert.id}`,
          title: "Troca de óleo próxima",
          message: `${plate} — ${oilLabel}: vence em ${daysLeft} dia(s)`,
          date: nowIso,
          type: "warning",
          path: "/oil-change",
          category: "oil",
          urgency: 1,
        });
      }
    }
  }

  for (const insurance of insuranceRes.data ?? []) {
    if (!insurance.expiration_date) continue;
    const vehicle = vehicleMap.get(insurance.vehicle_id);
    if (!vehicle) continue;

    const daysLeft = daysFromToday(insurance.expiration_date);
    const insurer = insurance.insurer ? ` (${insurance.insurer})` : "";

    if (daysLeft < 0) {
      items.push({
        id: `insurance-${insurance.id}`,
        title: "Seguro vencido",
        message: `${vehicle.license_plate}${insurer}: vencido há ${Math.abs(daysLeft)} dia(s)`,
        date: insurance.expiration_date,
        type: "error",
        path: "/insurance",
        category: "insurance",
        urgency: 0,
      });
    } else if (daysLeft === 0) {
      items.push({
        id: `insurance-${insurance.id}`,
        title: "Seguro vence hoje",
        message: `${vehicle.license_plate}${insurer}: vence hoje`,
        date: insurance.expiration_date,
        type: "error",
        path: "/insurance",
        category: "insurance",
        urgency: 0,
      });
    } else if (daysLeft <= 30) {
      items.push({
        id: `insurance-${insurance.id}`,
        title: "Seguro vencendo",
        message: `${vehicle.license_plate}${insurer}: vence em ${daysLeft} dia(s)`,
        date: insurance.expiration_date,
        type: "warning",
        path: "/insurance",
        category: "insurance",
        urgency: 1,
      });
    }
  }

  for (const driver of driversRes.data ?? []) {
    if (!driver.active || !driver.validade_cnh) continue;
    const daysLeft = daysFromToday(driver.validade_cnh);
    if (daysLeft > 60) continue;

    const name = driver.nome_completo || "Motorista";
    if (daysLeft < 0) {
      items.push({
        id: `cnh-${driver.id}`,
        title: "CNH vencida",
        message: `${name}: vencida há ${Math.abs(daysLeft)} dia(s)`,
        date: driver.validade_cnh,
        type: "error",
        path: "/drivers",
        category: "cnh",
        urgency: 0,
      });
    } else if (daysLeft === 0) {
      items.push({
        id: `cnh-${driver.id}`,
        title: "CNH vence hoje",
        message: `${name}: vence hoje`,
        date: driver.validade_cnh,
        type: "error",
        path: "/drivers",
        category: "cnh",
        urgency: 0,
      });
    } else {
      items.push({
        id: `cnh-${driver.id}`,
        title: "CNH vencendo",
        message: `${name}: vence em ${daysLeft} dia(s)`,
        date: driver.validade_cnh,
        type: "warning",
        path: "/drivers",
        category: "cnh",
        urgency: 1,
      });
    }
  }

  for (const item of stockRes.data ?? []) {
    const current = Number(item.estoque_atual) || 0;
    const minimum = Number(item.estoque_minimo) || 0;
    if (current > minimum) continue;

    const unit = UNIT_LABEL[item.unidade_medida] || item.unidade_medida || "";
    const empty = current <= 0;

    items.push({
      id: `stock-${item.id}`,
      title: empty ? "Estoque zerado" : "Estoque baixo",
      message: `${item.nome}: ${current.toLocaleString("pt-BR")} ${unit} (mínimo ${minimum.toLocaleString("pt-BR")} ${unit})`.trim(),
      date: nowIso,
      type: empty ? "error" : "warning",
      path: "/estoque",
      category: "stock",
      urgency: empty ? 0 : 1,
    });
  }

  return items.sort((a, b) => a.urgency - b.urgency || a.title.localeCompare(b.title, "pt-BR"));
}
