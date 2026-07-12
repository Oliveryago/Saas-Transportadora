import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { MainLayout } from "./Layout/MainLayout";
import { useSessionTimeout } from "../hooks/useSessionTimeout";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading, isSuperAdmin } = useAuth();
  useSessionTimeout();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === "driver") {
    return <Navigate to="/driver" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role) && !isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  return <MainLayout>{children}</MainLayout>;
}
