import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import RoutesPage from './pages/RoutesPage';
import SuppliesPage from './pages/SuppliesPage';
import InspectionsPage from './pages/InspectionsPage';
import ContractsPage from './pages/ContractsPage';
import CompliancePage from './pages/CompliancePage';
import CrewsPage from './pages/CrewsPage';
import ClientsPage from './pages/ClientsPage';
import WorkOrdersPage from './pages/WorkOrdersPage';
import EquipmentPage from './pages/EquipmentPage';
import InvoicesPage from './pages/InvoicesPage';
import IncidentsPage from './pages/IncidentsPage';
import TimeTrackingPage from './pages/TimeTrackingPage';
import SchedulePage from './pages/SchedulePage';
import ExpensesPage from './pages/ExpensesPage';
import ChecklistsPage from './pages/ChecklistsPage';
import NotificationsPage from './pages/NotificationsPage';
import WebhooksPage from './pages/WebhooksPage';
import AIInsightsPage from './pages/AIInsightsPage';
import Navbar from './components/Navbar';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" />;
};

const AppContent = () => {
  const { isAuthenticated } = useAuth();
  return (
    <div className="app">
      {isAuthenticated && <Navbar />}
      <main className={isAuthenticated ? 'main-content' : ''}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/routes" element={<ProtectedRoute><RoutesPage /></ProtectedRoute>} />
          <Route path="/supplies" element={<ProtectedRoute><SuppliesPage /></ProtectedRoute>} />
          <Route path="/inspections" element={<ProtectedRoute><InspectionsPage /></ProtectedRoute>} />
          <Route path="/contracts" element={<ProtectedRoute><ContractsPage /></ProtectedRoute>} />
          <Route path="/compliance" element={<ProtectedRoute><CompliancePage /></ProtectedRoute>} />
          <Route path="/crews" element={<ProtectedRoute><CrewsPage /></ProtectedRoute>} />
          <Route path="/clients" element={<ProtectedRoute><ClientsPage /></ProtectedRoute>} />
          <Route path="/workorders" element={<ProtectedRoute><WorkOrdersPage /></ProtectedRoute>} />
          <Route path="/equipment" element={<ProtectedRoute><EquipmentPage /></ProtectedRoute>} />
          <Route path="/invoices" element={<ProtectedRoute><InvoicesPage /></ProtectedRoute>} />
          <Route path="/incidents" element={<ProtectedRoute><IncidentsPage /></ProtectedRoute>} />
          <Route path="/timetracking" element={<ProtectedRoute><TimeTrackingPage /></ProtectedRoute>} />
          <Route path="/schedules" element={<ProtectedRoute><SchedulePage /></ProtectedRoute>} />
          <Route path="/expenses" element={<ProtectedRoute><ExpensesPage /></ProtectedRoute>} />
          <Route path="/checklists" element={<ProtectedRoute><ChecklistsPage /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
          <Route path="/webhooks" element={<ProtectedRoute><WebhooksPage /></ProtectedRoute>} />
          <Route path="/ai-insights" element={<ProtectedRoute><AIInsightsPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <ToastContainer position="top-right" autoClose={3000} theme="colored" />
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
