import { useAuth } from "../contexts/AuthContext";
import {
  canWriteModule,
  normalizePlan,
  writeLockMessage,
  type SubscriptionPlan,
} from "../config/planPermissions";

export function usePlanAccess(moduleKey: string) {
  const { tenant, realTenant } = useAuth();
  const planSource = tenant ?? realTenant;
  const plan: SubscriptionPlan = normalizePlan(planSource?.subscription_plan);
  const canWrite = canWriteModule(plan, moduleKey);
  const lockMessage = canWrite ? "" : writeLockMessage(moduleKey);

  function guardWrite<T>(fn: () => T): T | undefined {
    if (!canWrite) return undefined;
    return fn();
  }

  return { canWrite, plan, lockMessage, guardWrite };
}
