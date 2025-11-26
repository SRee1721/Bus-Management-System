import React from "react";
import StudentBusSearch from "./pages/StudentBusSearch";

import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Authenticate from "./pages/Authenticate";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import DefaultRoutes from "./pages/DefaultRoutes";
import BusManagement from "./pages/BusManagement";
import LiveTracking from "./pages/LiveTracking";
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import EditBus from "./pages/EditBus";
import RegisterPage from "./pages/RegisterPage";
import BusMonitor from "./pages/BusMonitor";
import Reports from "./pages/Reports";
// import Analytics from "./pages/Analytics";
function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Login />} />
          <Route path="/student" element={<StudentBusSearch />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/default-routes"
            element={
              <ProtectedRoute>
                <DefaultRoutes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/live-tracking"
            element={
              <ProtectedRoute>
                <LiveTracking />
              </ProtectedRoute>
            }
          />
          <Route
            path="/register-students"
            element={
              <ProtectedRoute>
                <RegisterPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <div>Notifications Page (Coming Soon)</div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bus-management"
            element={
              <ProtectedRoute>
                <BusManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bus-management/edit/:busId"
            element={
              <ProtectedRoute>
                <EditBus />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bus-monitor"
            element={
              <ProtectedRoute>
                <BusMonitor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/authenticate"
            element={
              <ProtectedRoute>
                <Authenticate />
              </ProtectedRoute>
            }
          />

          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
