// src/components/alerts/AlertsTable.jsx
import StatusBadge from '../ui/StatusBadge';

function pct(value) {
  if (typeof value !== 'number') return '--';
  if (value <= 1) return `${(value * 100).toFixed(1)}%`;
  return `${value.toFixed(1)}%`;
}

function fmtDate(value) {
  if (!value) return '--';

  try {
    return new Date(value).toLocaleString('ar-EG', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return '--';
  }
}

function fmtCm(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '--';
  return `${n.toFixed(1)} cm`;
}

function shortText(value, len = 18) {
  if (!value) return '--';
  const s = String(value);
  return s.length > len ? `${s.slice(0, len)}...` : s;
}

function getDefect(alert) {
  return alert?.defect || alert?.defects?.[0] || {};
}

function getType(alert) {
  const defect = getDefect(alert);

  return (
    alert?.primary_defect ||
    defect?.type ||
    defect?.class_name ||
    alert?.type ||
    'unknown'
  );
}

function getCamera(alert) {
  const defect = getDefect(alert);

  return (
    alert?.defect_camera ||
    alert?.camera ||
    defect?.camera ||
    '--'
  );
}

function getConfidence(alert) {
  const defect = getDefect(alert);

  if (typeof alert?.confidence === 'number') return alert.confidence;
  if (typeof defect?.confidence === 'number') return defect.confidence;

  return null;
}

function getPosition(alert) {
  const defect = getDefect(alert);

  return (
    alert?.defect_position_cm ??
    alert?.track_position_cm ??
    defect?.defect_position_cm ??
    defect?.track_position_cm ??
    null
  );
}

function getSeverity(alert) {
  const defect = getDefect(alert);

  return (
    alert?.severity ||
    defect?.severity ||
    'low'
  );
}

function severityVariant(severity) {
  if (severity === 'critical' || severity === 'high') return 'danger';
  if (severity === 'medium' || severity === 'warning') return 'warning';
  if (severity === 'low') return 'neutral';
  return 'info';
}

function statusVariant(status) {
  if (status === 'resolved') return 'success';
  if (status === 'false_positive') return 'danger';
  if (status === 'under_review') return 'warning';
  if (status === 'new') return 'info';
  return 'neutral';
}

export default function AlertsTable({
  alerts = [],
  onView,
  compact = false,
}) {
  if (!alerts.length) {
    return (
      <div className="alerts-empty">
        <strong>No alerts yet</strong>
        <span>لا توجد تنبيهات حاليًا</span>
      </div>
    );
  }

  return (
    <div className={`alerts-table-wrap ${compact ? 'compact' : ''}`}>
      <table className="alerts-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Defect</th>
            <th>Severity</th>
            {!compact && <th>Status</th>}
            {!compact && <th>Camera</th>}
            {!compact && <th>Sleeper</th>}
            {!compact && <th>Zone</th>}
            <th>Position</th>
            {!compact && <th>Confidence</th>}
            {!compact && <th>Repeat</th>}
            {!compact && <th>Signature</th>}
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {alerts.map((alert) => {
            const defect = getDefect(alert);
            const type = getType(alert);
            const severity = getSeverity(alert);
            const status = alert?.status || 'new';
            const camera = getCamera(alert);
            const confidence = getConfidence(alert);
            const position = getPosition(alert);

            const signature =
              alert?.detection_signature ||
              defect?.detection_signature ||
              '';

            return (
              <tr key={alert._id || alert.event_id}>
                <td className="mono-cell">
                  {fmtDate(alert.createdAt || alert.first_seen_at)}
                </td>

                <td>
                  <div className="alert-defect-cell">
                    <strong>{type}</strong>
                    <span>{alert.event_id || shortText(alert._id)}</span>
                  </div>
                </td>

                <td>
                  <StatusBadge
                    status={severity}
                    variant={severityVariant(severity)}
                  />
                </td>

                {!compact && (
                  <td>
                    <StatusBadge
                      status={status}
                      variant={statusVariant(status)}
                    />
                  </td>
                )}

                {!compact && <td>{camera}</td>}

                {!compact && (
                  <td>
                    {alert.nearest_sleeper || defect.nearest_sleeper || '--'}
                  </td>
                )}

                {!compact && (
                  <td>
                    {alert.track_zone || defect.track_zone || '--'}
                  </td>
                )}

                <td>{fmtCm(position)}</td>

                {!compact && <td>{pct(confidence)}</td>}

                {!compact && <td>x{alert.repeat_count ?? 1}</td>}

                {!compact && (
                  <td>
                    <span className="mono-cell">
                      {signature
                        ? signature.split(':').slice(-2).join(':')
                        : '--'}
                    </span>
                  </td>
                )}

                <td>
                  <button
                    className="review-table-btn"
                    onClick={() => onView?.(alert)}
                  >
                    <span>Review</span>
                    <small>AI</small>
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}