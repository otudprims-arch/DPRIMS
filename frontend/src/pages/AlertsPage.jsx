// src/pages/AlertsPage.jsx
import { useEffect, useMemo, useState } from 'react';
import SectionHeader from '../components/ui/SectionHeader';
import StatCard from '../components/ui/StatCard';
import PanelShell from '../components/ui/PanelShell';
import StatusBadge from '../components/ui/StatusBadge';
import Toast from '../components/ui/Toast';

import {
  getAlerts,
  getAlertStats,
  acknowledgeAlert,
  resolveAlert,
  markAlertFalsePositive,
  confirmFaultFromAlert,
  buildEventImageUrl,
} from '../services/api';
let toastId = 0;

const SEVERITY_VARIANT = {
  critical: 'danger',
  high: 'danger',
  medium: 'warning',
  low: 'neutral',
};

const STATUS_VARIANT = {
  new: 'info',
  under_review: 'warning',
  resolved: 'success',
  closed: 'neutral',
  false_positive: 'danger',
};

function fmtDate(value) {
  if (!value) return '--';
  return new Date(value).toLocaleString('ar-EG', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function pct(value) {
  if (typeof value !== 'number') return '--';
  return `${(value * 100).toFixed(1)}%`;
}

function pickAlertType(alert) {
  return (
    alert.primary_defect ||
    alert.defect?.type ||
    alert.defects?.[0]?.type ||
    alert.defects?.[0]?.class_name ||
    'unknown'
  );
}

function StatIcon({ type }) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '2',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };

  const icons = {
    total: (
      <>
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 01-3.46 0" />
      </>
    ),
    critical: (
      <>
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </>
    ),
    open: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </>
    ),
    ai: (
      <>
        <path d="M12 2v4" />
        <path d="M12 18v4" />
        <path d="M4.93 4.93l2.83 2.83" />
        <path d="M16.24 16.24l2.83 2.83" />
        <path d="M2 12h4" />
        <path d="M18 12h4" />
        <path d="M4.93 19.07l2.83-2.83" />
        <path d="M16.24 7.76l2.83-2.83" />
        <circle cx="12" cy="12" r="4" />
      </>
    ),
  };

  return <svg {...common}>{icons[type]}</svg>;
}

function shortId(value) {
  if (!value) return '--';
  return String(value).slice(0, 8);
}

function getConfidenceValue(alert) {
  const defect = alert?.defect || alert?.defects?.[0] || {};
  if (typeof defect.confidence === 'number') return defect.confidence;
  if (typeof alert?.confidence === 'number') return alert.confidence;
  return null;
}

function getCameraLabel(alert) {
  const defect = alert?.defect || alert?.defects?.[0] || {};
  return alert?.defect_camera || alert?.camera || defect?.camera || 'unknown';
}

function buildImageUrl(path) {
  return buildEventImageUrl(path);
}

function AlertImageBox({ title, path, camera }) {
  const imgUrl = buildImageUrl(path);

  return (
    <div className="review-image-box">
      <div className="review-image-head">
        <div>
          <strong>{title}</strong>
          <span>{camera}</span>
        </div>

        <span className={path ? 'image-state ok' : 'image-state off'}>
          {path ? 'Captured' : 'Missing'}
        </span>
      </div>

      {imgUrl ? (
        <img src={imgUrl} alt={title} />
      ) : (
        <div className="review-image-placeholder">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <circle cx="8.5" cy="10.5" r="1.5" />
            <path d="M21 15l-5-5L5 19" />
          </svg>
          <p>Image path saved</p>
          <code>{path || 'No image path available'}</code>
        </div>
      )}
    </div>
  );
}

