export default function StatCard({ label, value, icon, color = 'amber', subtitle }) {
  return (
    <div className="stat-card">
      <div className="stat-card-head">
        <span className="stat-card-label">{label}</span>
        {icon && (
          <span className={`stat-card-icon ${color}`}>
            {icon}
          </span>
        )}
      </div>
      <div className="stat-card-value">{value}</div>
      {subtitle && <div className="stat-card-sub">{subtitle}</div>}
    </div>
  )
}
