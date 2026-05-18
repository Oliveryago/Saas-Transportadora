import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { FuelRecord } from "../types";

interface DashboardMetrics {
  vehiclesActive: number;
  vehiclesInactive: number;
  driversCount: number;
  fuelCountMonth: number;
  fuelTotalMonth: number;
  maintenanceCostMonth: number;
  totalKmMonth: number;
  avgConsumption: number;
  pendingAlertsCount: number;
}

interface CostByCategory {
  month: string;
  combustivel: number;
  manutencao: number;
  pneus: number;
  lavagem: number;
  pedagio: number;
  estacionamento: number;
}

interface VehicleConsumption {
  vehicleId: string;
  plate: string;
  model: string;
  avgKmPerLiter: number;
}

interface DailyFuel {
  date: string;
  count: number;
  totalValue: number;
}

interface RecentActivity {
  id: string;
  type: string;
  description: string;
  vehiclePlate?: string;
  date: string;
}

interface AlertItem {
  id: string;
  vehicleId: string;
  plate: string;
  model: string;
  alertType: string;
  urgency: "red" | "yellow" | "green";
  message: string;
  daysRemaining?: number;
  kmRemaining?: number;
  module: string;
  path: string;
}

export function useDashboardMetrics(vehicleId?: string) {
  const { tenant } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Raw data
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [fuelRecords, setFuelRecords] = useState<any[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<any[]>([]);
  const [oilAlerts, setOilAlerts] = useState<any[]>([]);
  const [tireChanges, setTireChanges] = useState<any[]>([]);
  const [washingRecords, setWashingRecords] = useState<any[]>([]);
  const [tollRecords, setTollRecords] = useState<any[]>([]);
  const [parkingRecords, setParkingRecords] = useState<any[]>([]);
  const [insuranceRecords, setInsuranceRecords] = useState<any[]>([]);

  const fetchAll = useCallback(async () => {
    if (!tenant) return;
    try {
      setLoading(true);
      setError(null);

      const now = new Date();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1).toISOString();

      let vehiclesQuery = supabase.from("vehicles").select("id, license_plate, model, current_km, active").eq("tenant_id", tenant.id);
      if (vehicleId) vehiclesQuery = vehiclesQuery.eq("id", vehicleId);

      let fuelQuery = supabase.from("fuel_records").select("id, vehicle_id, liters, value_brl, km_digital, created_at").eq("tenant_id", tenant.id).gte("created_at", sixMonthsAgo);
      if (vehicleId) fuelQuery = fuelQuery.eq("vehicle_id", vehicleId);
      fuelQuery = fuelQuery.order("created_at", { ascending: false });

      let maintenanceQuery = supabase.from("maintenance_records").select("id, vehicle_id, value_brl, type, description, date, created_at").eq("tenant_id", tenant.id).gte("created_at", sixMonthsAgo);
      if (vehicleId) maintenanceQuery = maintenanceQuery.eq("vehicle_id", vehicleId);
      maintenanceQuery = maintenanceQuery.order("created_at", { ascending: false });

      let oilQuery = supabase.from("oil_change_alerts").select("id, vehicle_id, oil_type, alert_type, km_interval, days_interval, last_change_km, last_change_date, alert_status").eq("tenant_id", tenant.id).eq("alert_status", "active");
      if (vehicleId) oilQuery = oilQuery.eq("vehicle_id", vehicleId);

      let tireQuery = supabase.from("tire_changes").select("id, vehicle_id, value_brl, date, created_at").eq("tenant_id", tenant.id).gte("created_at", sixMonthsAgo);
      if (vehicleId) tireQuery = tireQuery.eq("vehicle_id", vehicleId);

      let washQuery = supabase.from("washing_records").select("id, vehicle_id, value_brl, date, created_at").eq("tenant_id", tenant.id).gte("created_at", sixMonthsAgo);
      if (vehicleId) washQuery = washQuery.eq("vehicle_id", vehicleId);

      let tollQuery = supabase.from("toll_records").select("id, vehicle_id, value_brl, date, created_at").eq("tenant_id", tenant.id).gte("created_at", sixMonthsAgo);
      if (vehicleId) tollQuery = tollQuery.eq("vehicle_id", vehicleId);

      let parkQuery = supabase.from("parking_records").select("id, vehicle_id, value_brl, entry_date, created_at").eq("tenant_id", tenant.id).gte("created_at", sixMonthsAgo);
      if (vehicleId) parkQuery = parkQuery.eq("vehicle_id", vehicleId);

      let insuranceQuery = supabase.from("insurance_records").select("id, vehicle_id, expiration_date, insurer, created_at").eq("tenant_id", tenant.id);
      if (vehicleId) insuranceQuery = insuranceQuery.eq("vehicle_id", vehicleId);

      const [
        vehiclesRes,
        driversRes,
        fuelRes,
        maintenanceRes,
        oilRes,
        tireRes,
        washRes,
        tollRes,
        parkRes,
        insuranceRes,
      ] = await Promise.all([
        vehiclesQuery,
        supabase.from("drivers").select("id, nome_completo, active").eq("tenant_id", tenant.id).eq("active", true),
        fuelQuery,
        maintenanceQuery,
        oilQuery,
        tireQuery,
        washQuery,
        tollQuery,
        parkQuery,
        insuranceQuery,
      ]);

      setVehicles(vehiclesRes.data || []);
      setDrivers(driversRes.data || []);
      setFuelRecords(fuelRes.data || []);
      setMaintenanceRecords(maintenanceRes.data || []);
      setOilAlerts(oilRes.data || []);
      setTireChanges(tireRes.data || []);
      setWashingRecords(washRes.data || []);
      setTollRecords(tollRes.data || []);
      setParkingRecords(parkRes.data || []);
      setInsuranceRecords(insuranceRes.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar métricas");
    } finally {
      setLoading(false);
    }
  }, [tenant, vehicleId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Métricas do mês atual
  const metrics = useMemo<DashboardMetrics>(() => {
    const now = new Date();
    const isThisMonth = (dateStr: string) => {
      const d = new Date(dateStr);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    };

    const monthFuel = fuelRecords.filter(r => isThisMonth(r.created_at));
    const monthMaintenance = maintenanceRecords.filter(r => isThisMonth(r.created_at));

    let globalTotalKm = 0;
    let globalConsumableLiters = 0;

    const vehiclesIds = [...new Set(fuelRecords.map(r => r.vehicle_id))];
    
    vehiclesIds.forEach(vId => {
      const vRecords = fuelRecords
        .filter(r => r.vehicle_id === vId)
        .sort((a, b) => a.km_digital - b.km_digital);

      let lastFullRecord: FuelRecord | null = null;
      let pendingLiters = 0;

      vRecords.forEach((r, idx) => {
        const isCurrentMonth = isThisMonth(r.created_at);
        const isFull = r.is_full_tank !== false;

        if (idx > 0) {
          if (isFull) {
            if (lastFullRecord) {
              const segmentDist = r.km_digital - lastFullRecord.km_digital;
              const segmentLiters = pendingLiters + r.liters;
              
              // Only add to global metrics if the segment ENDS in the current month
              if (isCurrentMonth && segmentDist > 0 && segmentLiters > 0) {
                globalTotalKm += segmentDist;
                globalConsumableLiters += segmentLiters;
              }
            }
            lastFullRecord = r;
            pendingLiters = 0;
          } else {
            pendingLiters += r.liters;
          }
        } else {
          // First record of the vehicle
          if (isFull) lastFullRecord = r;
          else pendingLiters = r.liters;
        }
      });
    });

    return {
      vehiclesActive: vehicles.filter(v => v.active).length,
      vehiclesInactive: vehicles.filter(v => !v.active).length,
      driversCount: drivers.length,
      fuelCountMonth: monthFuel.length,
      fuelTotalMonth: monthFuel.reduce((sum, r) => sum + (r.value_brl || 0), 0),
      maintenanceCostMonth: monthMaintenance.reduce((sum, r) => sum + (r.value_brl || 0), 0),
      totalKmMonth: globalTotalKm,
      avgConsumption: globalConsumableLiters > 0 ? globalTotalKm / globalConsumableLiters : 0,
      pendingAlertsCount: oilAlerts.length,
    };
  }, [vehicles, drivers, fuelRecords, maintenanceRecords, oilAlerts]);

  // Custo por categoria (últimos 6 meses)
  const costByCategory = useMemo<CostByCategory[]>(() => {
    const months: Record<string, CostByCategory> = {};
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

    const getMonthKey = (dateStr: string) => {
      const d = new Date(dateStr);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    };

    const getMonthLabel = (dateStr: string) => {
      const d = new Date(dateStr);
      return `${monthNames[d.getMonth()]}/${String(d.getFullYear()).slice(-2)}`;
    };

    const ensureMonth = (dateStr: string) => {
      const key = getMonthKey(dateStr);
      if (!months[key]) {
        months[key] = {
          month: getMonthLabel(dateStr),
          combustivel: 0,
          manutencao: 0,
          pneus: 0,
          lavagem: 0,
          pedagio: 0,
          estacionamento: 0,
        };
      }
      return months[key];
    };

    fuelRecords.forEach(r => { ensureMonth(r.created_at).combustivel += r.value_brl || 0; });
    maintenanceRecords.forEach(r => { ensureMonth(r.created_at).manutencao += r.value_brl || 0; });
    tireChanges.forEach(r => { ensureMonth(r.created_at).pneus += r.value_brl || 0; });
    washingRecords.forEach(r => { ensureMonth(r.created_at).lavagem += r.value_brl || 0; });
    tollRecords.forEach(r => { ensureMonth(r.created_at).pedagio += r.value_brl || 0; });
    parkingRecords.forEach(r => { ensureMonth(r.created_at).estacionamento += r.value_brl || 0; });

    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([, v]) => v);
  }, [fuelRecords, maintenanceRecords, tireChanges, washingRecords, tollRecords, parkingRecords]);

  // Consumo por veículo (Top 10)
  const vehicleConsumption = useMemo<VehicleConsumption[]>(() => {
    const vehicleData = new Map<string, { liters: number; kms: { min: number; max: number } }>();

    fuelRecords.forEach(r => {
      const existing = vehicleData.get(r.vehicle_id);
      if (existing) {
        existing.liters += r.liters || 0;
        existing.kms.min = Math.min(existing.kms.min, r.km_digital);
        existing.kms.max = Math.max(existing.kms.max, r.km_digital);
      } else {
        vehicleData.set(r.vehicle_id, {
          liters: r.liters || 0,
          kms: { min: r.km_digital, max: r.km_digital },
        });
      }
    });

    const result: VehicleConsumption[] = [];
    vehicleData.forEach((data, vehicleId) => {
      const vehicle = vehicles.find(v => v.id === vehicleId);
      if (!vehicle) return;
      const km = data.kms.max - data.kms.min;
      if (data.liters > 0 && km > 0) {
        result.push({
          vehicleId,
          plate: vehicle.license_plate,
          model: vehicle.model,
          avgKmPerLiter: km / data.liters,
        });
      }
    });

    return result
      .sort((a, b) => b.avgKmPerLiter - a.avgKmPerLiter)
      .slice(0, 10);
  }, [fuelRecords, vehicles]);

  // Abastecimentos por dia (último mês)
  const dailyFuel = useMemo<DailyFuel[]>(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
    const days: Record<string, DailyFuel> = {};

    fuelRecords
      .filter(r => new Date(r.created_at) >= thirtyDaysAgo)
      .forEach(r => {
        const date = new Date(r.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
        if (!days[date]) {
          days[date] = { date, count: 0, totalValue: 0 };
        }
        days[date].count++;
        days[date].totalValue += r.value_brl || 0;
      });

    return Object.values(days).sort((a, b) => {
      const [da, ma] = a.date.split("/").map(Number);
      const [db, mb] = b.date.split("/").map(Number);
      return ma !== mb ? ma - mb : da - db;
    });
  }, [fuelRecords]);

  // Alertas com urgência
  const alertItems = useMemo<AlertItem[]>(() => {
    const items: AlertItem[] = [];
    const now = new Date();

    // Alertas de troca de óleo
    oilAlerts.forEach(alert => {
      const vehicle = vehicles.find(v => v.id === alert.vehicle_id);
      if (!vehicle) return;

      // KM mais recente do abastecimento
      const latestFuel = fuelRecords
        .filter(r => r.vehicle_id === alert.vehicle_id)
        .sort((a: any, b: any) => b.km_digital - a.km_digital)[0];
      const currentKm = latestFuel?.km_digital ?? vehicle.current_km;

      if (alert.km_interval && alert.last_change_km) {
        const nextKm = alert.last_change_km + alert.km_interval;
        const remaining = nextKm - currentKm;

        let urgency: "red" | "yellow" | "green" = "green";
        if (remaining <= 0) urgency = "red";
        else if (remaining <= 1000) urgency = "yellow";

        if (urgency !== "green") {
          items.push({
            id: alert.id,
            vehicleId: vehicle.id,
            plate: vehicle.license_plate,
            model: vehicle.model,
            alertType: "Troca de Óleo",
            urgency,
            message: remaining <= 0
              ? `Troca de óleo vencida (${Math.abs(remaining).toLocaleString("pt-BR")} km além)`
              : `Troca de óleo em ${remaining.toLocaleString("pt-BR")} km`,
            kmRemaining: remaining,
            module: "oil-change",
            path: "/oil-change",
          });
        }
      }

      if (alert.days_interval && alert.last_change_date) {
        const lastDate = new Date(alert.last_change_date);
        const nextDate = new Date(lastDate.getTime() + alert.days_interval * 86400000);
        const daysLeft = Math.ceil((nextDate.getTime() - now.getTime()) / 86400000);

        let urgency: "red" | "yellow" | "green" = "green";
        if (daysLeft <= 0) urgency = "red";
        else if (daysLeft <= 30) urgency = "yellow";

        if (urgency !== "green") {
          items.push({
            id: `${alert.id}-date`,
            vehicleId: vehicle.id,
            plate: vehicle.license_plate,
            model: vehicle.model,
            alertType: "Troca de Óleo (data)",
            urgency,
            message: daysLeft <= 0
              ? `Troca de óleo vencida há ${Math.abs(daysLeft)} dias`
              : `Troca de óleo em ${daysLeft} dias`,
            daysRemaining: daysLeft,
            module: "oil-change",
            path: "/oil-change",
          });
        }
      }
    });

    // Alertas de seguro vencendo
    insuranceRecords.forEach(ins => {
      if (!ins.expiration_date) return;
      const vehicle = vehicles.find(v => v.id === ins.vehicle_id);
      if (!vehicle) return;

      const expDate = new Date(ins.expiration_date);
      const daysLeft = Math.ceil((expDate.getTime() - now.getTime()) / 86400000);

      let urgency: "red" | "yellow" | "green" = "green";
      if (daysLeft <= 0) urgency = "red";
      else if (daysLeft <= 30) urgency = "yellow";

      if (urgency !== "green") {
        items.push({
          id: ins.id,
          vehicleId: vehicle.id,
          plate: vehicle.license_plate,
          model: vehicle.model,
          alertType: "Seguro",
          urgency,
          message: daysLeft <= 0
            ? `Seguro vencido há ${Math.abs(daysLeft)} dias`
            : `Seguro vence em ${daysLeft} dias`,
          daysRemaining: daysLeft,
          module: "insurance",
          path: "/insurance",
        });
      }
    });

    // Ordenar por urgência: vermelho > amarelo > verde
    const urgencyOrder = { red: 0, yellow: 1, green: 2 };
    return items.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);
  }, [oilAlerts, vehicles, fuelRecords, insuranceRecords]);

  // Atividade recente
  const recentActivity = useMemo<RecentActivity[]>(() => {
    const activities: RecentActivity[] = [];

    fuelRecords.slice(0, 10).forEach(r => {
      const vehicle = vehicles.find(v => v.id === r.vehicle_id);
      activities.push({
        id: `fuel-${r.id}`,
        type: "Abastecimento",
        description: `${(r.liters || 0).toFixed(1)}L — R$ ${(r.value_brl || 0).toFixed(2)}`,
        vehiclePlate: vehicle?.license_plate,
        date: r.created_at,
      });
    });

    maintenanceRecords.slice(0, 10).forEach(r => {
      const vehicle = vehicles.find(v => v.id === r.vehicle_id);
      activities.push({
        id: `maint-${r.id}`,
        type: "Manutenção",
        description: r.type || "Manutenção registrada",
        vehiclePlate: vehicle?.license_plate,
        date: r.created_at,
      });
    });

    return activities
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 20);
  }, [fuelRecords, maintenanceRecords, vehicles]);

  // Média da frota (para linha de referência no gráfico)
  const fleetAvgConsumption = useMemo(() => {
    if (vehicleConsumption.length === 0) return 0;
    return vehicleConsumption.reduce((sum, v) => sum + v.avgKmPerLiter, 0) / vehicleConsumption.length;
  }, [vehicleConsumption]);

  return {
    loading,
    error,
    metrics,
    costByCategory,
    vehicleConsumption,
    fleetAvgConsumption,
    dailyFuel,
    alertItems,
    recentActivity,
    vehicles,
    refetch: fetchAll,
  };
}
