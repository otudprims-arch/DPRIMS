// src/pages/TrackPage.jsx
import { useMemo, useState } from 'react';

import { useTelemetry } from '../hooks/useTelemetry';
import { useAlerts } from '../hooks/useAlerts';
import { useFaults } from '../hooks/useFaults';

import SectionHeader from '../components/ui/SectionHeader';
import StatCard from '../components/ui/StatCard';
import PanelShell from '../components/ui/PanelShell';
import DataRow from '../components/ui/DataRow';
import StatusBadge from '../components/ui/StatusBadge';

import TrackView from '../components/track/TrackView';
import AlertsTable from '../components/alerts/AlertsTable';
import AlertDetailsModal from '../components/alerts/AlertDetailsModal';

function n(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function formatCm(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '--';
  return `${num.toFixed(1)} cm`;
}

function pct(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '--';
  if (num <= 1) return `${(num * 100).toFixed(1)}%`;
  return `${num.toFixed(1)}%`;
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

function getAlertPosition(alert) {
  return (
    alert?.defect_position_cm ??
    alert?.track_position_cm ??
    alert?.defect?.defect_position_cm ??
    alert?.defect?.track_position_cm ??
    0
  );
}

function getSeverity(item) {
  const severity = item?.severity || item?.defect?.severity;
  if (severity) return severity;

  const score = item?.ssim_anomaly_score ?? item?.ssim_score;
  if (score > 0.5) return 'critical';
  if (score > 0.3) return 'medium';

  return 'low';
}

function getCamera(item) {
  return item?.defect_camera || item?.camera || item?.defect?.camera || '--';
}

function severityVariant(severity) {
  if (severity === 'critical' || severity === 'high') return 'danger';
  if (severity === 'medium' || severity === 'warning') return 'warning';
  if (severity === 'low') return 'neutral';
  return 'info';
}

function normalizeAlertForTrack(alert) {
  const pos = n(getAlertPosition(alert));
  const type = getAlertType(alert);
  const severity = getSeverity(alert);
  const camera = getCamera(alert);

  return {
    ...alert,
    _source: 'alert',
    _sourceLabel: 'AI Alert',
    _position: pos,
    _type: type,
    _severity: severity,
    _camera: camera,

    // TrackView compatibility
    primary_defect: type,
    defect_position_cm: pos,
    track_position_cm: pos,
    defect_camera: camera,
    camera,
    severity,
    confidence: alert?.confidence ?? alert?.defect?.confidence ?? 0,
    nearest_sleeper: alert?.nearest_sleeper || alert?.defect?.nearest_sleeper || null,
    track_zone: alert?.track_zone || alert?.defect?.track_zone || 'Unknown',
  };
}

function normalizeFaultForTrack(fault) {
  const pos = n(
    fault?.defect_position_cm ??
      fault?.track_position_cm ??
      fault?.alert_ref?.defect_position_cm ??
      fault?.alert_ref?.track_position_cm
  );

  const type =
    fault?.defect_type ||
    fault?.primary_defect ||
    fault?.alert_ref?.primary_defect ||
    fault?.alert_ref?.defect?.type ||
    'fault';

  const severity = fault?.severity || fault?.alert_ref?.severity || 'medium';
  const camera = fault?.camera || fault?.alert_ref?.defect_camera || '--';

  return {
    ...fault,
    _source: 'fault',
    _sourceLabel: 'Confirmed Fault',
    _position: pos,
    _type: type,
    _severity: severity,
    _camera: camera,

    // TrackView compatibility
    event_id: fault?.fault_id || fault?._id,
    primary_defect: type,
    defect_position_cm: pos,
    track_position_cm: pos,
    defect_camera: camera,
    camera,
    severity,
    confidence: fault?.confidence ?? fault?.alert_ref?.confidence ?? 0,
    priority_score: fault?.priority_score ?? fault?.alert_ref?.priority_score ?? 0,
    repeat_count: fault?.repeat_count ?? 1,
    nearest_sleeper:
      fault?.nearest_sleeper ||
      fault?.alert_ref?.nearest_sleeper ||
      null,
    track_zone:
      fault?.track_zone ||
      fault?.alert_ref?.track_zone ||
      'Unknown',
    recommendation:
      fault?.recommendation ||
      fault?.alert_ref?.recommendation ||
      'Confirmed maintenance fault.',
    defect: {
      type,
      severity,
      confidence: fault?.confidence ?? 0,
      camera,
      track_position_cm: pos,
      defect_position_cm: pos,
      nearest_sleeper: fault?.nearest_sleeper || null,
      track_zone: fault?.track_zone || 'Unknown',
    },
  };
}

function isOpenAlert(alert) {
  return !['resolved', 'closed', 'false_positive', 'ignored'].includes(alert?.status);
}

function isOpenFault(fault) {
  return !['closed', 'rejected'].includes(fault?.status);
}

export default function TrackPage() {
  const { telemetry } = useTelemetry(500);

  const { alerts, loading: alertsLoading } = useAlerts(
    {
      limit: 100,
    },
    2500
  );

  const { faults, loading: faultsLoading, reload: reloadFaults } = useFaults(
    {
      limit: 100,
    },
    3500
  );

  const [selectedItem, setSelectedItem] = useState(null);
  const [trackLayer, setTrackLayer] = useState('alerts');

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
  const lapCount = telemetry?.lap_count ?? 0;
  const autoState = telemetry?.auto_state || 'off';

  const frontWheel = telemetry?.front_wheel_cm ?? null;
  const rearWheel = telemetry?.rear_wheel_cm ?? null;
  const railJointDistance = telemetry?.rail_joint_distance_cm ?? null;
  const isOnRailJoint = Boolean(telemetry?.is_on_rail_joint);

  const safeAlerts = Array.isArray(alerts) ? alerts : [];
  const safeFaults = Array.isArray(faults) ? faults : [];

  const alertTrackItems = useMemo(() => {
    return safeAlerts
      .filter(isOpenAlert)
      .map(normalizeAlertForTrack)
      .filter((item) => item._position >= 0 && item._position <= 304);
  }, [safeAlerts]);

  const faultTrackItems = useMemo(() => {
    return safeFaults
      .filter(isOpenFault)
      .map(normalizeFaultForTrack)
      .filter((item) => item._position >= 0 && item._position <= 304);
  }, [safeFaults]);

  const trackItems = useMemo(() => {
    let items = [];

    if (trackLayer === 'alerts') items = alertTrackItems;
    if (trackLayer === 'faults') items = faultTrackItems;
    if (trackLayer === 'all') items = [...faultTrackItems, ...alertTrackItems];
    if (trackLayer === 'none') items = [];

    return items
      .map((item) => ({
        ...item,
        _position: n(item._position),
      }))
      .sort((a, b) => {
        const ap = n(a.priority_score);
        const bp = n(b.priority_score);
        if (bp !== ap) return bp - ap;
        return b._position - a._position;
      });
  }, [trackLayer, alertTrackItems, faultTrackItems]);

  const stats = useMemo(() => {
    const critical = trackItems.filter((a) => a._severity === 'critical').length;
    const high = trackItems.filter((a) => a._severity === 'high').length;
    const medium = trackItems.filter(
      (a) => a._severity === 'medium' || a._severity === 'warning'
    ).length;

    const sleepers = new Set(
      trackItems
        .map((a) => a.nearest_sleeper)
        .filter(Boolean)
    );

    const cameras = trackItems.reduce(
      (acc, a) => {
        if (a._camera === 'front') acc.front += 1;
        else if (a._camera === 'rear') acc.rear += 1;
        else acc.unknown += 1;
        return acc;
      },
      { front: 0, rear: 0, unknown: 0 }
    );

    return {
      total: trackItems.length,
      alerts: alertTrackItems.length,
      faults: faultTrackItems.length,
      critical,
      high,
      medium,
      affectedSleepers: sleepers.size,
      cameras,
    };
  }, [trackItems, alertTrackItems, faultTrackItems]);

  const recentMapItems = trackItems.slice(0, 10);

  function refreshAll() {
    reloadFaults?.();
  }

  const loading = alertsLoading || faultsLoading;

  return (
    <div className="page-stack">
      <SectionHeader
        title="خريطة المسار"
        subtitle="Track Digital Twin"
        action={
          <StatusBadge
            status={running ? 'TRAIN MOVING' : 'TRAIN IDLE'}
            variant={running ? 'success' : 'neutral'}
            dot
          />
        }
      />

      <section className="command-hero online track-layer-hero">
        <div>
          <span className="hero-kicker">TRACK DIGITAL TWIN</span>
          <h2>تمثيل مباشر لحركة القطار ومواقع التنبيهات والأعطال على المسار</h2>
          <p>
            اختار من الأزرار هل تريد عرض تنبيهات الذكاء الاصطناعي، الأعطال المؤكدة، أو كل العلامات على التراك.
          </p>

          <div className="track-layer-tabs">
            <button
              className={trackLayer === 'alerts' ? 'active amber' : ''}
              onClick={() => setTrackLayer('alerts')}
            >
              <strong>AI Alerts</strong>
              <span>{stats.alerts} تنبيه</span>
            </button>

            <button
              className={trackLayer === 'faults' ? 'active red' : ''}
              onClick={() => setTrackLayer('faults')}
            >
              <strong>Confirmed Faults</strong>
              <span>{stats.faults} عطل</span>
            </button>

            <button
              className={trackLayer === 'all' ? 'active blue' : ''}
              onClick={() => setTrackLayer('all')}
            >
              <strong>Show All</strong>
              <span>{stats.alerts + stats.faults} علامة</span>
            </button>

            <button
              className={trackLayer === 'none' ? 'active neutral' : ''}
              onClick={() => setTrackLayer('none')}
            >
              <strong>Hide Marks</strong>
              <span>خريطة فقط</span>
            </button>
          </div>
        </div>

        <div className="command-hero-card">
          <strong>{Number(progress).toFixed(1)}%</strong>
          <span>Track Progress</span>
          <StatusBadge status={zone} variant="info" />
        </div>
      </section>

      <div className="grid-4">
        <StatCard
          label="الموقع الحالي"
          value={formatCm(pos)}
          color="blue"
          subtitle={`Sleeper ${nearestSleeper}`}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          }
        />

        <StatCard
          label="العلامات على التراك"
          value={stats.total}
          color={stats.critical || stats.high ? 'red' : 'amber'}
          subtitle={`${stats.critical} critical / ${stats.high} high`}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          }
        />

        <StatCard
          label="السليبرز المتأثرة"
          value={stats.affectedSleepers}
          color="teal"
          subtitle="Affected Sleepers"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 7h16" />
              <path d="M4 12h16" />
              <path d="M4 17h16" />
            </svg>
          }
        />

        <StatCard
          label="Auto Mode"
          value={String(autoState).toUpperCase()}
          color={autoState !== 'off' ? 'green' : 'yellow'}
          subtitle={`Lap ${lapCount}`}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0114.13-3.36L23 10" />
              <path d="M20.49 15a9 9 0 01-14.13 3.36L1 14" />
            </svg>
          }
        />
      </div>

      <PanelShell
        title="خريطة المسار الذكية"
        subtitle={
          trackLayer === 'alerts'
            ? 'Showing AI alerts on track'
            : trackLayer === 'faults'
              ? 'Showing confirmed maintenance faults'
              : trackLayer === 'all'
                ? 'Showing alerts and confirmed faults'
                : 'Markers hidden'
        }
        headerRight={
          <StatusBadge
            status={loading ? 'LOADING' : `${trackItems.length} MARKS`}
            variant={stats.critical || stats.high ? 'danger' : 'info'}
            dot
          />
        }
      >
        <TrackView
          trackPosCm={pos}
          defects={trackItems}
          showDetails
        />
      </PanelShell>

      <div className="grid-2">
        <PanelShell
          title="معلومات الحركة"
          subtitle="Train Position & Encoder Data"
          headerRight={
            <StatusBadge
              status={running ? 'LIVE' : 'IDLE'}
              variant={running ? 'success' : 'neutral'}
              dot
            />
          }
        >
          <DataRow label="Position" value={formatCm(pos)} />
          <DataRow label="Progress" value={`${Number(progress).toFixed(1)}%`} />
          <DataRow label="Speed" value={`${Number(speed).toFixed(1)} cm/s`} />
          <DataRow label="RPM" value={rpm} />
          <DataRow label="Direction" value={direction} />
          <DataRow label="Zone" value={zone} />
          <DataRow label="Nearest Sleeper" value={nearestSleeper} />
          <DataRow
            label="Front Wheel"
            value={frontWheel != null ? formatCm(frontWheel) : '--'}
          />
          <DataRow
            label="Rear Wheel"
            value={rearWheel != null ? formatCm(rearWheel) : '--'}
          />
          <DataRow
            label="Rail Joint"
            value={
              isOnRailJoint
                ? <StatusBadge status="ON RAIL JOINT" variant="warning" />
                : railJointDistance != null
                  ? `${Number(railJointDistance).toFixed(1)} cm away`
                  : '--'
            }
          />
          <DataRow label="WiFi RSSI" value={`${rssi} dBm`} />
        </PanelShell>

        <PanelShell
          title={
            trackLayer === 'faults'
              ? 'أحدث الأعطال المؤكدة'
              : trackLayer === 'alerts'
                ? 'أحدث تنبيهات الذكاء الاصطناعي'
                : 'أحدث العلامات على الخريطة'
          }
          subtitle="Latest positioned items"
          headerRight={
            <StatusBadge
              status={`${recentMapItems.length} latest`}
              variant="info"
            />
          }
        >
          {recentMapItems.length ? (
            <div className="track-alert-list">
              {recentMapItems.map((item) => (
                <button
                  key={`${item._source}-${item._id || item.event_id || item.fault_id}`}
                  className={`track-alert-item severity-${item._severity} source-${item._source}`}
                  onClick={() => setSelectedItem(item)}
                >
                  <div>
                    <strong>{item._type}</strong>
                    <span>
                      {item._sourceLabel} • {item.nearest_sleeper || '--'} • {formatCm(item._position)} • {item._camera}
                    </span>
                  </div>

                  <StatusBadge
                    status={item._severity}
                    variant={severityVariant(item._severity)}
                  />
                </button>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              لا توجد علامات ظاهرة على الخريطة حسب وضع العرض الحالي
            </div>
          )}
        </PanelShell>
      </div>

      <PanelShell
        title={
          trackLayer === 'faults'
            ? 'قائمة الأعطال المؤكدة على الخريطة'
            : trackLayer === 'alerts'
              ? 'قائمة تنبيهات الخريطة'
              : 'قائمة العلامات المعروضة'
        }
        subtitle={`${trackItems.length} positioned items`}
        headerRight={
          <button className="table-view-btn" onClick={refreshAll}>
            Refresh
          </button>
        }
      >
        {trackItems.length ? (
          <div className="track-items-table-wrap">
            <table className="track-items-table">
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Type</th>
                  <th>Severity</th>
                  <th>Camera</th>
                  <th>Sleeper</th>
                  <th>Zone</th>
                  <th>Position</th>
                  <th>Confidence</th>
                  <th>Priority</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {trackItems.slice(0, 40).map((item) => (
                  <tr key={`${item._source}-row-${item._id || item.event_id || item.fault_id}`}>
                    <td>
                      <span className={`source-pill ${item._source}`}>
                        {item._source === 'fault' ? 'FAULT' : 'ALERT'}
                      </span>
                    </td>
                    <td>{item._type}</td>
                    <td>
                      <StatusBadge
                        status={item._severity}
                        variant={severityVariant(item._severity)}
                      />
                    </td>
                    <td>{item._camera}</td>
                    <td>{item.nearest_sleeper || '--'}</td>
                    <td>{item.track_zone || '--'}</td>
                    <td>{formatCm(item._position)}</td>
                    <td>{pct(item.confidence)}</td>
                    <td>{item.priority_score ?? '--'}</td>
                    <td>
                      <button
                        className="table-view-btn"
                        onClick={() => setSelectedItem(item)}
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="alerts-empty">
            <strong>No positioned items</strong>
            <span>لا توجد تنبيهات أو أعطال ظاهرة على الخريطة حاليًا</span>
          </div>
        )}
      </PanelShell>

      <AlertDetailsModal
        alert={selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  );
}
