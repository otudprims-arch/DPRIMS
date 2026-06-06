// src/components/alerts/AlertDetailsModal.jsx
import StatusBadge from '../ui/StatusBadge';
import { buildEventImageUrl } from '../../services/api';

function safeNumber(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function formatCm(value) {
  const n = safeNumber(value);
  if (n == null) return '--';
  return `${n.toFixed(1)} cm`;
}

function formatPct(value) {
  const n = safeNumber(value);
  if (n == null) return '--';
  if (n <= 1) return `${(n * 100).toFixed(1)}%`;
  return `${n.toFixed(1)}%`;
}

function formatTime(value) {
  if (!value) return '--';

  try {
    return new Date(value).toLocaleString('ar-EG', {
      dateStyle: 'short',
      timeStyle: 'medium',
    });
  } catch {
    return '--';
  }
}

function getType(item) {
  return (
    item?.defect_type ||
    item?.primary_defect ||
    item?.defect?.type ||
    item?.defects?.[0]?.type ||
    item?.defects?.[0]?.class_name ||
    item?.type ||
    'unknown'
  );
}

function getCamera(item) {
  return (
    item?.camera ||
    item?.defect_camera ||
    item?.defect?.camera ||
    item?.alert_ref?.camera ||
    '--'
  );
}

function getPosition(item) {
  return (
    item?.defect_position_cm ??
    item?.track_position_cm ??
    item?.defect?.defect_position_cm ??
    item?.defect?.track_position_cm ??
    item?.alert_ref?.defect_position_cm ??
    item?.alert_ref?.track_position_cm
  );
}

function getSeverity(item) {
  return item?.severity || item?.defect?.severity || item?.alert_ref?.severity || 'low';
}

function severityVariant(severity) {
  if (severity === 'critical' || severity === 'high') return 'danger';
  if (severity === 'medium' || severity === 'warning') return 'warning';
  if (severity === 'low') return 'neutral';
  return 'info';
}

function getSource(item) {
  if (item?._source === 'fault') return 'Confirmed Fault';
  if (item?.fault_id || item?.defect_type) return 'Confirmed Fault';
  return 'AI Alert';
}

function getImages(item) {
  const front =
    item?.images?.front ||
    item?.before_images?.front ||
    item?.alert_ref?.images?.front ||
    '';

  const rear =
    item?.images?.rear ||
    item?.before_images?.rear ||
    item?.alert_ref?.images?.rear ||
    '';

  return { front, rear };
}

function EvidenceImage({ title, path }) {
  const url = buildEventImageUrl(path);

  return (
    <div className="review-image-box">
      <div className="review-image-head">
        <div>
          <strong>{title}</strong>
          <span>{path || 'No image path'}</span>
        </div>

        <span className={`image-state ${path ? 'ok' : 'off'}`}>
          {path ? 'Captured' : 'Missing'}
        </span>
      </div>

      {path ? (
        <img src={url} alt={title} />
      ) : (
        <div className="review-image-placeholder">
          <p>No image available</p>
        </div>
      )}
    </div>
  );
}

function DetailCard({ label, value }) {
  return (
    <div className="review-info-card">
      <span>{label}</span>
      <strong>{value ?? '--'}</strong>
    </div>
  );
}

export default function AlertDetailsModal({ alert, onClose }) {
  if (!alert) return null;

  const type = getType(alert);
  const source = getSource(alert);
  const camera = getCamera(alert);
  const severity = getSeverity(alert);
  const position = getPosition(alert);
  const images = getImages(alert);

  const id =
    alert?.fault_id ||
    alert?.event_id ||
    alert?._id ||
    alert?.id ||
    '--';

  const confidence =
    alert?.confidence ??
    alert?.defect?.confidence ??
    alert?.alert_ref?.confidence ??
    null;

  const priority =
    alert?.priority_score ??
    alert?.alert_ref?.priority_score ??
    '--';

  const recommendation =
    alert?.recommendation ||
    alert?.alert_ref?.recommendation ||
    'Inspect this section and validate the detected defect.';

  const defects =
    Array.isArray(alert?.defects) && alert.defects.length
      ? alert.defects
      : alert?.defect
        ? [alert.defect]
        : [];

  return (
    <div className="review-modal-backdrop" onClick={onClose}>
      <div className="review-modal" onClick={(e) => e.stopPropagation()}>
        <div className="review-modal-top">
          <div className="review-title-block">
            <span className="review-kicker">
              <span className="live-dot mini" />
              {source}
            </span>

            <h2>{type}</h2>

            <div className="review-subline">
              <span>ID: {String(id).slice(0, 18)}</span>
              <span>Camera: {camera}</span>
              <span>Position: {formatCm(position)}</span>
            </div>
          </div>

          <div className="review-top-actions">
            <StatusBadge
              status={severity}
              variant={severityVariant(severity)}
            />

            <StatusBadge
              status={alert?.status || 'new'}
              variant="info"
            />

            <button className="review-close-btn" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        <div className="review-hero">
          <div className="review-risk-card">
            <span className="review-risk-label">Priority Score</span>
            <strong>{priority}</strong>

            <div className="review-risk-bar">
              <span
                style={{
                  width: `${Math.max(0, Math.min(100, Number(priority) || 0))}%`,
                }}
              />
            </div>

            <p>
              Risk evaluation based on severity, confidence, rail zone and defect type.
            </p>
          </div>

          <div className="review-main-grid">
            <DetailCard label="Type" value={type} />
            <DetailCard label="Severity" value={severity} />
            <DetailCard label="Camera" value={camera} />
            <DetailCard label="Confidence" value={formatPct(confidence)} />

            <DetailCard label="Position" value={formatCm(position)} />
            <DetailCard label="Encoder" value={formatCm(alert?.encoder_position_cm)} />
            <DetailCard label="Sleeper" value={alert?.nearest_sleeper || '--'} />
            <DetailCard label="Zone" value={alert?.track_zone || '--'} />

            <DetailCard label="Speed" value={`${safeNumber(alert?.speed_cm_s, 0)} cm/s`} />
            <DetailCard label="Direction" value={alert?.direction || '--'} />
            <DetailCard label="Rail Joint" value={alert?.is_on_rail_joint ? 'ON JOINT' : 'No'} />
            <DetailCard label="Repeat" value={`x${alert?.repeat_count ?? 1}`} />
          </div>
        </div>

        <div className="review-recommendation">
          <div>
            <span>Recommendation</span>
            <p>{recommendation}</p>
          </div>

          {severity === 'critical' && (
            <div className="review-danger-note">
              Critical defect may trigger emergency stop.
            </div>
          )}
        </div>

        <div className="review-images-grid">
          <EvidenceImage title="Front Evidence" path={images.front} />
          <EvidenceImage title="Rear Evidence" path={images.rear} />
        </div>

        <div className="modal-defects" style={{ padding: '18px 24px' }}>
          <h4>العيوب المكتشفة</h4>

          {defects.length ? (
            <ul>
              {defects.map((defect, i) => (
                <li key={i}>
                  <strong>
                    {defect.type || defect.class_name || type}
                  </strong>

                  <span>
                    {formatPct(defect.confidence ?? confidence)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: 'var(--text-3)', fontSize: '13px', margin: 0 }}>
              لا توجد اكتشافات تفصيلية
            </p>
          )}
        </div>

        <div className="review-actions">
          <button className="review-action-btn ghost" onClick={onClose}>
            <span>Close</span>
            <small>إغلاق النافذة</small>
          </button>

          <button className="review-action-btn primary" disabled>
            <span>{source}</span>
            <small>Current source</small>
          </button>

          <button className="review-action-btn success" disabled>
            <span>{alert?.nearest_sleeper || '--'}</span>
            <small>Nearest sleeper</small>
          </button>

          <button className="review-action-btn danger" disabled>
            <span>{severity}</span>
            <small>Severity level</small>
          </button>
        </div>
      </div>
    </div>
  );
}