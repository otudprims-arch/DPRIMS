// src/pages/FaultsPage.jsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import SectionHeader from '../components/ui/SectionHeader';
import StatCard from '../components/ui/StatCard';
import PanelShell from '../components/ui/PanelShell';
import StatusBadge from '../components/ui/StatusBadge';
import Toast from '../components/ui/Toast';

import {
  getFaults,
  getFaultStats,
  assignFault,
  startRepairFault,
  markFaultRepaired,
  verifyFault,
  closeFault,
  rejectFault,
  buildEventImageUrl,
} from '../services/api';

let toastId = 0;

const STATUS_VARIANT = {
  confirmed: 'info',
  assigned: 'warning',
  in_progress: 'warning',
  repaired: 'success',
  verified: 'success',
  closed: 'neutral',
  rejected: 'danger',
};

const SEVERITY_VARIANT = {
  critical: 'danger',
  high: 'danger',
  medium: 'warning',
  low: 'neutral',
};

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

function pct(value) {
  if (typeof value !== 'number') return '--';
  return `${(value * 100).toFixed(1)}%`;
}

function shortId(value) {
  if (!value) return '--';
  return String(value).slice(0, 12);
}

function getFaultStatus(fault) {
  return fault?.status || 'confirmed';
}

function getFaultImage(fault, camera) {
  return fault?.before_images?.[camera] || fault?.alert_ref?.images?.[camera] || '';
}

function FaultImage({ title, path }) {
  const url = buildEventImageUrl(path);

  return (
    <div className="fault-proof-card">
      <div className="fault-proof-head">
        <strong>{title}</strong>
        <span className={path ? 'proof-chip ok' : 'proof-chip off'}>
          {path ? 'Captured' : 'Missing'}
        </span>
      </div>

      {path ? (
        <img src={url} alt={title} />
      ) : (
        <div className="fault-proof-empty">
          <span>No image available</span>
        </div>
      )}

      {path && <code>{path}</code>}
    </div>
  );
}

