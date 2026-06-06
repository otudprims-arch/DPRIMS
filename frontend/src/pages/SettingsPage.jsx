// src/pages/SettingsPage.jsx
import SectionHeader from '../components/ui/SectionHeader';
import PanelShell from '../components/ui/PanelShell';
import StatusBadge from '../components/ui/StatusBadge';
import DataRow from '../components/ui/DataRow';
import StatCard from '../components/ui/StatCard';

import { useSystemHealth } from '../hooks/useSystemHealth';
import { useSystemTimeline } from '../hooks/useSystemTimeline';

import { formatDateTime } from '../utils/formatters';

function ServiceRow({ label, connected, details }) {
  return (
    <div className={`service-row ${connected ? 'ok' : 'bad'}`}>
      <div>
        <span className="service-dot" />
        <strong>{label}</strong>
      </div>
      <span>{details}</span>
    </div>
  );
}

export default function SettingsPage() {
  const { health } = useSystemHealth(2500);
  const { events } = useSystemTimeline(30, 4000);

  const realtime = health?.realtime || {};
  const telemetry = health?.telemetry || {};
  const alerts = health?.alerts || {};
  const pipeline = health?.pipeline || {};
  const devkit = health?.devkit || {};

  const dbConnected = health?.database === 'connected';
  const backendOk = health?.status === 'ok';
  const devkitOk = Boolean(realtime.devkit_connected);
  const pipelineOk = Boolean(realtime.pipeline_connected);

  return (
    <div className="page-stack">
      <SectionHeader
        title="حالة النظام"
        subtitle="System Health & Runtime Diagnostics"
        action={
          <StatusBadge
            status={backendOk ? 'SYSTEM ONLINE' : 'SYSTEM CHECK'}
            variant={backendOk ? 'success' : 'danger'}
            dot
          />
        }
      />

      <section className="system-health-hero">
        <div>
          <span className="hero-kicker">DPRIMS SYSTEM CENTER</span>
          <h2>مراقبة حالة الخدمات والاتصالات في الزمن الحقيقي</h2>
          <p>
            هذه الصفحة تعرض حالة الباك إند، قاعدة البيانات، DevKit، Python AI Pipeline، وآخر الأحداث التشغيلية.
          </p>
        </div>

        <div className="system-health-score">
          <strong>
            {[backendOk, dbConnected, devkitOk, pipelineOk].filter(Boolean).length}/4
          </strong>
          <span>Services Online</span>
        </div>
      </section>

      <div className="grid-4">
        <StatCard
          label="Backend"
          value={backendOk ? 'Online' : 'Offline'}
          color={backendOk ? 'green' : 'red'}
          subtitle={`Uptime ${Math.floor(health?.uptime || 0)}s`}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          }
        />

        <StatCard
          label="Database"
          value={health?.database || '--'}
          color={dbConnected ? 'green' : 'red'}
          subtitle="MongoDB"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <ellipse cx="12" cy="5" rx="9" ry="3" />
              <path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5" />
              <path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3" />
            </svg>
          }
        />

        <StatCard
          label="DevKit"
          value={devkitOk ? 'Connected' : 'Offline'}
          color={devkitOk ? 'green' : 'red'}
          subtitle={devkit.remoteAddress || '--'}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="4" y="4" width="16" height="16" rx="2" />
              <rect x="9" y="9" width="6" height="6" />
              <line x1="9" y1="1" x2="9" y2="4" />
              <line x1="15" y1="1" x2="15" y2="4" />
            </svg>
          }
        />

        <StatCard
          label="AI Pipeline"
          value={pipelineOk ? 'Connected' : 'Offline'}
          color={pipelineOk ? 'green' : 'red'}
          subtitle={pipeline.remoteAddress || '--'}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2a5 5 0 015 5v2a5 5 0 01-10 0V7a5 5 0 015-5z" />
              <path d="M5 10v2a7 7 0 0014 0v-2" />
              <line x1="12" y1="19" x2="12" y2="22" />
            </svg>
          }
        />
      </div>

      <div className="grid-2">
        <PanelShell title="Realtime Connections">
          <ServiceRow
            label="Backend API"
            connected={backendOk}
            details={health?.service || 'dprims-backend'}
          />
          <ServiceRow
            label="MongoDB"
            connected={dbConnected}
            details={health?.database || '--'}
          />
          <ServiceRow
            label="ESP32 DevKit"
            connected={devkitOk}
            details={devkit.connectedAt ? `Since ${formatDateTime(devkit.connectedAt)}` : 'Disconnected'}
          />
          <ServiceRow
            label="Python AI Pipeline"
            connected={pipelineOk}
            details={pipeline.connectedAt ? `Since ${formatDateTime(pipeline.connectedAt)}` : 'Disconnected'}
          />
        </PanelShell>

        <PanelShell title="Runtime Counters">
          <DataRow label="Telemetry Received" value={telemetry.received_count ?? 0} />
          <DataRow label="Telemetry Updated" value={formatDateTime(telemetry.updated_at)} />
          <DataRow label="Alerts Received" value={alerts.received_count ?? 0} />
          <DataRow label="Alerts Updated" value={formatDateTime(alerts.updated_at)} />
          <DataRow label="Dashboard Clients" value={realtime.dashboard_clients ?? 0} />
          <DataRow label="Server Time" value={formatDateTime(health?.time)} />
        </PanelShell>
      </div>

      <PanelShell
        title="System Timeline"
        headerRight={<StatusBadge status={`${events.length} events`} variant="info" />}
      >
        {events.length ? (
          <div className="system-timeline-list">
            {events.map((event) => (
              <div key={event._id} className="system-event-item">
                <span className={`system-event-dot ${event.level || 'info'}`} />
                <div>
                  <strong>{event.type || 'system_event'}</strong>
                  <p>{event.message || event.description || '--'}</p>
                </div>
                <time>{formatDateTime(event.createdAt)}</time>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">لا توجد أحداث نظام مسجلة حتى الآن</div>
        )}
      </PanelShell>
    </div>
  );
}