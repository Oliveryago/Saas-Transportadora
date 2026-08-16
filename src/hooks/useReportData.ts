import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

export type ReportType = "vehicle-cost" | "fuel-consumption" | "maintenance" | "drivers" | "financial";

interface ReportFilters {
  startDate: string;
  endDate: string;
  vehicleId?: string;
  driverId?: string;
  fuelType?: string;
  maintenanceType?: string;
}

export function useReportData(reportType: ReportType, filters: ReportFilters) {
  const { tenant } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch vehicles and drivers for filters
  useEffect(() => {
    if (!tenant) return;
    Promise.all([
      supabase.from("vehicles").select("id, license_plate, model, active").eq("tenant_id", tenant.id),
      supabase.from("users").select("id, name, role").eq("tenant_id", tenant.id),
    ]).then(([vRes, dRes]) => {
      setVehicles(vRes.data || []);
      setDrivers(dRes.data || []);
    });
  }, [tenant]);

  const fetchReport = useCallback(async () => {
    if (!tenant || !filters.startDate || !filters.endDate) return;

    setLoading(true);
    setError(null);

    try {
      switch (reportType) {
        case "vehicle-cost":
          await fetchVehicleCostReport(tenant.id, filters);
          break;
        case "fuel-consumption":
          await fetchFuelConsumptionReport(tenant.id, filters);
          break;
        case "maintenance":
          await fetchMaintenanceReport(tenant.id, filters);
          break;
        case "drivers":
          await fetchDriversReport(tenant.id, filters);
          break;
        case "financial":
          await fetchFinancialReport(tenant.id, filters);
          break;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar relatório");
    } finally {
      setLoading(false);
    }
  }, [tenant, reportType, filters.startDate, filters.endDate, filters.vehicleId, filters.driverId]);

  // Vehicle cost report
  async function fetchVehicleCostReport(tenantId: string, f: ReportFilters) {
    const [fuelRes, maintRes, tireRes, washRes, tollRes, parkRes] = await Promise.all([
      supabase.from("fuel_records").select("vehicle_id, value_brl, km_digital").eq("tenant_id", tenantId).gte("created_at", f.startDate).lte("created_at", f.endDate),
      supabase.from("maintenance_records").select("vehicle_id, value_brl").eq("tenant_id", tenantId).gte("created_at", f.startDate).lte("created_at", f.endDate),
      supabase.from("tire_changes").select("vehicle_id, value_brl").eq("tenant_id", tenantId).gte("created_at", f.startDate).lte("created_at", f.endDate),
      supabase.from("washing_records").select("vehicle_id, value_brl").eq("tenant_id", tenantId).gte("created_at", f.startDate).lte("created_at", f.endDate),
      supabase.from("toll_records").select("vehicle_id, value_brl").eq("tenant_id", tenantId).gte("created_at", f.startDate).lte("created_at", f.endDate),
      supabase.from("parking_records").select("vehicle_id, value_brl").eq("tenant_id", tenantId).gte("created_at", f.startDate).lte("created_at", f.endDate),
    ]);

    const vehicleCosts: Record<string, any> = {};

    const sumByVehicle = (records: any[] | null, field: string) => {
      (records || []).forEach((r: any) => {
        if (!vehicleCosts[r.vehicle_id]) {
          const v = vehicles.find((v: any) => v.id === r.vehicle_id);
          vehicleCosts[r.vehicle_id] = {
            vehicleId: r.vehicle_id,
            plate: v?.license_plate || "?",
            model: v?.model || "?",
            fuel: 0, maintenance: 0, tires: 0, washing: 0, tolls: 0, parking: 0, total: 0, kmRun: 0,
          };
        }
        vehicleCosts[r.vehicle_id][field] += Number(r.value_brl || 0);
        vehicleCosts[r.vehicle_id].total += Number(r.value_brl || 0);
      });
    };

    sumByVehicle(fuelRes.data, "fuel");
    sumByVehicle(maintRes.data, "maintenance");
    sumByVehicle(tireRes.data, "tires");
    sumByVehicle(washRes.data, "washing");
    sumByVehicle(tollRes.data, "tolls");
    sumByVehicle(parkRes.data, "parking");

    // Calculate KM run per vehicle from fuel records
    (fuelRes.data || []).forEach((r: any) => {
      if (vehicleCosts[r.vehicle_id]) {
        const current = vehicleCosts[r.vehicle_id];
        if (!current._minKm || r.km_digital < current._minKm) current._minKm = r.km_digital;
        if (!current._maxKm || r.km_digital > current._maxKm) current._maxKm = r.km_digital;
        current.kmRun = (current._maxKm || 0) - (current._minKm || 0);
      }
    });

    const result = Object.values(vehicleCosts).map((v: any) => ({
      ...v,
      costPerKm: v.kmRun > 0 ? v.total / v.kmRun : 0,
    }));

    // Filter by vehicle if specified
    const filtered = f.vehicleId ? result.filter((r: any) => r.vehicleId === f.vehicleId) : result;
    setData(filtered.sort((a: any, b: any) => b.total - a.total));
  }

  // Fuel consumption report
  async function fetchFuelConsumptionReport(tenantId: string, f: ReportFilters) {
    let query = supabase
      .from("fuel_records")
      .select("id, vehicle_id, driver_id, km_digital, liters, value_brl, price_per_liter, fuel_type, fuel_station, created_at")
      .eq("tenant_id", tenantId)
      .gte("created_at", f.startDate)
      .lte("created_at", f.endDate)
      .order("created_at", { ascending: false });

    if (f.vehicleId) query = query.eq("vehicle_id", f.vehicleId);
    if (f.driverId) query = query.eq("driver_id", f.driverId);

    const { data: records } = await query;

    const result = (records || []).map((r: any) => {
      const vehicle = vehicles.find((v: any) => v.id === r.vehicle_id);
      const driver = drivers.find((d: any) => d.id === r.driver_id);
      return {
        date: r.created_at,
        plate: vehicle?.license_plate || "?",
        model: vehicle?.model || "?",
        driver: driver?.name || "?",
        km: r.km_digital,
        liters: r.liters,
        value: r.value_brl || 0,
        pricePerLiter: r.price_per_liter || 0,
        fuelType: r.fuel_type || "-",
        station: r.fuel_station || "-",
      };
    });

    setData(result);
  }

  // Maintenance report
  async function fetchMaintenanceReport(tenantId: string, f: ReportFilters) {
    let query = supabase
      .from("maintenance_records")
      .select("id, vehicle_id, type, description, value_brl, date, parts, created_at")
      .eq("tenant_id", tenantId)
      .gte("date", f.startDate)
      .lte("date", f.endDate)
      .order("date", { ascending: false });

    if (f.vehicleId) query = query.eq("vehicle_id", f.vehicleId);

    const { data: records } = await query;

    const result = (records || []).map((r: any) => {
      const vehicle = vehicles.find((v: any) => v.id === r.vehicle_id);
      const partsArr = Array.isArray(r.parts) ? r.parts : [];
      const partsCost = partsArr.reduce((s: number, p: any) => {
        const cost = Number(p.cost) || 0;
        const qty = Number(p.quantity) || 1;
        return s + (cost * qty);
      }, 0);
      return {
        date: r.date,
        plate: vehicle?.license_plate || "?",
        model: vehicle?.model || "?",
        type: r.type || "-",
        description: r.description || "-",
        partsCount: partsArr.length,
        partsCost,
        totalValue: Number(r.value_brl) || 0,
      };
    });

    setData(result);
  }

  // Drivers report
  async function fetchDriversReport(tenantId: string, f: ReportFilters) {
    const [fuelRes, accidentRes] = await Promise.all([
      supabase.from("fuel_records").select("driver_id, vehicle_id, km_digital, liters, value_brl").eq("tenant_id", tenantId).gte("created_at", f.startDate).lte("created_at", f.endDate),
      supabase.from("accident_records").select("driver_id").eq("tenant_id", tenantId).gte("created_at", f.startDate).lte("created_at", f.endDate),
    ]);

    const driverStats: Record<string, any> = {};

    (fuelRes.data || []).forEach((r: any) => {
      if (!r.driver_id) return;
      if (!driverStats[r.driver_id]) {
        const d = drivers.find((d: any) => d.id === r.driver_id);
        driverStats[r.driver_id] = {
          driverId: r.driver_id,
          name: d?.name || "?",
          fuelCount: 0,
          totalLiters: 0,
          totalFuelCost: 0,
          accidents: 0,
          _kms: new Map(),
        };
      }
      const stat = driverStats[r.driver_id];
      stat.fuelCount++;
      stat.totalLiters += r.liters || 0;
      stat.totalFuelCost += Number(r.value_brl || 0);
      
      const existing = stat._kms.get(r.vehicle_id);
      if (existing) {
        existing.min = Math.min(existing.min, r.km_digital);
        existing.max = Math.max(existing.max, r.km_digital);
      } else {
        stat._kms.set(r.vehicle_id, { min: r.km_digital, max: r.km_digital });
      }
    });

    (accidentRes.data || []).forEach((r: any) => {
      if (r.driver_id && driverStats[r.driver_id]) {
        driverStats[r.driver_id].accidents++;
      }
    });

    const result = Object.values(driverStats).map((d: any) => {
      let totalKm = 0;
      d._kms.forEach((v: any) => { totalKm += v.max - v.min; });
      const avgConsumption = d.totalLiters > 0 ? totalKm / d.totalLiters : 0;
      return {
        name: d.name,
        kmRun: totalKm,
        fuelCount: d.fuelCount,
        fuelCost: d.totalFuelCost,
        accidents: d.accidents,
        avgConsumption,
      };
    });

    const filtered = f.driverId ? result.filter((r: any) => {
      const stat = driverStats[f.driverId!];
      return stat && r.name === stat.name;
    }) : result;

    setData(filtered.sort((a: any, b: any) => b.avgConsumption - a.avgConsumption));
  }

  // Financial consolidated report
  async function fetchFinancialReport(tenantId: string, f: ReportFilters) {
    const [fuelRes, maintRes, tireRes, washRes, tollRes, parkRes] = await Promise.all([
      supabase.from("fuel_records").select("value_brl, created_at").eq("tenant_id", tenantId).gte("created_at", f.startDate).lte("created_at", f.endDate),
      supabase.from("maintenance_records").select("value_brl, created_at").eq("tenant_id", tenantId).gte("created_at", f.startDate).lte("created_at", f.endDate),
      supabase.from("tire_changes").select("value_brl, created_at").eq("tenant_id", tenantId).gte("created_at", f.startDate).lte("created_at", f.endDate),
      supabase.from("washing_records").select("value_brl, created_at").eq("tenant_id", tenantId).gte("created_at", f.startDate).lte("created_at", f.endDate),
      supabase.from("toll_records").select("value_brl, created_at").eq("tenant_id", tenantId).gte("created_at", f.startDate).lte("created_at", f.endDate),
      supabase.from("parking_records").select("value_brl, created_at").eq("tenant_id", tenantId).gte("created_at", f.startDate).lte("created_at", f.endDate),
    ]);

    const sum = (records: any[] | null) => (records || []).reduce((s: number, r: any) => s + Number(r.value_brl || 0), 0);

    const fuel = sum(fuelRes.data);
    const maintenance = sum(maintRes.data);
    const tires = sum(tireRes.data);
    const washing = sum(washRes.data);
    const tolls = sum(tollRes.data);
    const parking = sum(parkRes.data);
    const total = fuel + maintenance + tires + washing + tolls + parking;

    const items = [
      { category: "Combustível", value: fuel, percentage: total > 0 ? (fuel / total * 100) : 0, count: (fuelRes.data || []).length },
      { category: "Manutenção", value: maintenance, percentage: total > 0 ? (maintenance / total * 100) : 0, count: (maintRes.data || []).length },
      { category: "Pneus", value: tires, percentage: total > 0 ? (tires / total * 100) : 0, count: (tireRes.data || []).length },
      { category: "Lavagem", value: washing, percentage: total > 0 ? (washing / total * 100) : 0, count: (washRes.data || []).length },
      { category: "Pedágios", value: tolls, percentage: total > 0 ? (tolls / total * 100) : 0, count: (tollRes.data || []).length },
      { category: "Estacionamento", value: parking, percentage: total > 0 ? (parking / total * 100) : 0, count: (parkRes.data || []).length },
    ];

    items.push({ category: "TOTAL", value: total, percentage: 100, count: items.reduce((s, i) => s + i.count, 0) });

    setData(items);
  }

  return {
    data,
    vehicles,
    drivers,
    loading,
    error,
    fetchReport,
  };
}
