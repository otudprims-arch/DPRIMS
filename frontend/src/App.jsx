// src/App.jsx
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useState } from 'react'
import { useSystemHealth } from './hooks/useSystemHealth'

import Sidebar from './components/layout/Sidebar'
import Topbar from './components/layout/Topbar'

import DashboardHome from './pages/DashboardHome'
import TrackPage from './pages/TrackPage'
import CamerasPage from './pages/CamerasPage'
import ControlPage from './pages/ControlPage'
import AlertsPage from './pages/AlertsPage'
import AnalyticsPage from './pages/AnalyticsPage'
import ReportsPage from './pages/ReportsPage'
import SettingsPage from './pages/SettingsPage'
import FaultsPage from './pages/FaultsPage'
import './App.css'

function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { health } = useSystemHealth(3000)

  const isConnected =
    health?.status === 'ok' &&
    health?.database === 'connected'

  return (
    <div className="dash-layout">
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isConnected={isConnected}
      />

      <div className="dash-main">
        <Topbar
          onMenuToggle={() => setSidebarOpen(true)}
          health={health}
        />

        <main className="dash-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route path="/dashboard" element={<DashboardHome />} />
        <Route path="/track" element={<TrackPage />} />
        <Route path="/cameras" element={<CamerasPage />} />
        <Route path="/control" element={<ControlPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
       <Route path="/faults" element={<FaultsPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  )
}