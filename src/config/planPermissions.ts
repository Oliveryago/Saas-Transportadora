export type SubscriptionPlan = "free" | "basic" | "premium";

export const PLAN_WRITE_ACCESS: Record<SubscriptionPlan, string[]> = {
  free: ["frota", "motoristas", "combustivel"],
  basic: ["frota", "motoristas", "combustivel", "manutencao"],
  premium: [
    "frota",
    "motoristas",
    "combustivel",
    "manutencao",
    "estoque",
    "troca_oleo",
    "troca_pneus",
    "rodizio",
    "marcacao_pneus",
    "lavagem",
    "pedagio",
    "estacionamento",
    "seguro",
    "acidentes",
    "fornecedores",
    "financeiro",
    "relatorios",
    "configuracoes",
  ],
};

const PLAN_ORDER: SubscriptionPlan[] = ["free", "basic", "premium"];

const PLAN_LABEL: Record<SubscriptionPlan, string> = {
  free: "Free",
  basic: "Basic",
  premium: "Premium",
};

export function normalizePlan(plan: string | null | undefined): SubscriptionPlan {
  const value = String(plan || "free").trim().toLowerCase();
  if (value === "basic" || value === "premium") return value;
  return "free";
}

export function canWriteModule(plan: string | null | undefined, moduleKey: string): boolean {
  const normalized = normalizePlan(plan);
  return PLAN_WRITE_ACCESS[normalized].includes(moduleKey);
}

export function minimumPlanForModule(moduleKey: string): SubscriptionPlan {
  for (const plan of PLAN_ORDER) {
    if (PLAN_WRITE_ACCESS[plan].includes(moduleKey)) return plan;
  }
  return "premium";
}

export function writeLockMessage(moduleKey: string): string {
  const min = minimumPlanForModule(moduleKey);
  return `Disponível no plano ${PLAN_LABEL[min]}`;
}

export function planLabel(plan: string | null | undefined): string {
  return PLAN_LABEL[normalizePlan(plan)];
}
