import StatusBadge from '../ui/StatusBadge'

export default function ControlPanel({
  speedPct,
  direction,
  isRunning,
  lastCommand,
  onForward,
  onBackward,
  onStop,
  onEmergency,
  onSpeedChange,
}) {
  return (
    <div className="control-panel">
      <div className="control-grid">
        <div className="control-direction">
          <button
            className={`ctrl-btn dir-btn ${direction === 'forward' ? 'active' : ''}`}
            onClick={onForward}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="18 15 12 9 6 15" />
            </svg>
            <span>تقدم</span>
          </button>
          <button
            className={`ctrl-btn dir-btn ${direction === 'backward' ? 'active' : ''}`}
            onClick={onBackward}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
            <span>تراجع</span>
          </button>
        </div>

        <div className="control-speed">
          <div className="speed-head">
            <span className="speed-label">السرعة</span>
            <span className="speed-val">{speedPct}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={speedPct}
            onChange={e => onSpeedChange(Number(e.target.value))}
            className="speed-slider"
          />
          <div className="speed-ticks">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        <div className="control-actions">
          <button className="ctrl-btn stop-btn" onClick={onStop}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="6" y="6" width="12" height="12" rx="1" />
            </svg>
            <span>إيقاف</span>
          </button>
          <button className="ctrl-btn emergency-btn" onClick={onEmergency}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>Emergency Stop</span>
          </button>
        </div>
      </div>

      <div className="control-status-grid">
        <div className="panel" style={{ padding: '12px 16px' }}>
          <div className="data-row" style={{ borderBottom: 'none', padding: '4px 0' }}>
            <span className="data-row-label">الحالة</span>
            <StatusBadge
              status={isRunning ? 'يعمل' : 'متوقف'}
              variant={isRunning ? 'success' : 'neutral'}
            />
          </div>
        </div>
        <div className="panel" style={{ padding: '12px 16px' }}>
          <div className="data-row" style={{ borderBottom: 'none', padding: '4px 0' }}>
            <span className="data-row-label">الاتجاه</span>
            <span className="data-row-value">
              {direction === 'forward' ? 'تقدم' : direction === 'backward' ? 'تراجع' : '--'}
            </span>
          </div>
        </div>
        <div className="panel" style={{ padding: '12px 16px' }}>
          <div className="data-row" style={{ borderBottom: 'none', padding: '4px 0' }}>
            <span className="data-row-label">السرعة الحالية</span>
            <span className="data-row-value">{speedPct}%</span>
          </div>
        </div>
        {lastCommand && (
          <div className="panel" style={{ padding: '12px 16px' }}>
            <div className="data-row" style={{ borderBottom: 'none', padding: '4px 0' }}>
              <span className="data-row-label">آخر أمر</span>
              <span className="data-row-value">{lastCommand}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
