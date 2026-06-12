import { useState } from 'react'

export default function CameraCard({ title, ip, url, metrics }) {
  const [error, setError] = useState(false)

  return (
    <div className="cam-card">
      <div className="cam-head">
        <div>
          <h3>{title}</h3>
          <p className="cam-head-sub">{ip}</p>
        </div>
        <span className={`status-badge ${error ? 'danger' : 'success'}`}>
          {error ? 'OFFLINE' : 'LIVE'}
        </span>
      </div>
      <div className="cam-body">
        {!error ? (
          <img src={url} alt={title} onError={() => setError(true)} />
        ) : (
          <div className="cam-fallback">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
            <span>Camera unavailable</span>
          </div>
        )}
      </div>
      {metrics && (
        <div className="cam-head" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <div className="cam-metrics">
            <span>FPS: {metrics.fps ?? '--'}</span>
            <span>Latency: {metrics.latency ?? '--'}</span>
            <span>Quality: {metrics.quality ?? '--'}</span>
          </div>
        </div>
      )}
    </div>
  )
}
