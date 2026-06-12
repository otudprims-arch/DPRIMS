// src/pages/ReportsPage.jsx
import { useEffect, useMemo, useState } from 'react';
import SectionHeader from '../components/ui/SectionHeader';
import StatCard from '../components/ui/StatCard';
import PanelShell from '../components/ui/PanelShell';
import StatusBadge from '../components/ui/StatusBadge';
import Toast from '../components/ui/Toast';
import {
  getReportsOverview,
  getDailyReport,
  getWeeklyReport,
  getMaintenanceReport,
  getCriticalReport,
  buildEventImageUrl,
} from '../services/api';

let toastId = 0;

const REPORTS = [
  {
    key: 'overview',
    title: 'Overview Report',
    ar: 'تقرير عام',
    desc: 'ملخص شامل لحالة النظام والتنبيهات والأعطال',
  },
  {
    key: 'daily',
    title: 'Daily Report',
    ar: 'تقرير يومي',
    desc: 'ملخص تشغيل وفحص اليوم',
  },
  {
    key: 'weekly',
    title: 'Weekly Report',
    ar: 'تقرير أسبوعي',
    desc: 'تحليل أسبوعي للتنبيهات والأعطال',
  },
  {
    key: 'maintenance',
    title: 'Maintenance Report',
    ar: 'تقرير الصيانة',
    desc: 'متابعة الأعطال المؤكدة ومراحل الإصلاح',
  },
  {
    key: 'critical',
    title: 'Critical Report',
    ar: 'تقرير الأعطال الحرجة',
    desc: 'كل الحالات التي تحتاج تدخل سريع',
  },
];

const SEVERITY_VARIANT = {
  critical: 'danger',
  high: 'danger',
  medium: 'warning',
  low: 'neutral',
};

