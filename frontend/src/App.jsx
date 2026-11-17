import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { AlertToastContainer } from './components/AlertToast';

import { Overview } from './pages/Overview';
import { LiveMonitoring } from './pages/LiveMonitoring';
import { NetworkNodes } from './pages/NetworkNodes';
import { ThreatIntel } from './pages/ThreatIntel';
import { AttackAnalytics } from './pages/AttackAnalytics';
import { IncidentCenter } from './pages/IncidentCenter';
import { MlDetection } from './pages/MlDetection';
import { SimulationPanel } from './pages/SimulationPanel';
import { SystemLogs } from './pages/SystemLogs';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { Register } from './pages/Register';

const PAGE_TITLES = {
  overview: 'Overview Dashboard',
  monitoring: 'Live Event Stream & Monitoring',
  nodes: 'Network Nodes Management',
  'threat-intel': 'Threat Intelligence & IOC Sharing',
  analytics: 'Attack Telemetry Analytics',
  incidents: 'Incident Response Center',
  ml: 'Machine Learning Anomaly Detection',
  simulation: 'Attack Simulation & Demonstration Panel',
  logs: 'System Logs & Message Stream',
  settings: 'SOC Policies & Detection Rules Settings',
};

const DashboardContent = () => {
  const { isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [authView, setAuthView] = useState('login'); // 'login' | 'register'

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center text-center p-4">
        <div className="w-12 h-12 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin mb-4" />
        <span className="text-xs font-mono text-cyan-400 tracking-wider">
          INITIALIZING CYBERSHIELD SOC DEFENSE GRID...
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return authView === 'login' ? (
      <Login onSwitchToRegister={() => setAuthView('register')} />
    ) : (
      <Register onSwitchToLogin={() => setAuthView('login')} />
    );
  }

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'overview':
        return <Overview onNavigate={setActiveTab} />;
      case 'monitoring':
        return <LiveMonitoring />;
      case 'nodes':
        return <NetworkNodes />;
      case 'threat-intel':
        return <ThreatIntel />;
      case 'analytics':
        return <AttackAnalytics />;
      case 'incidents':
        return <IncidentCenter />;
      case 'ml':
        return <MlDetection />;
      case 'simulation':
        return <SimulationPanel />;
      case 'logs':
        return <SystemLogs />;
      case 'settings':
        return <Settings />;
      default:
        return <Overview onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="flex h-screen bg-[#070b14] text-slate-100 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />

      {/* Main View Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header title={PAGE_TITLES[activeTab] || 'CyberShield SOC'} />

        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {renderActiveTab()}
          </div>
        </main>
      </div>

      {/* Real-time Alert Toast Notifications */}
      <AlertToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <DashboardContent />
      </SocketProvider>
    </AuthProvider>
  );
}
