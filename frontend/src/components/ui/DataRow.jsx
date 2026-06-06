export default function DataRow({ label, value }) {
  return (
    <div className="data-row">
      <span className="data-row-label">{label}</span>
      <span className="data-row-value">{value}</span>
    </div>
  )
}