const STATUS_VARIANT = {
  confirmed: 'info',
  assigned: 'warning',
  repair_started: 'warning',
  repaired: 'success',
  verified: 'success',
  closed: 'neutral',
  rejected: 'danger',
  new: 'info',
  under_review: 'warning',
  resolved: 'success',
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

function countBy(items, keyGetter) {
  const map = {};

  for (const item of items || []) {
    const key = keyGetter(item) || 'unknown';
    map[key] = (map[key] || 0) + 1;
  }

  return Object.entries(map)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

function getAlertType(alert) {
  return (
    alert.primary_defect ||
    alert.defect?.type ||
    alert.defects?.[0]?.type ||
    alert.defects?.[0]?.class_name ||
    'unknown'
  );
}

function getFaultType(fault) {
  return fault.defect_type || fault.primary_defect || 'unknown';
}

function getOpenFaults(faults) {
  return faults.filter((f) => !['closed', 'rejected'].includes(f.status));
}

function ReportIcon({ type }) {
  const icons = {
    alerts: (
      <>
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 01-3.46 0" />
      </>
    ),
    faults: (
      <>
        <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.1-3.1a6 6 0 01-7.9 7.9l-5.6 5.6a2.1 2.1 0 01-3-3l5.6-5.6a6 6 0 017.9-7.9l-3.1 3.1z" />
      </>
    ),
    critical: (
      <>
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </>
    ),
    sessions: (
      <>
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
        <path d="M4 22v-7" />
      </>
    ),
  };

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      {icons[type]}
    </svg>
  );
}

function buildReportText(reportType, data, summary) {
  const now = new Date().toLocaleString();

  const lines = [
    'DPATIMS Inspection Report',
    `Report Type: ${reportType}`,
    `Generated At: ${now}`,
    '',
    'System Summary:',
    `- Backend Status: ${data.health?.status || '--'}`,
    `- Database: ${data.health?.database || '--'}`,
    `- DevKit Connected: ${data.health?.realtime?.devkit_connected ? 'Yes' : 'No'}`,
    `- Pipeline Connected: ${data.health?.realtime?.pipeline_connected ? 'Yes' : 'No'}`,
    '',
    'Inspection Summary:',
    `- Total Alerts: ${summary.totalAlerts}`,
    `- Critical Alerts: ${summary.criticalAlerts}`,
    `- Confirmed Faults: ${summary.totalFaults}`,
    `- Open Faults: ${summary.openFaults}`,
    `- Closed / Verified Faults: ${summary.closedFaults}`,
    `- Sessions: ${summary.totalSessions}`,
    '',
    'Top Defect Types:',
    ...summary.topTypes.slice(0, 5).map((x) => `- ${x.name}: ${x.count}`),
    '',
    'Top Sleepers:',
    ...summary.topSleepers.slice(0, 5).map((x) => `- ${x.name}: ${x.count}`),
    '',
    'Recent Faults:',
    ...data.faults.slice(0, 6).map((f) => {
      return `- ${f.fault_id || f._id} | ${f.defect_type} | ${f.severity} | ${f.status} | ${f.nearest_sleeper || '--'} | ${f.defect_position_cm ?? '--'} cm`;
    }),
  ];

  return lines.join('\n');
}
function getFaultImage(fault, camera) {
  return fault?.before_images?.[camera] || fault?.alert_ref?.images?.[camera] || '';
}

function ReportPrintView({ reportTitle, data, summary }) {
  const importantFaults = (data.faults || []).slice(0, 6);

  return (
    <div className="print-report">
      <div className="print-report-header">
        <div>
          <span>DPATIMS</span>
          <h1>{reportTitle}</h1>
          <p>Digital Predictive Railway Inspection & Maintenance System</p>
        </div>

        <div className="print-report-meta">
          <strong>{new Date().toLocaleString('ar-EG')}</strong>
          <small>Generated by DPATIMS Dashboard</small>
        </div>
      </div>

      <div className="print-status-row">
        <div>
          <span>Database</span>
          <strong>{data.health?.database || '--'}</strong>
        </div>

        <div>
          <span>Python Pipeline</span>
          <strong>{data.health?.realtime?.pipeline_connected ? 'Online' : 'Offline'}</strong>
        </div>

        <div>
          <span>DevKit</span>
          <strong>{data.health?.realtime?.devkit_connected ? 'Online' : 'Offline'}</strong>
        </div>

        <div>
          <span>Report Status</span>
          <strong>Ready</strong>
        </div>
      </div>

      <div className="print-kpi-grid">
        <div>
          <span>Total Alerts</span>
          <strong>{summary.totalAlerts}</strong>
        </div>

        <div>
          <span>Confirmed Faults</span>
          <strong>{summary.totalFaults}</strong>
        </div>

        <div>
          <span>Critical Cases</span>
          <strong>{summary.criticalAlerts + summary.criticalFaults}</strong>
        </div>

        <div>
          <span>Open Faults</span>
          <strong>{summary.openFaults}</strong>
        </div>

        <div>
          <span>Closed / Verified</span>
          <strong>{summary.closedFaults}</strong>
        </div>

        <div>
          <span>Sessions</span>
          <strong>{summary.totalSessions}</strong>
        </div>
      </div>

      <div className="print-two-cols">
        <div className="print-section">
          <h2>Top Defect Types</h2>

          {summary.topTypes.length ? (
            summary.topTypes.slice(0, 6).map((item, index) => (
              <div className="print-rank-row" key={item.name}>
                <span>{index + 1}</span>
                <strong>{item.name}</strong>
                <b>{item.count}</b>
              </div>
            ))
          ) : (
            <p>No defect types available.</p>
          )}
        </div>

        <div className="print-section">
          <h2>Top Affected Sleepers</h2>

          {summary.topSleepers.length ? (
            summary.topSleepers.slice(0, 6).map((item, index) => (
              <div className="print-rank-row" key={item.name}>
                <span>{index + 1}</span>
                <strong>{item.name}</strong>
                <b>{item.count}</b>
              </div>
            ))
          ) : (
            <p>No sleeper data available.</p>
          )}
        </div>
      </div>

      <div className="print-section">
        <h2>Recent Maintenance Faults</h2>

        <table className="print-table">
          <thead>
            <tr>
              <th>Fault ID</th>
              <th>Type</th>
              <th>Severity</th>
              <th>Status</th>
              <th>Camera</th>
              <th>Sleeper</th>
              <th>Position</th>
            </tr>
          </thead>

          <tbody>
            {(data.faults || []).slice(0, 10).map((fault) => (
              <tr key={fault._id}>
                <td>{String(fault.fault_id || fault._id).slice(0, 18)}</td>
                <td>{fault.defect_type || '--'}</td>
                <td>{fault.severity || '--'}</td>
                <td>{fault.status || '--'}</td>
                <td>{fault.camera || '--'}</td>
                <td>{fault.nearest_sleeper || '--'}</td>
                <td>{fault.defect_position_cm ?? '--'} cm</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="print-section">
        <h2>Fault Evidence Images</h2>

        <div className="print-images-grid">
          {importantFaults.length ? (
            importantFaults.map((fault) => {
              const front = getFaultImage(fault, 'front');
              const rear = getFaultImage(fault, 'rear');

              return (
                <div className="print-evidence-card" key={fault._id}>
                  <div className="print-evidence-title">
                    <strong>{fault.defect_type || 'Fault'}</strong>
                    <span>
                      {fault.nearest_sleeper || '--'} • {fault.camera || '--'} • {fault.severity || '--'}
                    </span>
                  </div>

                  <div className="print-evidence-images">
                    <div>
                      <span>Front</span>
                      {front ? (
                        <img src={buildEventImageUrl(front)} alt="Front evidence" />
                      ) : (
                        <em>No front image</em>
                      )}
                    </div>

                    <div>
                      <span>Rear</span>
                      {rear ? (
                        <img src={buildEventImageUrl(rear)} alt="Rear evidence" />
                      ) : (
                        <em>No rear image</em>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p>No fault evidence images available.</p>
          )}
        </div>
      </div>

      <div className="print-footer">
        <span>DPATIMS Smart Railway Inspection</span>
        <span>Generated automatically from AI alerts, confirmed faults, and maintenance records.</span>
      </div>
    </div>
  );
}
export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState('overview');

  const [data, setData] = useState({
    health: null,
    alertStats: {},
    faultStats: {},
    alerts: [],
    faults: [],
    sessions: [],
  });

  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [printMode, setPrintMode] = useState(false);

  const selectedReport = REPORTS.find((r) => r.key === activeReport);

  function addToast(message, type = 'info') {
    const id = ++toastId;
    const duration = type === 'danger' ? 3500 : 2400;

    setToasts((prev) => [...prev, { id, message, type, duration }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }

  async function load(type = activeReport) {
    setLoading(true);

    try {
      let result;

      if (type === 'daily') {
        result = await getDailyReport({ limit: 250 });
      } else if (type === 'weekly') {
        result = await getWeeklyReport({ limit: 500 });
      } else if (type === 'maintenance') {
        result = await getMaintenanceReport({ limit: 300 });
      } else if (type === 'critical') {
        result = await getCriticalReport({ limit: 300 });
      } else {
        result = await getReportsOverview({ limit: 300 });
      }

      setData({
        health: result.health || null,
        alertStats: result.alertStats || {},
        faultStats: result.faultStats || {},
        alerts: Array.isArray(result.alerts) ? result.alerts : [],
        faults: Array.isArray(result.faults) ? result.faults : [],
        sessions: Array.isArray(result.sessions) ? result.sessions : [],
      });
    } catch (err) {
      addToast(err?.message || 'فشل تحميل التقرير', 'danger');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(activeReport);
  }, [activeReport]);

  const summary = useMemo(() => {
    const alerts = data.alerts || [];
    const faults = data.faults || [];
    const sessions = data.sessions || [];

    const criticalAlerts = alerts.filter((a) => a.severity === 'critical').length;
    const criticalFaults = faults.filter((f) => f.severity === 'critical').length;

    const openFaults = getOpenFaults(faults).length;

    const closedFaults = faults.filter((f) =>
      ['closed', 'verified', 'repaired'].includes(f.status)
    ).length;

    const topTypes = countBy(
      [
        ...alerts.map((a) => ({ type: getAlertType(a) })),
        ...faults.map((f) => ({ type: getFaultType(f) })),
      ],
      (x) => x.type
    );

    const topSleepers = countBy(
      [...alerts, ...faults],
      (x) => x.nearest_sleeper || x.defect?.nearest_sleeper
    );

    const topZones = countBy(
      [...alerts, ...faults],
      (x) => x.track_zone
    );

    return {
      totalAlerts: alerts.length,
      totalFaults: faults.length,
      totalSessions: sessions.length,
      criticalAlerts,
      criticalFaults,
      openFaults,
      closedFaults,
      topTypes,
      topSleepers,
      topZones,
    };
  }, [data]);

  async function copyReport() {
    try {
      const selected = REPORTS.find((r) => r.key === activeReport);
      const text = buildReportText(selected?.title || activeReport, data, summary);

      await navigator.clipboard.writeText(text);
      addToast('تم نسخ التقرير كنص جاهز', 'success');
    } catch {
      addToast('تعذر نسخ التقرير', 'danger');
    }
  }

  function handlePrintReport() {
    setPrintMode(true);

    setTimeout(() => {
      window.print();

      setTimeout(() => {
        setPrintMode(false);
      }, 800);
    }, 300);
  }

  return (
    <div className="page-stack">
      <Toast toasts={toasts} />

      <SectionHeader
        title="التقارير"
        subtitle="Inspection & Maintenance Reports"
        action={
          <div className="reports-actions">
            <button className="pro-refresh-btn" onClick={() => load(activeReport)}>
              تحديث
            </button>

            <button className="report-copy-btn" onClick={copyReport}>
              Copy Report
            </button>

            <button className="report-print-btn" onClick={handlePrintReport}>
              Print / PDF
            </button>
          </div>
        }
      />

      <div className="reports-tabs">
        {REPORTS.map((report) => (
          <button
            key={report.key}
            className={activeReport === report.key ? 'active' : ''}
            onClick={() => setActiveReport(report.key)}
          >
            <strong>{report.ar}</strong>
            <span>{report.title}</span>
          </button>
        ))}
      </div>

      <div className="report-hero-card">
        <div>
          <span>Active Report</span>
          <h2>{selectedReport?.ar}</h2>
          <p>{selectedReport?.desc}</p>
        </div>

        <div className="report-health-mini">
          <StatusBadge
            status={data.health?.database || 'DB --'}
            variant={data.health?.database === 'connected' ? 'success' : 'danger'}
            dot
          />

          <StatusBadge
            status={data.health?.realtime?.pipeline_connected ? 'Pipeline Online' : 'Pipeline Offline'}
            variant={data.health?.realtime?.pipeline_connected ? 'success' : 'danger'}
            dot
          />

          <StatusBadge
            status={data.health?.realtime?.devkit_connected ? 'DevKit Online' : 'DevKit Offline'}
            variant={data.health?.realtime?.devkit_connected ? 'success' : 'danger'}
            dot
          />
        </div>
      </div>

      <div className="grid-4">
        <StatCard
          label="Total Alerts"
          value={summary.totalAlerts}
          color="blue"
          subtitle="AI detections"
          icon={<ReportIcon type="alerts" />}
        />

        <StatCard
          label="Confirmed Faults"
          value={summary.totalFaults}
          color="amber"
          subtitle="Maintenance cases"
          icon={<ReportIcon type="faults" />}
        />

        <StatCard
          label="Critical Cases"
          value={summary.criticalAlerts + summary.criticalFaults}
          color={summary.criticalAlerts + summary.criticalFaults > 0 ? 'red' : 'green'}
          subtitle="Need attention"
          icon={<ReportIcon type="critical" />}
        />

        <StatCard
          label="Sessions"
          value={summary.totalSessions}
          color="teal"
          subtitle="Inspection runs"
          icon={<ReportIcon type="sessions" />}
        />
      </div>

      <div className="grid-2">
        <PanelShell title="Top Defect Types" subtitle="Most repeated detected issues">
          <div className="report-rank-list">
            {summary.topTypes.length ? (
              summary.topTypes.slice(0, 8).map((item, index) => (
                <div className="report-rank-row" key={item.name}>
                  <span>{index + 1}</span>
                  <strong>{item.name}</strong>
                  <div>
                    <em style={{ width: `${Math.min(100, item.count * 12)}%` }} />
                  </div>
                  <b>{item.count}</b>
                </div>
              ))
            ) : (
              <p className="report-empty">No defect types available.</p>
            )}
          </div>
        </PanelShell>

        <PanelShell title="Top Sleepers" subtitle="Most affected track sleepers">
          <div className="report-rank-list">
            {summary.topSleepers.length ? (
              summary.topSleepers.slice(0, 8).map((item, index) => (
                <div className="report-rank-row" key={item.name}>
                  <span>{index + 1}</span>
                  <strong>{item.name}</strong>
                  <div>
                    <em style={{ width: `${Math.min(100, item.count * 12)}%` }} />
                  </div>
                  <b>{item.count}</b>
                </div>
              ))
            ) : (
              <p className="report-empty">No sleeper data available.</p>
            )}
          </div>
        </PanelShell>
      </div>

      <div className="grid-2">
        <PanelShell title="Recent Faults" subtitle="Latest maintenance cases">
          {data.faults.length ? (
            <div className="report-mini-table-wrap">
              <table className="report-mini-table">
                <thead>
                  <tr>
                    <th>Fault</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Sleeper</th>
                    <th>Updated</th>
                  </tr>
                </thead>

                <tbody>
                  {data.faults.slice(0, 8).map((fault) => (
                    <tr key={fault._id}>
                      <td>{String(fault.fault_id || fault._id).slice(0, 12)}</td>
                      <td>{fault.defect_type || '--'}</td>
                      <td>
                        <StatusBadge
                          status={fault.status || '--'}
                          variant={STATUS_VARIANT[fault.status] || 'neutral'}
                        />
                      </td>
                      <td>{fault.nearest_sleeper || '--'}</td>
                      <td>{fmtDate(fault.updatedAt || fault.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="report-empty">No faults available.</p>
          )}
        </PanelShell>

        <PanelShell title="Recent Alerts" subtitle="Latest AI alerts">
          {data.alerts.length ? (
            <div className="report-mini-table-wrap">
              <table className="report-mini-table">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Type</th>
                    <th>Severity</th>
                    <th>Camera</th>
                    <th>Confidence</th>
                  </tr>
                </thead>

                <tbody>
                  {data.alerts.slice(0, 8).map((alert) => {
                    const defect = alert.defect || alert.defects?.[0] || {};

                    return (
                      <tr key={alert._id}>
                        <td>{String(alert.event_id || alert._id).slice(0, 8)}</td>
                        <td>{getAlertType(alert)}</td>
                        <td>
                          <StatusBadge
                            status={alert.severity || '--'}
                            variant={SEVERITY_VARIANT[alert.severity] || 'neutral'}
                          />
                        </td>
                        <td>{alert.defect_camera || alert.camera || '--'}</td>
                        <td>{pct(defect.confidence || alert.confidence)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="report-empty">No alerts available.</p>
          )}
        </PanelShell>
      </div>

      <PanelShell title="Generated Report Preview" subtitle="Copy-ready operational summary">
        <pre className="report-preview">
{buildReportText(selectedReport?.title || activeReport, data, summary)}
        </pre>
      </PanelShell>

      {printMode && (
        <ReportPrintView
          reportTitle={selectedReport?.title || activeReport}
          data={data}
          summary={summary}
        />
      )}
    </div>
  );
}
