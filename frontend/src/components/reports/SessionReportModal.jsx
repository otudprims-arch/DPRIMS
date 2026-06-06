// src/components/reports/SessionReportModal.jsx
import StatusBadge from '../ui/StatusBadge';
import DataRow from '../ui/DataRow';
import AlertsTable from '../alerts/AlertsTable';
import {
  formatCm,
  formatDateTime,
  formatDuration,
  sessionStatusVariant,
} from '../../utils/formatters';

export default function SessionReportModal({ summary, onClose, onViewAlert }) {
  if (!summary) return null;

  const session = summary.session;
  const stats = summary.stats || {};
  const alerts = summary.alerts || [];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card modal-wide report-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>Inspection Report</h3>
            <p>{session?.session_id || '--'}</p>
          </div>

          <div className="modal-header-actions">
            <StatusBadge
              status={session?.status || '--'}
              variant={sessionStatusVariant(session?.status)}
              dot
            />
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="report-hero">
          <div>
            <span className="hero-kicker">SESSION SUMMARY</span>
            <h2>تقرير فحص المسار</h2>
            <p>
              ملخص الجلسة والتنبيهات المرتبطة بها، جاهز للعرض أو الطباعة في المناقشة.
            </p>
          </div>

          <div className="report-score-grid">
            <div>
              <span>Alerts</span>
              <strong>{stats.total_alerts ?? session?.alerts_count ?? 0}</strong>
            </div>
            <div>
              <span>Critical</span>
              <strong>{stats.critical_alerts ?? session?.critical_count ?? 0}</strong>
            </div>
          </div>
        </div>

        <div className="grid-2 modal-content-grid">
          <div className="panel soft-panel">
            <div className="panel-header">
              <h4 className="panel-title">Session Data</h4>
            </div>
            <div className="panel-body">
              <DataRow label="Train ID" value={session?.train_id || '--'} />
              <DataRow label="Status" value={
                <StatusBadge
                  status={session?.status || '--'}
                  variant={sessionStatusVariant(session?.status)}
                />
              } />
              <DataRow label="Started At" value={formatDateTime(session?.started_at)} />
              <DataRow label="Ended At" value={formatDateTime(session?.ended_at)} />
              <DataRow label="Duration" value={formatDuration(session?.duration_sec)} />
              <DataRow label="Notes" value={session?.notes || '--'} />
            </div>
          </div>

          <div className="panel soft-panel">
            <div className="panel-header">
              <h4 className="panel-title">Inspection Metrics</h4>
            </div>
            <div className="panel-body">
              <DataRow label="Start Position" value={formatCm(session?.start_position_cm ?? 0)} />
              <DataRow label="End Position" value={formatCm(session?.end_position_cm ?? 0)} />
              <DataRow label="Total Distance" value={formatCm(session?.total_distance_cm ?? 0)} />
              <DataRow label="Alerts Count" value={session?.alerts_count ?? 0} />
              <DataRow label="Critical Count" value={session?.critical_count ?? 0} />
              <DataRow label="Linked Alerts" value={alerts.length} />
            </div>
          </div>
        </div>

        <div className="report-section">
          <div className="report-section-head">
            <div>
              <h4>Linked Alerts</h4>
              <p>التنبيهات المسجلة أثناء هذه الجلسة</p>
            </div>
            <StatusBadge status={`${alerts.length} alerts`} variant="info" />
          </div>

          <AlertsTable alerts={alerts} onView={onViewAlert} compact />
        </div>
      </div>
    </div>
  );
}