import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface DriverRouteProps {
  children: React.ReactNode;
}

/**
 * DriverRoute — Rota exclusiva para role "driver".
 * Sem sidebar, sem MainLayout. Interface mobile-first pura.
 */
export function DriverRoute({ children }: DriverRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  // If not driver role, redirect to appropriate home
  if (user.role !== "driver") {
    return <Navigate to="/" />;
  }

  // Drivers get clean, full-screen mobile layout — no sidebar
  return <>{children}</>;
}
