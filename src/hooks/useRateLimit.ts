import { useRef, useCallback } from "react";

/**
 * useRateLimit
 * Evita duplo cliques e submissões repetidas em botões de formulário.
 * Bloqueia a execução de uma função se ela for chamada dentro de X milissegundos
 * desde a última chamada.
 * 
 * @param delayMs Tempo de bloqueio em milissegundos
 */
export function useRateLimit(delayMs: number = 1000) {
  const isLocked = useRef(false);

  const execute = useCallback(<T extends any[], R>(
    callback: (...args: T) => Promise<R> | R
  ) => {
    return async (...args: T): Promise<R | undefined> => {
      if (isLocked.current) {
        console.warn("[RateLimit] Call blocked to prevent spam");
        return undefined;
      }

      isLocked.current = true;
      try {
        return await callback(...args);
      } finally {
        setTimeout(() => {
          isLocked.current = false;
        }, delayMs);
      }
    };
  }, [delayMs]);

  return { execute };
}
