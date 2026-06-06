import React from 'react';

function fmtDate(value) {
  if (!value) return '--';
  try {
    return new Date(value).toLocaleString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '--';
  }
}

function pct(value) {
  if (typeof value !== 'number') return '--';
  return `${(value * 100).toFixed(1)}%`;
}

function safeArray(arr) {
  return Array.isArray(arr) ? arr : [];
}

function getAlertType(alert) {
  return (
    alert?.primary_defect ||
    alert?.defect?.type ||
    alert?.defect?.class_name ||
    alert?.defects?.[0]?.type ||
    alert?.defects?.[0]?.class_name ||
    alert?.type ||
    '--'
  );
}

function getFaultType(fault) {
  return fault?.defect_type || fault?.type || '--';
}

function topList(list = [], max = 5) {
  return safeArray(list).slice(0, max);
}

function miniFaults(faults = [], max = 3) {
  return safeArray(faults).slice(0, max);
}

export default function ReportPrintView({ reportTitle, data, summary }) {
  const alerts = safeArray(data?.alerts);
  const faults = safeArray(data?.faults);
  const sessions = safeArray(data?.sessions);

  const topDefects = topList(summary?.topTypes, 6);
  const topSleepers = topList(summary?.topSleepers, 6);
  const recentFaults = miniFaults(faults, 3);

  const evidenceFaults = recentFaults.filter(
    (f) => f?.before_images?.front || f?.before_images?.rear
  );

  return (
    <div className="print-report-root">
      <div className="print-sheet one-page">
        {/* Header */}
        <div className="print-header">
          <div>
            <span className="print-kicker">DPRIMS Smart Railway Inspection</span>
            <h1>{reportTitle || 'Rail Inspection Executive Report'}</h1>
            <p className="print-sub">
              AI-generated operational summary for alerts, confirmed faults,
              maintenance status, and inspection activity.
            </p>
          </div>

          <div className="print-meta">
            <div><strong>Date:</strong> {fmtDate(new Date())}</div>
            <div><strong>System:</strong> DPRIMS Dashboard</div>
            <div><strong>Sessions:</strong> {sessions.length}</div>
          </div>
        </div>

        {/* KPI cards */}
        <div className="print-kpis">
          <div className="print-kpi">
            <span>Total Alerts</span>
            <strong>{summary?.totalAlerts ?? 0}</strong>
          </div>
          <div className="print-kpi">
            <span>Confirmed Faults</span>
            <strong>{summary?.totalFaults ?? 0}</strong>
          </div>
          <div className="print-kpi">
            <span>Critical Cases</span>
            <strong>{(summary?.criticalAlerts ?? 0) + (summary?.criticalFaults ?? 0)}</strong>
          </div>
          <div className="print-kpi">
            <span>Open Faults</span>
            <strong>{summary?.openFaults ?? 0}</strong>
          </div>
          <div className="print-kpi">
            <span>Closed Faults</span>
            <strong>{summary?.closedFaults ?? 0}</strong>
          </div>
          <div className="print-kpi">
            <span>Health DB</span>
            <strong>{data?.health?.database || '--'}</strong>
          </div>
        </div>

        {/* Main content compact grid */}
        <div className="print-main-grid">
          {/* Left column */}
          <div className="print-panel">
            <h3>Top Defect Types</h3>
            <div className="compact-rank-list">
              {topDefects.length ? topDefects.map((item, idx) => (
                <div className="compact-rank-row" key={`${item.name}-${idx}`}>
                  <span className="rank-index">{idx + 1}</span>
                  <span className="rank-name">{item.name}</span>
                  <span className="rank-count">{item.count}</span>
                </div>
              )) : <p className="print-empty">No data</p>}
            </div>
          </div>

          <div className="print-panel">
            <h3>Top Affected Sleepers</h3>
            <div className="compact-rank-list">
              {topSleepers.length ? topSleepers.map((item, idx) => (
                <div className="compact-rank-row" key={`${item.name}-${idx}`}>
                  <span className="rank-index">{idx + 1}</span>
                  <span className="rank-name">{item.name}</span>
                  <span className="rank-count">{item.count}</span>
                </div>
              )) : <p className="print-empty">No data</p>}
            </div>
          </div>

          <div className="print-panel span-2">
            <h3>Recent Maintenance Faults</h3>
            <table className="print-table compact">
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
                {recentFaults.length ? recentFaults.map((fault) => (
                  <tr key={fault._id}>
                    <td>{fault.fault_id || '--'}</td>
                    <td>{getFaultType(fault)}</td>
                    <td>{fault.severity || '--'}</td>
                    <td>{fault.status || '--'}</td>
                    <td>{fault.camera || '--'}</td>
                    <td>{fault.nearest_sleeper || '--'}</td>
                    <td>{fault.defect_position_cm ?? fault.track_position_cm ?? '--'} cm</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="7" className="td-empty">No maintenance faults</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="print-panel span-2">
            <h3>Latest Alert Summary</h3>
            <table className="print-table compact">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Type</th>
                  <th>Severity</th>
                  <th>Camera</th>
                  <th>Confidence</th>
                  <th>Sleeper</th>
                  <th>Position</th>
                </tr>
              </thead>
              <tbody>
                {alerts.slice(0, 4).map((alert) => (
                  <tr key={alert._id}>
                    <td>{String(alert.event_id || alert._id).slice(0, 8)}</td>
                    <td>{getAlertType(alert)}</td>
                    <td>{alert.severity || '--'}</td>
                    <td>{alert.defect_camera || alert.camera || '--'}</td>
                    <td>{pct(alert?.defect?.confidence || alert?.defects?.[0]?.confidence)}</td>
                    <td>{alert.nearest_sleeper || '--'}</td>
                    <td>{alert.defect_position_cm ?? alert.track_position_cm ?? '--'} cm</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Evidence section compact */}
        {evidenceFaults.length > 0 && (
          <div className="print-evidence">
            <h3>Fault Evidence Images</h3>

            <div className="print-evidence-grid">
              {evidenceFaults.slice(0, 2).map((fault) => (
                <div className="evidence-card" key={fault._id}>
                  <div className="evidence-head">
                    <strong>{fault.nearest_sleeper || '--'}</strong>
                    <span>{fault.camera || '--'} • {fault.severity || '--'} • {getFaultType(fault)}</span>
                  </div>

                  <div className="evidence-images">
                    <div className="evidence-img-wrap">
                      <span>Rear</span>
                      {fault?.before_images?.rear ? (
                        <img src={fault.before_images.rear} alt="rear evidence" />
                      ) : (
                        <div className="img-placeholder">No rear image</div>
                      )}
                    </div>

                    <div className="evidence-img-wrap">
                      <span>Front</span>
                      {fault?.before_images?.front ? (
                        <img src={fault.before_images.front} alt="front evidence" />
                      ) : (
                        <div className="img-placeholder">No front image</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="print-footer">
          <span>Generated automatically from AI alerts, confirmed faults, and maintenance records</span>
          <strong>DPRIMS Smart Railway Inspection</strong>
        </div>
      </div>
    </div>
  );
}