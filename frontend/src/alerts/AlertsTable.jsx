import StatusBadge from '../ui/StatusBadge'

function getSeverity(alert) {
  const score = alert.ssim_anomaly_score
  if (score != null && score > 0.5) return 'critical'
  if (score != null && score > 0.3) return 'warning'
  if (alert.defects?.length > 0) return 'warning'
  return 'info'
}

const SEVERITY_MAP = {
  critical: { label: 'Critical', variant: 'danger' },
  warning: { label: 'Warning', variant: 'warning' },
  info: { label: 'Info', variant: 'info' },
}

export default function AlertsTable({ alerts, onView }) {
  if (!alerts.length) {
    return <div className="alerts-empty">لا توجد تنبيهات حاليا</div>
  }

  return (
    <div className="alerts-table-wrap">
      <table className="alerts-table">
        <thead>
          <tr>
            <th>الوقت</th>
            <th>الكاميرا</th>
            <th>النوع</th>
            <th>العيب</th>
            <th>Confidence</th>
            <th>الموقع</th>
            <th>المستوى</th>
            <th>الحالة</th>
            <th>إجراء</th>
          </tr>
        </thead>
        <tbody>
          {alerts.map(alert => {
            const firstDefect = alert.defects?.[0]
            const sev = getSeverity(alert)
            const sevInfo = SEVERITY_MAP[sev]

            return (
              <tr key={alert._id}>
                <td>
                  {alert.createdAt
                    ? new Date(alert.createdAt).toLocaleTimeString('ar-EG')
                    : '--'}
                </td>
                <td>{alert.camera || '--'}</td>
                <td>{alert.type || '--'}</td>
                <td>{firstDefect?.class_name || 'SSIM / Unknown'}</td>
                <td>
                  {typeof firstDefect?.confidence === 'number'
                    ? `${(firstDefect.confidence * 100).toFixed(1)}%`
                    : '--'}
                </td>
                <td>
                  {typeof alert.track_position_cm === 'number'
                    ? `${alert.track_position_cm.toFixed(1)} cm`
                    : '--'}
                </td>
                <td>
                  <StatusBadge status={sevInfo.label} variant={sevInfo.variant} />
                </td>
                <td>
                  <StatusBadge status="Open" variant="warning" />
                </td>
                <td>
                  <button className="table-view-btn" onClick={() => onView(alert)}>
                    عرض
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}