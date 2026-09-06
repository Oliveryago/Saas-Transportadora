import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Lock } from "lucide-react";
import { usePlanAccess } from "../../hooks/usePlanAccess";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  moduleKey: string;
  children: ReactNode;
  iconOnly?: boolean;
}

export function PlanWriteButton({
  moduleKey,
  children,
  iconOnly = false,
  onClick,
  disabled,
  className = "",
  title,
  type = "button",
  ...rest
}: Props) {
  const { canWrite, lockMessage } = usePlanAccess(moduleKey);
  const locked = !canWrite;

  return (
    <button
      type={type}
      {...rest}
      disabled={disabled || locked}
      title={locked ? lockMessage : title}
      aria-label={locked ? lockMessage : rest["aria-label"]}
      onClick={locked ? (event) => { event.preventDefault(); event.stopPropagation(); } : onClick}
      className={`${className} ${locked ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {locked && iconOnly ? (
        <Lock className="w-4 h-4" />
      ) : locked ? (
        <span className="inline-flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 shrink-0" />
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}

export function PlanLockBanner({ moduleKey }: { moduleKey: string }) {
  const { canWrite, lockMessage } = usePlanAccess(moduleKey);
  if (canWrite) return null;
  return (
    <p className="flex items-center gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-4">
      <Lock className="w-4 h-4 shrink-0" />
      Visualização liberada. A edição deste módulo é {lockMessage.toLowerCase()}.
    </p>
  );
}
