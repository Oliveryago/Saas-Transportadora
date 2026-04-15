import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Fleet } from "./pages/Fleet";
import { Fuel } from "./pages/Fuel";
import { Maintenance } from "./pages/Maintenance";
import { OilChange } from "./pages/OilChange";
import { SuperAdmin } from "./pages/SuperAdmin";
import { Suppliers } from "./pages/Suppliers";
import { Parking } from "./pages/Parking";
import { TireChangePage } from "./pages/TireChange";
import { Washing } from "./pages/Washing";
import { Tolls } from "./pages/Tolls";
import { Rotation } from "./pages/Rotation";
import { Insurance } from "./pages/Insurance";
import { Accidents } from "./pages/Accidents";
import { Settings } from "./pages/Settings";
import { FinancialDashboard } from "./pages/FinancialDashboard";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/fleet" element={<ProtectedRoute><Fleet /></ProtectedRoute>} />
          <Route path="/fuel" element={<ProtectedRoute><Fuel /></ProtectedRoute>} />
          <Route path="/maintenance" element={<ProtectedRoute><Maintenance /></ProtectedRoute>} />
          <Route path="/oil-change" element={<ProtectedRoute><OilChange /></ProtectedRoute>} />
          <Route path="/suppliers" element={<ProtectedRoute><Suppliers /></ProtectedRoute>} />
          <Route path="/parking" element={<ProtectedRoute><Parking /></ProtectedRoute>} />
          <Route path="/tire-change" element={<ProtectedRoute><TireChangePage /></ProtectedRoute>} />
          <Route path="/washing" element={<ProtectedRoute><Washing /></ProtectedRoute>} />
          <Route path="/tolls" element={<ProtectedRoute><Tolls /></ProtectedRoute>} />
          <Route path="/rotation" element={<ProtectedRoute><Rotation /></ProtectedRoute>} />
          <Route path="/insurance" element={<ProtectedRoute><Insurance /></ProtectedRoute>} />
          <Route path="/accidents" element={<ProtectedRoute><Accidents /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/financial" element={<ProtectedRoute><FinancialDashboard /></ProtectedRoute>} />
          <Route path="/superadmin" element={<ProtectedRoute><SuperAdmin /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
