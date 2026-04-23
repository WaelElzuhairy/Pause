import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import ProtectedRoute from "./components/ProtectedRoute";
import AuthPage from "./pages/Auth";
import DashboardPage from "./pages/Dashboard";
import CheckInPage from "./pages/CheckIn";
import ImprovePage from "./pages/Improve";
import InsightsPage from "./pages/Insights";
import IncidentReporterPage from "./pages/IncidentReporter";
import AIAssistantPage from "./pages/AIAssistant";
import ScenariosPage from "./pages/Scenarios";
import Layout from "./components/Layout";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<AuthPage />} />

          {/* Protected */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/checkin" element={<CheckInPage />} />
              <Route path="/improve" element={<ImprovePage />} />
              <Route path="/insights" element={<InsightsPage />} />
              <Route path="/report" element={<IncidentReporterPage />} />
              <Route path="/assistant" element={<AIAssistantPage />} />
              <Route path="/scenarios" element={<ScenariosPage />} />
            </Route>
          </Route>

          {/* Default */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