function FaultWorkflow({ status }) {
  const steps = [
    { key: 'confirmed', label: 'Confirmed', sub: 'Fault accepted' },
    { key: 'assigned', label: 'Assigned', sub: 'Technician assigned' },
    { key: 'in_progress', label: 'Repair', sub: 'Work in progress' },
    { key: 'repaired', label: 'Repaired', sub: 'Repair completed' },
    { key: 'verified', label: 'Verified', sub: 'Final inspection' },
    { key: 'closed', label: 'Closed', sub: 'Case archived' },
  ];

  const index = steps.findIndex((s) => s.key === status);

  return (
    <div className="fault-workflow">
      {steps.map((step, i) => {
        const done = index >= i && status !== 'rejected';
        const active = index === i && status !== 'rejected';

        return (
          <div
            key={step.key}
            className={`fault-step ${done ? 'done' : ''} ${active ? 'active' : ''}`}
          >
            <span>{i + 1}</span>
            <div>
              <strong>{step.label}</strong>
              <p>{step.sub}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FaultModal({
  fault,
  onClose,
  onAction,
  busyAction,
  onShowOnTrack,
}) {
  if (!fault) return null;

  const status = getFaultStatus(fault);
  const frontImage = getFaultImage(fault, 'front');
  const rearImage = getFaultImage(fault, 'rear');

  return (
    <div className="fault-modal-backdrop" onClick={onClose}>
      <div className="fault-modal" onClick={(e) => e.stopPropagation()}>
        <div className="fault-modal-top">
          <div>
            <span className="fault-kicker">Maintenance Fault Review</span>
            <h2>{fault.defect_type || '--'}</h2>
            <p>
              Fault ID: <b>{fault.fault_id || shortId(fault._id)}</b>
            </p>
          </div>

          <div className="fault-modal-badges">
            <StatusBadge
              status={fault.severity || '--'}
              variant={SEVERITY_VARIANT[fault.severity] || 'neutral'}
            />

            <StatusBadge
              status={status}
              variant={STATUS_VARIANT[status] || 'neutral'}
            />

            <button className="fault-close-btn" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        <div className="fault-summary-strip">
          <div>
            <span>Camera</span>
            <strong>{fault.camera || '--'}</strong>
          </div>

          <div>
            <span>Sleeper</span>
            <strong>{fault.nearest_sleeper || '--'}</strong>
          </div>

          <div>
            <span>Position</span>
            <strong>{fault.defect_position_cm ?? '--'} cm</strong>
          </div>

          <div>
            <span>Zone</span>
            <strong>{fault.track_zone || '--'}</strong>
          </div>

          <div>
            <span>Confidence</span>
            <strong>{pct(fault.confidence)}</strong>
          </div>

          <div>
            <span>Priority</span>
            <strong>{fault.priority_score ?? '--'}</strong>
          </div>
        </div>

        <div className="fault-recommendation-box">
          <span>Recommendation</span>
          <p>
            {fault.recommendation ||
              'Inspect this section and update maintenance status.'}
          </p>
        </div>

        <FaultWorkflow status={status} />

        <div className="fault-proof-grid">
          <FaultImage title="Front Before Image" path={frontImage} />
          <FaultImage title="Rear Before Image" path={rearImage} />
        </div>

        <div className="fault-history-box">
          <h3>Maintenance History</h3>

          {fault.history?.length ? (
            <div className="fault-history-list">
              {fault.history.map((h, idx) => (
                <div key={h._id || idx} className="fault-history-item">
                  <span>{h.action || '--'}</span>
                  <strong>{h.by || 'operator'}</strong>
                  <small>{fmtDate(h.at)}</small>
                  {h.notes && <p>{h.notes}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="fault-empty-text">No maintenance history yet.</p>
          )}
        </div>

        <div className="fault-action-bar">
          <button
            className="primary"
            onClick={() => onShowOnTrack?.(fault)}
          >
            Show on Track
            <small>عرض على الخريطة</small>
          </button>

          <button
            onClick={() => onAction('assign', fault)}
            disabled={
              busyAction ||
              ['assigned', 'in_progress', 'repaired', 'verified', 'closed'].includes(status)
            }
          >
            Assign
            <small>تعيين فني</small>
          </button>

          <button
            onClick={() => onAction('start', fault)}
            disabled={busyAction || !['confirmed', 'assigned'].includes(status)}
          >
            Start Repair
            <small>بدء الإصلاح</small>
          </button>

          <button
            className="success"
            onClick={() => onAction('repaired', fault)}
            disabled={busyAction || status !== 'in_progress'}
          >
            Mark Repaired
            <small>تم الإصلاح</small>
          </button>

          <button
            className="success"
            onClick={() => onAction('verify', fault)}
            disabled={busyAction || status !== 'repaired'}
          >
            Verify
            <small>مراجعة نهائية</small>
          </button>

          <button
            className="primary"
            onClick={() => onAction('close', fault)}
            disabled={busyAction || !['verified', 'repaired'].includes(status)}
          >
            Close
            <small>إغلاق العطل</small>
          </button>

          <button
            className="danger"
            onClick={() => onAction('reject', fault)}
            disabled={busyAction || ['closed', 'rejected'].includes(status)}
          >
            Reject
            <small>رفض العطل</small>
          </button>
        </div>
      </div>
    </div>
  );
}

function FaultIcon({ type }) {
  const icons = {
    total: (
      <>
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <path d="M14 2v6h6" />
      </>
    ),
    open: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </>
    ),
    critical: (
      <>
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </>
    ),
    fixed: (
      <>
        <path d="M20 6L9 17l-5-5" />
      </>
    ),
  };

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      {icons[type]}
    </svg>
  );
}

export default function FaultsPage() {
  const navigate = useNavigate();

  const [faults, setFaults] = useState([]);
  const [stats, setStats] = useState({});
  const [selectedFault, setSelectedFault] = useState(null);
  const [busyAction, setBusyAction] = useState('');
  const [loading, setLoading] = useState(true);
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

    if (filters.status) q.status = filters.status;
    if (filters.severity) q.severity = filters.severity;
    if (filters.camera) q.camera = filters.camera;
    if (filters.sleeper) q.sleeper = filters.sleeper;
    if (filters.type) q.type = filters.type;

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
      const [faultsRes, statsRes] = await Promise.all([
        getFaults(query),
        getFaultStats(),
      ]);

      setFaults(Array.isArray(faultsRes?.data) ? faultsRes.data : []);
      setStats(statsRes?.data || statsRes || {});
    } catch (err) {
      addToast(err?.message || 'فشل تحميل سجل الأعطال', 'danger');
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

    const id = setInterval(safeLoad, 4000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [query]);

  function showFaultOnTrack(fault) {
    const id = fault?._id || fault?.fault_id || '';

    setSelectedFault(null);

    navigate(`/track?layer=faults&fault=${encodeURIComponent(id)}`);
  }

  async function handleAction(action, fault) {
    if (!fault?._id) return;

    setBusyAction(action);

    const basePayload = {
      by: 'operator',
      notes: `Updated from dashboard: ${action}`,
    };

    try {
      if (action === 'assign') {
        await assignFault(fault._id, {
          ...basePayload,
          assigned_to: 'maintenance_team',
        });
        addToast('تم تعيين العطل لفريق الصيانة', 'success');
      }

      if (action === 'start') {
        await startRepairFault(fault._id, basePayload);
        addToast('تم بدء إصلاح العطل', 'success');
      }

      if (action === 'repaired') {
        await markFaultRepaired(fault._id, basePayload);
        addToast('تم تسجيل العطل كتم إصلاحه', 'success');
      }

      if (action === 'verify') {
        await verifyFault(fault._id, basePayload);
        addToast('تم اعتماد الإصلاح بعد المراجعة', 'success');
      }

      if (action === 'close') {
        await closeFault(fault._id, basePayload);
        addToast('تم إغلاق العطل', 'success');
      }

      if (action === 'reject') {
        await rejectFault(fault._id, basePayload);
        addToast('تم رفض العطل', 'danger');
      }

      setSelectedFault(null);
      await load();
    } catch (err) {
      addToast(
        err?.response?.data?.message || err?.message || 'فشل تنفيذ العملية',
        'danger'
      );
    } finally {
      setBusyAction('');
    }
  }

  const total = stats.total ?? faults.length;

  const open =
    stats.open ??
    faults.filter((f) => !['closed', 'rejected'].includes(getFaultStatus(f))).length;

  const critical =
    stats.critical ??
    faults.filter((f) => f.severity === 'critical').length;

  const fixed =
    stats.closed ??
    faults.filter((f) =>
      ['verified', 'closed', 'repaired'].includes(getFaultStatus(f))
    ).length;

  return (
    <div className="page-stack">
      <Toast toasts={toasts} />

      <SectionHeader
        title="سجل الأعطال"
        subtitle="Maintenance Faults Control Center"
        action={
          <button className="pro-refresh-btn" onClick={load}>
            تحديث
          </button>
        }
      />

      <div className="grid-4">
        <StatCard
          label="إجمالي الأعطال"
          value={total}
          color="blue"
          subtitle="Confirmed faults"
          icon={<FaultIcon type="total" />}
        />

        <StatCard
          label="أعطال مفتوحة"
          value={open}
          color={open > 0 ? 'amber' : 'green'}
          subtitle="Need maintenance"
          icon={<FaultIcon type="open" />}
        />

        <StatCard
          label="حرجة"
          value={critical}
          color={critical > 0 ? 'red' : 'green'}
          subtitle="Critical repairs"
          icon={<FaultIcon type="critical" />}
        />

        <StatCard
          label="تم التعامل معها"
          value={fixed}
          color="green"
          subtitle="Repaired / verified"
          icon={<FaultIcon type="fixed" />}
        />
      </div>

      <PanelShell title="فلاتر سجل الأعطال" subtitle="Filter maintenance workflow">
        <div className="fault-filters">
          <select
            value={filters.status}
            onChange={(e) =>
              setFilters((p) => ({ ...p, status: e.target.value }))
            }
          >
            <option value="">All Status</option>
            <option value="confirmed">Confirmed</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="repaired">Repaired</option>
            <option value="verified">Verified</option>
            <option value="closed">Closed</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            value={filters.severity}
            onChange={(e) =>
              setFilters((p) => ({ ...p, severity: e.target.value }))
            }
          >
            <option value="">All Severity</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={filters.camera}
            onChange={(e) =>
              setFilters((p) => ({ ...p, camera: e.target.value }))
            }
          >
            <option value="">All Cameras</option>
            <option value="front">Front</option>
            <option value="rear">Rear</option>
          </select>

          <input
            value={filters.sleeper}
            placeholder="Sleeper مثل S5"
            onChange={(e) =>
              setFilters((p) => ({ ...p, sleeper: e.target.value }))
            }
          />

          <input
            value={filters.type}
            placeholder="Type مثل broken_rail"
            onChange={(e) =>
              setFilters((p) => ({ ...p, type: e.target.value }))
            }
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
        title="قائمة الأعطال"
        subtitle={loading ? 'Loading...' : `${faults.length} faults loaded`}
        headerRight={<StatusBadge status="LIVE" variant="success" dot />}
      >
        {faults.length ? (
          <div className="fault-table-wrap">
            <table className="fault-table">
              <thead>
                <tr>
                  <th>Fault</th>
                  <th>Type</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Camera</th>
                  <th>Sleeper</th>
                  <th>Zone</th>
                  <th>Position</th>
                  <th>Confidence</th>
                  <th>Assigned</th>
                  <th>Updated</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {faults.map((fault) => {
                  const status = getFaultStatus(fault);

                  return (
                    <tr key={fault._id}>
                      <td>
                        <span className="mono-cell">
                          {shortId(fault.fault_id || fault._id)}
                        </span>
                      </td>

                      <td>{fault.defect_type || '--'}</td>

                      <td>
                        <StatusBadge
                          status={fault.severity || '--'}
                          variant={SEVERITY_VARIANT[fault.severity] || 'neutral'}
                        />
                      </td>

                      <td>
                        <StatusBadge
                          status={status}
                          variant={STATUS_VARIANT[status] || 'neutral'}
                        />
                      </td>

                      <td>{fault.camera || '--'}</td>
                      <td>{fault.nearest_sleeper || '--'}</td>
                      <td>{fault.track_zone || '--'}</td>
                      <td>{fault.defect_position_cm ?? '--'} cm</td>
                      <td>{pct(fault.confidence)}</td>
                      <td>{fault.assigned_to || '--'}</td>
                      <td>{fmtDate(fault.updatedAt || fault.confirmed_at)}</td>

                      <td>
                        <div className="table-actions-inline">
                          <button
                            className="review-table-btn"
                            onClick={() => setSelectedFault(fault)}
                          >
                            <span>Open</span>
                            <small>FIX</small>
                          </button>

                          <button
                            className="track-mini-btn"
                            onClick={() => showFaultOnTrack(fault)}
                          >
                            <span>Track</span>
                            <small>MAP</small>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="alerts-empty">
            <span>لا توجد أعطال مسجلة حاليًا</span>
          </div>
        )}
      </PanelShell>

      <FaultModal
        fault={selectedFault}
        onClose={() => setSelectedFault(null)}
        onAction={handleAction}
        busyAction={busyAction}
        onShowOnTrack={showFaultOnTrack}
      />
    </div>
  );
}