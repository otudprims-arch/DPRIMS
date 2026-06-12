// src/components/layout/Sidebar.jsx
import { NavLink } from 'react-router-dom'
import { useEffect } from 'react'

const NAV = [
  { to: '/dashboard', label: 'الرئيسية', sub: 'Overview', icon: 'home' },
  { to: '/track', label: 'خريطة المسار', sub: 'Digital Twin', icon: 'track' },
  { to: '/cameras', label: 'الكاميرات', sub: 'Live Vision', icon: 'camera' },
  { to: '/control', label: 'التحكم', sub: 'Command Center', icon: 'control' },
  { to: '/faults', label: 'سجل الأعطال', icon: 'wrench' },
  { to: '/alerts', label: 'التنبيهات', sub: 'AI Alerts', icon: 'bell' },
  { to: '/analytics', label: 'الإحصائيات', sub: 'Insights', icon: 'chart' },
  { to: '/reports', label: 'التقارير', sub: 'Sessions', icon: 'doc' },
  { to: '/settings', label: 'حالة النظام', sub: 'Health', icon: 'gear' },
]

function Icon({ name, ...props }) {
  const paths = {
    home: <><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/></>,
    track: <><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></>,
    camera: <><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></>,
    control: <><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></>,
   wrench: (
  <>
    <path d="M14.7 6.3a4 4 0 00-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 005.4-5.4l-2.8 2.8-2.1-2.1 2.8-2.8z" />
  </>
),
    bell: <><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></>,
    chart: <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
    doc: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>,
    gear: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></>,
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      {paths[name]}
    </svg>
  )
}

export default function Sidebar({ open, onClose, isConnected }) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <aside className={`sidebar pro-sidebar ${open ? 'open' : ''}`}>
      <div className="sidebar-brand pro-brand">
        <div className="brand-mark">
          <span>D</span>
        </div>

        <div>
          <h2>DPATIMS</h2>
          <p>AI Rail Inspection System</p>
        </div>
      </div>

      <div className="sidebar-system-card">
        <div>
          <span className={`conn-dot ${isConnected ? 'on' : 'off'}`} />
          <strong>{isConnected ? 'System Online' : 'System Offline'}</strong>
        </div>
        <p>ESP32 • YOLOv8 • MongoDB</p>
      </div>

      <nav className="sidebar-nav pro-nav">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `sidebar-item pro-sidebar-item ${isActive ? 'active' : ''}`}
            onClick={onClose}
            end={item.to === '/dashboard'}
          >
            <Icon name={item.icon} />
            <span>
              <strong>{item.label}</strong>
              <small>{item.sub}</small>
            </span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer pro-sidebar-footer">
        <div>
          <span>Project</span>
          <strong>Graduation Demo</strong>
        </div>
        <p>Backend + AI + IoT + Dashboard</p>
      </div>
    </aside>
  )
}