function AlertModal({ alert, onClose, onAction, busyAction }) {
  if (!alert) return null;

  const defect = alert.defect || alert.defects?.[0] || {};
  const type = pickAlertType(alert);
  const camera = getCameraLabel(alert);
  const status = alert.status || 'new';
  const confidence = getConfidenceValue(alert);
  const eventId = alert.event_id || alert._id;
  const severity = alert.severity || defect.severity || 'unknown';

  const position =
    alert.defect_position_cm ??
    defect.track_position_cm ??
    alert.track_position_cm ??
    '--';

  const sleeper =
    alert.nearest_sleeper ||
    defect.nearest_sleeper ||
    '--';

  const priority = alert.priority_score ?? '--';
  const repeat = alert.repeat_count ?? 1;

  const actionDisabled =
    Boolean(busyAction) ||
    ['resolved', 'false_positive'].includes(status);

  return (
    <div className="review-modal-backdrop" onClick={onClose}>
      <div className="review-modal" onClick={(e) => e.stopPropagation()}>
        <div className="review-modal-top">
          <div className="review-title-block">
            <div className="review-kicker">
              <span className="live-dot mini" />
              AI Alert Review
            </div>

            <h2>{type}</h2>

            <div className="review-subline">
              <span>Event #{shortId(eventId)}</span>
              <span>•</span>
              <span>{fmtDate(alert.createdAt || alert.first_seen_at)}</span>
            </div>
          </div>

          <div className="review-top-actions">
            <StatusBadge
              status={severity}
              variant={SEVERITY_VARIANT[severity] || 'neutral'}
            />

            <StatusBadge
              status={status}
              variant={STATUS_VARIANT[status] || 'neutral'}
            />

            <button className="review-close-btn" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        <div className="review-hero">
          <div className="review-risk-card">
            <span className="review-risk-label">AI Confidence</span>
            <strong>{confidence != null ? pct(confidence) : '--'}</strong>

            <div className="review-risk-bar">
              <span style={{ width: `${Math.min(100, Math.max(0, (confidence || 0) * 100))}%` }} />
            </div>

            <p>
              {confidence >= 0.8
                ? 'High confidence detection. Review and confirm quickly.'
                : confidence >= 0.6
                  ? 'Medium confidence detection. Needs operator review.'
                  : 'Low confidence. Check images before action.'}
            </p>
          </div>

          <div className="review-main-grid">
            <div className="review-info-card">
              <span>Camera</span>
              <strong>{camera}</strong>
            </div>

            <div className="review-info-card">
              <span>Sleeper</span>
              <strong>{sleeper}</strong>
            </div>

            <div className="review-info-card">
              <span>Position</span>
              <strong>{position} cm</strong>
            </div>

            <div className="review-info-card">
              <span>Zone</span>
              <strong>{alert.track_zone || '--'}</strong>
            </div>

            <div className="review-info-card">
              <span>Priority</span>
              <strong>{priority}</strong>
            </div>

            <div className="review-info-card">
              <span>Repeat</span>
              <strong>{repeat}</strong>
            </div>

            <div className="review-info-card">
              <span>Rail Joint</span>
              <strong>{alert.rail_joint_distance_cm ?? '--'} cm</strong>
            </div>

            <div className="review-info-card">
              <span>Action</span>
              <strong>{alert.action || '--'}</strong>
            </div>
          </div>
        </div>

        <div className="review-recommendation">
          <div>
            <span>Recommended Action</span>
            <p>{alert.recommendation || 'Review the captured frames and inspect this track section.'}</p>
          </div>

          {severity === 'critical' && (
            <div className="review-danger-note">
              Critical alert may require immediate stop and maintenance inspection.
            </div>
          )}
        </div>

        <div className="review-images-grid">
          <AlertImageBox
            title="Front Camera Evidence"
            camera="FRONT"
            path={alert.images?.front}
          />

          <AlertImageBox
            title="Rear Camera Evidence"
            camera="REAR"
            path={alert.images?.rear}
          />
        </div>

        <div className="review-workflow">
          <div className={`workflow-step ${alert.acknowledged ? 'done' : 'active'}`}>
            <span>1</span>
            <div>
              <strong>Acknowledge</strong>
              <p>Operator reviewed the AI alert.</p>
            </div>
          </div>

          <div className={`workflow-step ${status === 'under_review' ? 'active' : ''}`}>
            <span>2</span>
            <div>
              <strong>Confirm Fault</strong>
              <p>Create official maintenance fault.</p>
            </div>
          </div>

          <div className={`workflow-step ${status === 'resolved' ? 'done' : ''}`}>
            <span>3</span>
            <div>
              <strong>Resolve / Close</strong>
              <p>Finish alert handling.</p>
            </div>
          </div>
        </div>

        <div className="review-actions">
          <button
            className="review-action-btn ghost"
            onClick={() => onAction('ack', alert)}
            disabled={Boolean(busyAction) || alert.acknowledged}
          >
            <span>Acknowledge</span>
            <small>تأكيد الاطلاع</small>
          </button>

          <button
            className="review-action-btn success"
            onClick={() => onAction('confirm', alert)}
            disabled={actionDisabled || status === 'under_review'}
          >
            <span>Confirm as Fault</span>
            <small>تحويل لعطل رسمي</small>
          </button>

          <button
            className="review-action-btn primary"
            onClick={() => onAction('resolve', alert)}
            disabled={Boolean(busyAction) || status === 'resolved'}
          >
            <span>Resolve</span>
            <small>إنهاء التنبيه</small>
          </button>

          <button
            className="review-action-btn danger"
            onClick={() => onAction('false', alert)}
            disabled={Boolean(busyAction) || status === 'false_positive'}
          >
            <span>False Positive</span>
            <small>تنبيه غير صحيح</small>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [busyAction, setBusyAction] = useState('');
  const [toasts, setToasts] = useState([]);

  const [filters, setFilters] = useState({
    status: '',
    severity: '',
    camera: '',
    sleeper: '',
    type: '',
    limit: 50,
  });

  const query = useMemo(() => {
    const q = { limit: filters.limit };

    Object.entries(filters).forEach(([key, value]) => {
      if (value && key !== 'limit') q[key] = value;
    });

    return q;
  }, [filters]);

  function addToast(message, type = 'info') {
    const id = ++toastId;
    const duration = type === 'danger' ? 3500 : 2500;

    setToasts((prev) => [...prev, { id, message, type, duration }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }

  async function load() {
    try {
      const [alertsRes, statsRes] = await Promise.all([
        getAlerts(query),
        getAlertStats(),
      ]);

      setAlerts(Array.isArray(alertsRes?.data) ? alertsRes.data : []);
      setStats(statsRes?.data || statsRes || null);
    } catch (err) {
      addToast(err?.message || 'فشل تحميل التنبيهات', 'danger');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function safeLoad() {
      if (!cancelled) await load();
    }

    safeLoad();
    const id = setInterval(safeLoad, 3000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [query]);

  async function handleAction(action, alert) {
    if (!alert?._id) return;

    setBusyAction(action);

    try {
      if (action === 'ack') {
        await acknowledgeAlert(alert._id, {
          by: 'operator',
          notes: 'Acknowledged from dashboard',
        });
        addToast('تم تأكيد الاطلاع على التنبيه', 'success');
      }

      if (action === 'confirm') {
        await confirmFaultFromAlert(alert._id, {
          by: 'operator',
          notes: 'Confirmed as fault from dashboard',
        });
        addToast('تم تحويل التنبيه إلى عطل رسمي', 'success');
      }

      if (action === 'resolve') {
        await resolveAlert(alert._id, {
          by: 'operator',
          notes: 'Resolved from dashboard',
        });
        addToast('تم إغلاق التنبيه', 'success');
      }

      if (action === 'false') {
        await markAlertFalsePositive(alert._id, {
          by: 'operator',
          notes: 'Marked as false positive from dashboard',
        });
        addToast('تم تسجيل التنبيه كـ False Positive', 'danger');
      }

      setSelectedAlert(null);
      await load();
    } catch (err) {
      addToast(err?.response?.data?.message || err?.message || 'فشل تنفيذ العملية', 'danger');
    } finally {
      setBusyAction('');
    }
  }

  const total = stats?.total ?? alerts.length;
  const open = stats?.open ?? alerts.filter((a) => !['resolved', 'false_positive'].includes(a.status)).length;
  const critical = stats?.critical ?? alerts.filter((a) => a.severity === 'critical').length;
  const aiTypes = new Set(alerts.map((a) => pickAlertType(a))).size;

  return (
    <div className="page-stack">
      <Toast toasts={toasts} />

      <SectionHeader
        title="مركز التنبيهات"
        subtitle="AI Alerts Review Center"
        action={
          <button className="pro-refresh-btn" onClick={load}>
            تحديث
          </button>
        }
      />

      <div className="grid-4">
        <StatCard
          label="إجمالي التنبيهات"
          value={total}
          color="blue"
          subtitle="All AI alerts"
          icon={<StatIcon type="total" />}
        />

        <StatCard
          label="تنبيهات مفتوحة"
          value={open}
          color={open > 0 ? 'amber' : 'green'}
          subtitle="Need review"
          icon={<StatIcon type="open" />}
        />

        <StatCard
          label="حرجة"
          value={critical}
          color={critical > 0 ? 'red' : 'green'}
          subtitle="Critical AI detections"
          icon={<StatIcon type="critical" />}
        />

        <StatCard
          label="أنواع مكتشفة"
          value={aiTypes}
          color="teal"
          subtitle="Detected classes"
          icon={<StatIcon type="ai" />}
        />
      </div>

      <PanelShell title="فلاتر التنبيهات" subtitle="Review and convert alerts into official faults">
        <div className="fault-filters">
          <select
            value={filters.status}
            onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
          >
            <option value="">All Status</option>
            <option value="new">New</option>
            <option value="under_review">Under Review</option>
            <option value="resolved">Resolved</option>
            <option value="false_positive">False Positive</option>
          </select>

          <select
            value={filters.severity}
            onChange={(e) => setFilters((p) => ({ ...p, severity: e.target.value }))}
          >
            <option value="">All Severity</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={filters.camera}
            onChange={(e) => setFilters((p) => ({ ...p, camera: e.target.value }))}
          >
            <option value="">All Cameras</option>
            <option value="front">Front</option>
            <option value="rear">Rear</option>
          </select>

          <input
            value={filters.sleeper}
            placeholder="Sleeper مثل S5"
            onChange={(e) => setFilters((p) => ({ ...p, sleeper: e.target.value }))}
          />

          <input
            value={filters.type}
            placeholder="Type مثل broken_rail"
            onChange={(e) => setFilters((p) => ({ ...p, type: e.target.value }))}
          />

          <button
            className="filter-clear-btn"
            onClick={() =>
              setFilters({
                status: '',
                severity: '',
                camera: '',
                sleeper: '',
                type: '',
                limit: 50,
              })
            }
          >
            Reset
          </button>
        </div>
      </PanelShell>

      <PanelShell
        title="قائمة التنبيهات"
        subtitle={loading ? 'Loading...' : `${alerts.length} alerts loaded`}
        headerRight={<StatusBadge status="LIVE" variant="success" dot />}
      >
        {alerts.length ? (
          <div className="fault-table-wrap">
            <table className="fault-table">
              <thead>
<tr>
  <th>Event</th>
  <th>Type</th>
  <th>Severity</th>
  <th>Status</th>
  <th>Camera</th>
  <th>Sleeper</th>
  <th>Zone</th>
  <th>Position</th>
  <th>Confidence</th>
  <th>Repeat</th>
  <th>Signature</th>
  <th>Updated</th>
  <th>Action</th>
</tr>
              </thead>

              <tbody>
                {alerts.map((alert) => {
                  const defect = alert.defect || alert.defects?.[0] || {};
                  const type = pickAlertType(alert);
                  const camera = alert.defect_camera || alert.camera || defect.camera || '--';
                  const status = alert.status || 'new';

                  return (
                    <tr key={alert._id}>
                      <td>
                        <span className="mono-cell">{alert.event_id || alert._id}</span>
                      </td>

                      <td>{type}</td>

                      <td>
                        <StatusBadge
                          status={alert.severity || '--'}
                          variant={SEVERITY_VARIANT[alert.severity] || 'neutral'}
                        />
                      </td>

                      <td>
                        <StatusBadge
                          status={status}
                          variant={STATUS_VARIANT[status] || 'neutral'}
                        />
                      </td>

                      <td>{camera}</td>
                      <td>{alert.nearest_sleeper || defect.nearest_sleeper || '--'}</td>
                     <td>{alert.track_zone || defect.track_zone || '--'}</td>
                      <td>{alert.defect_position_cm ?? alert.track_position_cm ?? '--'} cm</td>
                      <td>{pct(defect.confidence)}</td>
                      <td>{alert.repeat_count ?? 1}</td>
                      <td>
  <span className="mono-cell">
    {alert.detection_signature
      ? alert.detection_signature.split(':').slice(-2).join(':')
      : '--'}
  </span>
</td>
                      <td>{fmtDate(alert.updatedAt || alert.last_seen_at)}</td>

                      <td>
<button className="review-table-btn" onClick={() => setSelectedAlert(alert)}>
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
        ) : (
          <div className="alerts-empty">
            <span>لا توجد تنبيهات حاليًا</span>
          </div>
        )}
      </PanelShell>

      <AlertModal
        alert={selectedAlert}
        onClose={() => setSelectedAlert(null)}
        onAction={handleAction}
        busyAction={busyAction}
      />
    </div>
  );
}
