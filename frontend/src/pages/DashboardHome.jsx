// src/pages/DashboardHome.jsx
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { useSystemHealth } from '../hooks/useSystemHealth';
import { useTelemetry } from '../hooks/useTelemetry';
import { useAlerts, useAlertStats } from '../hooks/useAlerts';
import { useCurrentSession } from '../hooks/useSessions';

import StatCard from '../components/ui/StatCard';
import SectionHeader from '../components/ui/SectionHeader';
import PanelShell from '../components/ui/PanelShell';
import DataRow from '../components/ui/DataRow';
import StatusBadge from '../components/ui/StatusBadge';
import TrackView from '../components/track/TrackView';
import AlertsTable from '../components/alerts/AlertsTable';
import AlertDetailsModal from '../components/alerts/AlertDetailsModal';

import {
  formatCm,
  formatSpeed,
  formatDateTime,
  severityVariant,
} from '../utils/formatters';

function n(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function getAlertType(alert) {
  return (
    alert?.primary_defect ||
    alert?.defect?.type ||
    alert?.defects?.[0]?.type ||
    alert?.defects?.[0]?.class_name ||
    alert?.type ||
    'unknown'
  );
}

function getSeverity(alert) {
  const severity = alert?.severity || alert?.defect?.severity;
  if (severity) return severity;

  const score = alert?.ssim_anomaly_score ?? alert?.ssim_score ?? 0;
  if (score >= 0.5) return 'critical';
  if (score >= 0.3) return 'medium';
  return 'low';
}

function getPosition(alert) {
  return (
    alert?.defect_position_cm ??
    alert?.track_position_cm ??
    alert?.defect?.track_position_cm ??
    0
  );
}

function MiniHealthCard({ label, ok, value, accent = 'blue' }) {
  return (
    <div className={`mini-health pro-mini-health ${ok ? 'ok' : 'bad'} ${accent}`}>
      <span className="mini-health-dot" />
      <div>
        <strong>{label}</strong>
        <p>{value || (ok ? 'Online' : 'Offline')}</p>
      </div>
    </div>
  );
}

function DashboardAction({ to, title, sub, icon, tone = 'blue' }) {
  return (
    <Link to={to} className={`dashboard-action-card ${tone}`}>
      <span className="dashboard-action-icon">{icon}</span>
      <div>
        <strong>{title}</strong>
        <small>{sub}</small>
      </div>
    </Link>
  );
}

function LatestAlertCard({ alert, onView }) {
  if (!alert) {
    return (
      <div className="dashboard-empty-alert">
        <strong>No active alerts</strong>
        <span>النظام لا يعرض أي تنبيهات حالية</span>
      </div>
    );
  }

  const severity = getSeverity(alert);
  const type = getAlertType(alert);

  return (
    <button className={`latest-alert-pro severity-${severity}`} onClick={() => onView(alert)}>
      <div className="latest-alert-top">
        <div>
          <span>Latest AI Detection</span>
          <strong>{type}</strong>
        </div>

        <StatusBadge status={severity} variant={severityVariant(severity)} />
      </div>

      <div className="latest-alert-grid">
        <div>
          <span>Priority</span>
          <strong>{alert.priority_score ?? '--'}</strong>
        </div>

        <div>
          <span>Repeat</span>
          <strong>{alert.repeat_count ?? 1}</strong>
        </div>

        <div>
          <span>Sleeper</span>
          <strong>{alert.nearest_sleeper || '--'}</strong>
        </div>

        <div>
          <span>Position</span>
          <strong>{formatCm(getPosition(alert))}</strong>
        </div>
      </div>

      <p>{alert.recommendation || 'Review this detection and inspect the affected track section.'}</p>
    </button>
  );
}

function RiskMeter({ score }) {
  const safe = Math.max(0, Math.min(100, Number(score) || 0));
  const variant = safe >= 70 ? 'danger' : safe >= 35 ? 'warning' : 'success';
  const label = safe >= 70 ? 'High Risk' : safe >= 35 ? 'Watch' : 'Stable';

  return (
    <div className={`dashboard-risk-meter ${variant}`}>
      <div
        className="dashboard-risk-ring"
        style={{
          background: `conic-gradient(currentColor ${safe * 3.6}deg, rgba(148,163,184,0.15) 0deg)`,
        }}
      >
        <div>
          <strong>{safe}%</strong>
          <span>{label}</span>
        </div>
      </div>
    </div>
  );
}

export default function DashboardHome() {
  const { health } = useSystemHealth(3000);
  const { telemetry } = useTelemetry(700);
  const { alerts } = useAlerts(10, 2500);
  const { stats } = useAlertStats(4000);
  const { session } = useCurrentSession(3000);
  const [selectedAlert, setSelectedAlert] = useState(null);

  const realtime = health?.realtime || {};
  const telemetryInfo = health?.telemetry || {};

  const safeAlerts = Array.isArray(alerts) ? alerts : [];

  const pos =
    telemetry?.track_position_cm ??
    telemetry?.official_position_cm ??
    telemetry?.pos ??
    0;

  const speed = telemetry?.speed_cm_s ?? 0;
  const rpm = telemetry?.speed_rpm ?? 0;
  const rssi = telemetry?.wifi_rssi ?? '--';
  const running = Boolean(telemetry?.running);
  const direction = telemetry?.direction || 'stop';

  const zone = telemetry?.track_zone || '--';
  const nearestSleeper = telemetry?.nearest_sleeper || '--';
  const progress = telemetry?.track_progress_pct ?? 0;
  const autoState = telemetry?.auto_state || 'off';
  const lapCount = telemetry?.lap_count ?? 0;

  const devkitOk =
    Boolean(realtime.devkit_connected) ||
    Boolean(realtime.devkitConnected) ||
    Boolean(health?.devkit?.connected);

  const pipelineOk =
    Boolean(realtime.pipeline_connected) ||
    Boolean(realtime.pipelineConnected) ||
    Boolean(health?.pipeline?.connected);

  const dbOk = health?.database === 'connected';
  const backendOk = health?.status === 'ok';

  const latestAlert = safeAlerts[0];

  const computed = useMemo(() => {
    const critical = safeAlerts.filter((a) => getSeverity(a) === 'critical').length;
    const medium = safeAlerts.filter((a) => ['medium', 'warning'].includes(getSeverity(a))).length;
    const open = safeAlerts.filter(
      (a) => !['resolved', 'closed', 'false_positive'].includes(a?.status)
    ).length;

    const total =
      stats?.total ??
      stats?.pagination?.total ??
      safeAlerts.length;

    const openAlerts = stats?.open ?? open;
    const criticalAlerts = stats?.severityCounts?.critical ?? critical;

    const riskScore = Math.min(
      100,
      Math.round(
        criticalAlerts * 18 +
        medium * 6 +
        openAlerts * 2 +
        (!devkitOk ? 18 : 0) +
        (!pipelineOk ? 15 : 0)
      )
    );

    return {
      totalAlerts: total,
      openAlerts,
      criticalAlerts,
      mediumAlerts: medium,
      riskScore,
    };
  }, [safeAlerts, stats, devkitOk, pipelineOk]);

  const systemReady = backendOk && dbOk && devkitOk && pipelineOk;

  return (
    <div className="page-stack dashboard-pro-page">
      <section className={`hero-dashboard pro-dashboard-hero ${systemReady ? 'online' : 'warning'}`}>
        <div className="hero-copy">
          <span className="hero-kicker">DPRIMS LIVE COMMAND CENTER</span>
          <h2>منصة فحص ذكية تجمع القطار والكاميرات والـ AI والصيانة في لوحة واحدة</h2>
          <p>
            متابعة لحظية لحركة القطار، صحة النظام، التنبيهات الحرجة، الجلسة الحالية، وخريطة المسار الرقمية.
          </p>

          <div className="dashboard-hero-tags">
            <span>Zone: {zone}</span>
            <span>Sleeper: {nearestSleeper}</span>
            <span>Auto: {autoState}</span>
            <span>Lap: {lapCount}</span>
          </div>

          <div className="dashboard-quick-actions">
            <DashboardAction
              to="/control"
              title="Control"
              sub="Train commands"
              tone="amber"
              icon="⚡"
            />
            <DashboardAction
              to="/track"
              title="Track"
              sub="Digital twin"
              tone="blue"
              icon="🛤️"
            />
            <DashboardAction
              to="/alerts"
              title="Alerts"
              sub="AI detections"
              tone="red"
              icon="🚨"
            />
            <DashboardAction
              to="/faults"
              title="Faults"
              sub="Maintenance"
              tone="green"
              icon="🛠️"
            />
          </div>
        </div>

        <div className="dashboard-hero-side">
          <RiskMeter score={computed.riskScore} />

          <div className="hero-status-grid pro-hero-status">
            <MiniHealthCard
              label="Backend"
              ok={backendOk}
              value={health?.status || '--'}
              accent="blue"
            />
            <MiniHealthCard
              label="Database"
              ok={dbOk}
              value={health?.database || '--'}
              accent="green"
            />
            <MiniHealthCard
              label="DevKit"
              ok={devkitOk}
              value={devkitOk ? 'Connected' : 'Disconnected'}
              accent="amber"
            />
            <MiniHealthCard
              label="AI Pipeline"
              ok={pipelineOk}
              value={pipelineOk ? 'Connected' : 'Disconnected'}
              accent="purple"
            />
          </div>
        </div>
      </section>

      <div className="grid-4">
        <StatCard
          label="حالة القطار"
          value={running ? 'يعمل' : 'متوقف'}
          color={running ? 'green' : 'amber'}
          subtitle={direction}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {running ? (
                <polygon points="5 3 19 12 5 21 5 3" />
              ) : (
                <rect x="6" y="6" width="12" height="12" rx="2" />
              )}
            </svg>
          }
        />

        <StatCard
          label="الموقع الحالي"
          value={formatCm(pos)}
          color="blue"
          subtitle={`${Number(progress).toFixed(1)}% progress`}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          }
        />

        <StatCard
          label="التنبيهات المفتوحة"
          value={computed.openAlerts}
          color={computed.criticalAlerts > 0 ? 'red' : 'yellow'}
          subtitle={
            computed.criticalAlerts > 0
              ? `${computed.criticalAlerts} Critical`
              : `${computed.totalAlerts} Total`
          }
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 01-3.46 0" />
            </svg>
          }
        />

        <StatCard
          label="جلسة الفحص"
          value={session ? (session.status === 'running' ? 'Running' : 'Completed') : 'No Session'}
          color={session?.status === 'running' ? 'green' : 'teal'}
          subtitle={session?.session_id || '--'}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          }
        />
      </div>

      <div className="dashboard-main-grid">
        <PanelShell
          title="خريطة المسار المباشرة"
          subtitle="Live Digital Twin Overview"
          headerRight={
            <StatusBadge
              status={running ? 'TRAIN ACTIVE' : 'TRAIN IDLE'}
              variant={running ? 'success' : 'neutral'}
              dot
            />
          }
        >
          <TrackView trackPosCm={pos} defects={safeAlerts} />
        </PanelShell>

        <div className="dashboard-side-stack">
          <PanelShell
            title="Latest Alert"
            headerRight={
              latestAlert ? (
                <StatusBadge
                  status={getSeverity(latestAlert)}
                  variant={severityVariant(getSeverity(latestAlert))}
                />
              ) : (
                <StatusBadge status="CLEAR" variant="success" />
              )
            }
          >
            <LatestAlertCard alert={latestAlert} onView={setSelectedAlert} />
          </PanelShell>

          <PanelShell
            title="Live Telemetry"
            headerRight={<StatusBadge status="LIVE" variant="success" dot />}
          >
            <DataRow label="Position" value={formatCm(pos)} />
            <DataRow label="Speed" value={formatSpeed(speed)} />
            <DataRow label="RPM" value={rpm} />
            <DataRow label="Direction" value={direction} />
            <DataRow label="Zone" value={zone} />
            <DataRow label="Nearest Sleeper" value={nearestSleeper} />
            <DataRow label="WiFi RSSI" value={`${rssi} dBm`} />
            <DataRow
              label="Telemetry Count"
              value={telemetryInfo?.received_count ?? '--'}
            />
          </PanelShell>
        </div>
      </div>

      <div className="grid-2">
        <PanelShell
          title="Active Inspection Session"
          headerRight={
            <StatusBadge
              status={session?.status || 'No Session'}
              variant={session?.status === 'running' ? 'success' : 'neutral'}
              dot={session?.status === 'running'}
            />
          }
        >
          <DataRow label="Session ID" value={session?.session_id || '--'} />
          <DataRow label="Started At" value={formatDateTime(session?.started_at)} />
          <DataRow label="Alerts" value={session?.alerts_count ?? 0} />
          <DataRow label="Critical" value={session?.critical_count ?? 0} />
          <DataRow label="Distance" value={formatCm(session?.total_distance_cm ?? 0)} />
        </PanelShell>

        <PanelShell
          title="آخر التنبيهات"
          headerRight={<StatusBadge status={`${safeAlerts.length} items`} variant="info" />}
        >
          <AlertsTable alerts={safeAlerts} onView={setSelectedAlert} compact />
        </PanelShell>
      </div>

      <AlertDetailsModal
        alert={selectedAlert}
        onClose={() => setSelectedAlert(null)}
      />
    </div>
  );
}