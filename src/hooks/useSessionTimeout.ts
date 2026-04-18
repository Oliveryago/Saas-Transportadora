import { useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";

const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export function useSessionTimeout() {
  const { user, signOut } = useAuth();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user) return; // Do not apply timeout if user is not logged in

    function resetTimer() {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        // Log out on inactivity
        signOut().then(() => {
          alert("Sua sessão inspirou por inatividade. Por favor, faça login novamente.");
        });
      }, TIMEOUT_MS);
    }

    // Initialize timer
    resetTimer();

    // Event listeners for user activity
    const events = ["mousemove", "keydown", "scroll", "click"];
    const handleActivity = () => resetTimer();

    events.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [user, signOut]);
}
