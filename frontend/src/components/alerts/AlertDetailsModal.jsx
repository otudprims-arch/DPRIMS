// src/components/alerts/AlertDetailsModal.jsx
import StatusBadge from '../ui/StatusBadge';
import DataRow from '../ui/DataRow';
import {
  defectLabel,
  formatCm,
  formatDateTime,
  formatPercent,
  severityLabel,
  severityVariant,
  statusVariant,
} from '../../utils/formatters';

export default function AlertDetailsModal({ alert, onClose }) {
  if (!alert) return null;

  const firstDefect = alert.defects?.[0];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>Alert Details</h3>
            <p>{alert.event_id || alert._id}</p>
          </div>

          <div className="modal-header-actions">
            <StatusBadge
              status={severityLabel(alert.severity)}
              variant={severityVariant(alert.severity)}
            />
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="alert-detail-hero">
          <div>
            <span className="hero-kicker">Detected Defect</span>
            <h2>{defectLabel(alert.primary_defect)}</h2>
            <p>{alert.recommendation || 'Manual inspection recommended.'}</p>
          </div>

          <div className="priority-score-box">
            <span>Priority</span>
            <strong>{alert.priority_score ?? '--'}</strong>
          </div>
        </div>

        <div className="grid-2 modal-content-grid">
          <div className="panel soft-panel">
            <div className="panel-header">
              <h4 className="panel-title">Core Data</h4>
            </div>
            <div className="panel-body">
              <DataRow label="Status" value={
                <StatusBadge
                  status={alert.status || '--'}
                  variant={statusVariant(alert.status)}
                />
              } />
              <DataRow label="Created At" value={formatDateTime(alert.createdAt)} />
              <DataRow label="Train ID" value={alert.train_id || '--'} />
              <DataRow label="Camera" value={alert.camera || '--'} />
              <DataRow label="Track Position" value={formatCm(alert.track_position_cm)} />
              <DataRow label="Track Zone" value={alert.track_zone || '--'} />
              <DataRow label="Repeat Count" value={`x${alert.repeat_count ?? 1}`} />
              <DataRow label="Session" value={alert.session_id || '--'} />
            </div>
          </div>

          <div className="panel soft-panel">
            <div className="panel-header">
              <h4 className="panel-title">AI Detection</h4>
            </div>
            <div className="panel-body">
              <DataRow label="Model" value={alert.model || '--'} />
              <DataRow label="Version" value={alert.model_version || '--'} />
              <DataRow label="Confidence" value={formatPercent(firstDefect?.confidence, 1)} />
              <DataRow label="BBox" value={firstDefect?.bbox?.join(', ') || '--'} />
              <DataRow label="SSIM Score" value={alert.ssim_score ?? alert.ssim_anomaly_score ?? '--'} />
              <DataRow label="Action" value={alert.action || '--'} />
              <DataRow label="Auto Action" value={alert.auto_action || '--'} />
              <DataRow label="Auto Sent" value={alert.auto_action_taken ? 'Yes' : 'No'} />
            </div>
          </div>
        </div>

        <div className="modal-defects">
          <h4>Defects List</h4>

          {alert.defects?.length ? (
            <ul>
              {alert.defects.map((defect, index) => (
                <li key={index}>
                  <strong>{defectLabel(defect.class_name || defect.type)}</strong>
                  <span>{formatPercent(defect.confidence, 1)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p>No object detections</p>
          )}
        </div>

        <div className="modal-note">
          <strong>Recommendation:</strong>
          <span>{alert.recommendation || 'Manual inspection recommended.'}</span>
        </div>
      </div>
    </div>
  );
}