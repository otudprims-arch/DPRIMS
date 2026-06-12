// src/components/control/ControlPanel.jsx
import StatusBadge from '../ui/StatusBadge';

function CommandButton({
  label,
  sub,
  icon,
  tone = 'default',
  active = false,
  disabled = false,
  loading = false,
  onClick,
}) {
  return (
    <button
      className={`pro-command-btn ${tone} ${active ? 'active' : ''}`}
      disabled={disabled || loading}
      onClick={onClick}
    >
      <span className="pro-command-icon">{icon}</span>
      <span className="pro-command-text">
        <strong>{loading ? 'Sending...' : label}</strong>
        <small>{sub}</small>
      </span>
    </button>
  );
}

export default function ControlPanel({
  speedPct,
  direction,
  isRunning,
  lastCommand,
  busyCommand,
  devkitConnected,
  onForward,
  onBackward,
  onStop,
  onEmergency,
  onSpeedChange,
  onAutoOn,
  onAutoOff,
  onResetEncoder,
}) {
  return (
    <div className="pro-control-panel">
      <div className="pro-control-header">
        <div>
          <span className="hero-kicker">CONTROL SURFACE</span>
          <h3>Train Motion Control</h3>
          <p>Manual movement, emergency actions, auto mode, and encoder reset.</p>
        </div>

        <StatusBadge
          status={devkitConnected ? 'READY' : 'OFFLINE'}
          variant={devkitConnected ? 'success' : 'danger'}
          dot
        />
      </div>

      <div className="pro-command-grid">
        <CommandButton
          label="Forward"
          sub="تقدم للأمام"
          active={direction === 'forward' && isRunning}
          loading={busyCommand === 'forward'}
          disabled={!devkitConnected}
          onClick={onForward}
          icon={
            <svg viewBox="0 0 24 24">
              <polyline points="18 15 12 9 6 15" />
            </svg>
          }
        />

        <CommandButton
          label="Backward"
          sub="رجوع للخلف"
          active={direction === 'backward' && isRunning}
          loading={busyCommand === 'backward'}
          disabled={!devkitConnected}
          onClick={onBackward}
          icon={
            <svg viewBox="0 0 24 24">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          }
        />

        <CommandButton
          label="Stop"
          sub="إيقاف ناعم"
          tone="warning"
          loading={busyCommand === 'stop'}
          disabled={!devkitConnected}
          onClick={onStop}
          icon={
            <svg viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          }
        />

        <CommandButton
          label="Emergency"
          sub="توقف طارئ"
          tone="danger"
          loading={busyCommand === 'emergency'}
          disabled={!devkitConnected}
          onClick={onEmergency}
          icon={
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          }
        />
      </div>

      <div className="speed-console">
        <div className="speed-console-head">
          <div>
            <strong>Speed Request</strong>
            <span>القيمة تُرسل للـ ESP32 وتحفظ في السجل</span>
          </div>
          <strong className="speed-console-value">{speedPct}%</strong>
        </div>

        <input
          type="range"
          min="0"
          max="100"
          value={speedPct}
          onChange={(e) => onSpeedChange(Number(e.target.value))}
          disabled={!devkitConnected}
        />

        <div className="speed-console-ticks">
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>
      </div>

      <div className="aux-command-grid">
        <button disabled={!devkitConnected} onClick={onAutoOn}>
          Auto Mode ON
        </button>
        <button disabled={!devkitConnected} onClick={onAutoOff}>
          Auto Mode OFF
        </button>
        <button disabled={!devkitConnected} onClick={onResetEncoder}>
          Reset Encoder
        </button>
      </div>

      <div className="control-summary-grid">
        <div>
          <span>Status</span>
          <strong>{isRunning ? 'Running' : 'Stopped'}</strong>
        </div>
        <div>
          <span>Direction</span>
          <strong>{direction || '--'}</strong>
        </div>
        <div>
          <span>Last Command</span>
          <strong>{lastCommand || '--'}</strong>
        </div>
        <div>
          <span>Connection</span>
          <strong>{devkitConnected ? 'Online' : 'Offline'}</strong>
        </div>
      </div>
    </div>
  );
}
