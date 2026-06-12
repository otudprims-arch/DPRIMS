// src/components/layout/Topbar.jsx
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import StatusBadge from '../ui/StatusBadge';

const PAGE_TITLES = {
  '/dashboard': { title: 'الرئيسية', sub: 'نظرة عامة على النظام' },
  '/track': { title: 'خريطة المسار', sub: 'Track Digital Twin' },
  '/cameras': { title: 'الكاميرات', sub: 'Dual Vision Monitoring' },
  '/control': { title: 'التحكم بالقطار', sub: 'Command Center' },
  '/alerts': { title: 'مركز التنبيهات', sub: 'AI Alerts Center' },
  '/faults': { title: 'سجل الأعطال', sub: 'Fault Registry' },
  '/analytics': { title: 'الإحصائيات', sub: 'Operational Intelligence' },
  '/schedule': { title: 'الجدول الزمني', sub: 'Operational Schedule' },
  '/reports': { title: 'التقارير', sub: 'Inspection Sessions' },
  '/settings': { title: 'حالة النظام', sub: 'System Health Center' },
};

export default function Topbar({ onMenuToggle, health }) {
  const location = useLocation();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const page = PAGE_TITLES[location.pathname] || { title: 'DPATIMS', sub: '' };

  const dbOk = health?.database === 'connected';
  const devkitOk = Boolean(health?.realtime?.devkit_connected);
  const pipelineOk = Boolean(health?.realtime?.pipeline_connected);

  return (
    <header className="topbar">
      <div className="topbar-right">
        <button className="menu-btn" onClick={onMenuToggle} aria-label="القائمة">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <div className="topbar-title">
          <h1>{page.title}</h1>
          <p>{page.sub}</p>
        </div>
      </div>

      <div className="topbar-status pro-topbar-status">
        <StatusBadge
          status={`DB ${dbOk ? 'ON' : 'OFF'}`}
          variant={dbOk ? 'success' : 'danger'}
          dot
        />

        <StatusBadge
          status={`DEVKIT ${devkitOk ? 'ON' : 'OFF'}`}
          variant={devkitOk ? 'success' : 'danger'}
          dot
        />

        <StatusBadge
          status={`AI ${pipelineOk ? 'ON' : 'OFF'}`}
          variant={pipelineOk ? 'success' : 'danger'}
          dot
        />

        <span className="topbar-time">
          {time.toLocaleTimeString('ar-EG', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}
        </span>
      </div>
    </header>
  );
}
