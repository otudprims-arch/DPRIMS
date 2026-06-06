// src/components/ui/StatusBadge.jsx
export default function StatusBadge({ status = '--', variant = 'neutral', dot = false }) {
  return (
    <span className={`status-badge ${variant}`}>
      {dot && <span className={`badge-dot ${variant}`} />}
      {status}
    </span>
  );
}