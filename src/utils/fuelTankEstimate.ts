export interface FuelEventForTank {
  km: number;
  date: string;
  liters: number;
  isFull: boolean;
}

export interface TankEstimate {
  currentFuel: number;
  remainingKm: number;
  fuelPercentage: number;
  tankCapacity: number;
  lastRefuelKm: number;
  lastFillLiters: number;
  lastFillIsFull: boolean;
  fuelAtLastFill: number;
  distanceSinceRefuel: number;
  odometerUsed: number;
  isSimulating: boolean;
}

function eventTime(date: string): number {
  const t = Date.parse(date);
  return Number.isFinite(t) ? t : 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function sortChronological(events: FuelEventForTank[]): FuelEventForTank[] {
  return [...events].sort((a, b) => {
    const byDate = eventTime(a.date) - eventTime(b.date);
    if (byDate !== 0) return byDate;
    return (a.km || 0) - (b.km || 0);
  });
}

/**
 * Combustível no tanque imediatamente após o último abastecimento.
 * Tanque cheio = capacidade. Parcial = o que restava + litros abastecidos.
 * Sem histórico de tanque cheio, usa os litros da última abastecida.
 */
export function fuelAfterLastRefuel(
  events: FuelEventForTank[],
  tankCapacity: number,
  avgKmPerLiter: number,
): { fuel: number; km: number; lastFillLiters: number; lastFillIsFull: boolean } {
  if (events.length === 0) {
    return { fuel: 0, km: 0, lastFillLiters: 0, lastFillIsFull: false };
  }

  const sorted = sortChronological(events);
  const last = sorted[sorted.length - 1];
  const lastFillLiters = last.liters || 0;
  const lastFillIsFull = last.isFull;

  if (tankCapacity <= 0) {
    return { fuel: 0, km: last.km || 0, lastFillLiters, lastFillIsFull };
  }

  let lastFullIdx = -1;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].isFull) {
      lastFullIdx = i;
      break;
    }
  }

  let fuel: number;
  let km: number;
  let startIdx: number;

  if (lastFullIdx >= 0) {
    fuel = tankCapacity;
    km = sorted[lastFullIdx].km > 0 ? sorted[lastFullIdx].km : 0;
    startIdx = lastFullIdx + 1;
  } else {
    // Sem tanque cheio no histórico: a última abastecida é o ponto de partida
    fuel = 0;
    km = sorted[0].km > 0 ? sorted[0].km : 0;
    startIdx = 0;
  }

  for (let i = startIdx; i < sorted.length; i++) {
    const ev = sorted[i];
    const evKm = ev.km > 0 ? ev.km : km;
    const distance = Math.max(0, evKm - km);
    if (avgKmPerLiter > 0 && distance > 0) {
      fuel -= distance / avgKmPerLiter;
    }
    fuel = ev.isFull ? tankCapacity : fuel + (ev.liters || 0);
    fuel = clamp(fuel, 0, tankCapacity);
    if (ev.km > 0) km = ev.km;
  }

  return { fuel, km, lastFillLiters, lastFillIsFull };
}

/**
 * Estimativa para o caso: motorista na rua informa o KM atual e
 * o sistema responde quanto ainda dá para rodar.
 *
 * Sem KM informado, mostra o tanque logo após a última abastecida.
 * Com KM informado, desconta o que foi queimado pelo consumo médio.
 */
export function estimateTankLevel(params: {
  tankCapacity: number;
  events: FuelEventForTank[];
  avgKmPerLiter: number;
  simulatedKm?: number;
}): TankEstimate {
  const { tankCapacity, events, avgKmPerLiter, simulatedKm } = params;
  const empty: TankEstimate = {
    currentFuel: 0,
    remainingKm: 0,
    fuelPercentage: 0,
    tankCapacity,
    lastRefuelKm: 0,
    lastFillLiters: 0,
    lastFillIsFull: false,
    fuelAtLastFill: 0,
    distanceSinceRefuel: 0,
    odometerUsed: 0,
    isSimulating: false,
  };

  if (events.length === 0) return empty;

  const {
    fuel: fuelAtLastFill,
    km: lastRefuelKm,
    lastFillLiters,
    lastFillIsFull,
  } = fuelAfterLastRefuel(events, tankCapacity, avgKmPerLiter);

  const isSimulating = simulatedKm !== undefined && Number.isFinite(simulatedKm) && simulatedKm > 0;
  const odometerUsed = isSimulating ? Math.max(Number(simulatedKm), lastRefuelKm) : lastRefuelKm;
  const distanceSinceRefuel = Math.max(0, odometerUsed - lastRefuelKm);
  const burned = isSimulating && avgKmPerLiter > 0 ? distanceSinceRefuel / avgKmPerLiter : 0;
  const currentFuel = clamp(fuelAtLastFill - burned, 0, tankCapacity || fuelAtLastFill);
  const remainingKm = avgKmPerLiter > 0 ? currentFuel * avgKmPerLiter : 0;
  const fuelPercentage = tankCapacity > 0 ? (currentFuel / tankCapacity) * 100 : 0;

  return {
    currentFuel,
    remainingKm,
    fuelPercentage,
    tankCapacity,
    lastRefuelKm,
    lastFillLiters,
    lastFillIsFull,
    fuelAtLastFill,
    distanceSinceRefuel,
    odometerUsed,
    isSimulating,
  };
}
