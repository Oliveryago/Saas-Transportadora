import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { PageSkeleton } from "./components/shared/SkeletonLoader";
import { ErrorBoundary } from "./components/shared/ErrorBoundary";
import { Login } from "./pages/Login";

// LOG DE VERSÃO PARA FORÇAR CACHE
console.log("%c SISTEMA ATUALIZADO V2.0 - OCR REAL ", "background: red; color: white; font-size: 20px;");

// Lazy-loaded pages — code splitting por rota
const Dashboard = lazy(() => import("./pages/Dashboard").then(m => ({ default: m.Dashboard })));
const Fleet = lazy(() => import("./pages/Fleet").then(m => ({ default: m.Fleet })));
const Fuel = lazy(() => import("./pages/Fuel").then(m => ({ default: m.Fuel })));
const Maintenance = lazy(() => import("./pages/Maintenance").then(m => ({ default: m.Maintenance })));
const OilChange = lazy(() => import("./pages/OilChange").then(m => ({ default: m.OilChange })));
const SuperAdmin = lazy(() => import("./pages/SuperAdmin").then(m => ({ default: m.SuperAdmin })));
const Drivers = lazy(() => import("./pages/Drivers").then(m => ({ default: m.Drivers })));
const Suppliers = lazy(() => import("./pages/Suppliers").then(m => ({ default: m.Suppliers })));
const Parking = lazy(() => import("./pages/Parking").then(m => ({ default: m.Parking })));
const TireChangePage = lazy(() => import("./pages/TireChange").then(m => ({ default: m.TireChangePage })));
const Washing = lazy(() => import("./pages/Washing").then(m => ({ default: m.Washing })));
const Tolls = lazy(() => import("./pages/Tolls").then(m => ({ default: m.Tolls })));
const Rotation = lazy(() => import("./pages/Rotation").then(m => ({ default: m.Rotation })));
const Insurance = lazy(() => import("./pages/Insurance").then(m => ({ default: m.Insurance })));
const Accidents = lazy(() => import("./pages/Accidents").then(m => ({ default: m.Accidents })));
const Settings = lazy(() => import("./pages/Settings").then(m => ({ default: m.Settings })));
const FinancialDashboard = lazy(() => import("./pages/FinancialDashboard").then(m => ({ default: m.FinancialDashboard })));
const Reports = lazy(() => import("./pages/Reports").then(m => ({ default: m.Reports })));

function LazyPage({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageSkeleton />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><LazyPage><Dashboard /></LazyPage></ProtectedRoute>} />
          <Route path="/fleet" element={<ProtectedRoute><LazyPage><Fleet /></LazyPage></ProtectedRoute>} />
          <Route path="/fuel" element={<ProtectedRoute><LazyPage><Fuel /></LazyPage></ProtectedRoute>} />
          <Route path="/maintenance" element={<ProtectedRoute><LazyPage><Maintenance /></LazyPage></ProtectedRoute>} />
          <Route path="/oil-change" element={<ProtectedRoute><LazyPage><OilChange /></LazyPage></ProtectedRoute>} />
          <Route path="/suppliers" element={<ProtectedRoute><LazyPage><Suppliers /></LazyPage></ProtectedRoute>} />
          <Route path="/parking" element={<ProtectedRoute><LazyPage><Parking /></LazyPage></ProtectedRoute>} />
          <Route path="/tire-change" element={<ProtectedRoute><LazyPage><TireChangePage /></LazyPage></ProtectedRoute>} />
          <Route path="/washing" element={<ProtectedRoute><LazyPage><Washing /></LazyPage></ProtectedRoute>} />
          <Route path="/tolls" element={<ProtectedRoute><LazyPage><Tolls /></LazyPage></ProtectedRoute>} />
          <Route path="/rotation" element={<ProtectedRoute><LazyPage><Rotation /></LazyPage></ProtectedRoute>} />
          <Route path="/insurance" element={<ProtectedRoute><LazyPage><Insurance /></LazyPage></ProtectedRoute>} />
          <Route path="/accidents" element={<ProtectedRoute><LazyPage><Accidents /></LazyPage></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><LazyPage><Settings /></LazyPage></ProtectedRoute>} />
          <Route path="/financial" element={<ProtectedRoute><LazyPage><FinancialDashboard /></LazyPage></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><LazyPage><Reports /></LazyPage></ProtectedRoute>} />
          <Route path="/drivers" element={<ProtectedRoute><LazyPage><Drivers /></LazyPage></ProtectedRoute>} />
          <Route path="/superadmin" element={<ProtectedRoute><LazyPage><SuperAdmin /></LazyPage></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
