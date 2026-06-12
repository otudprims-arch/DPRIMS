// src/pages/ControlPage.jsx
import { useCallback, useMemo, useState } from 'react';

import CameraCard from '../components/cameras/CameraCard';
import TrackView from '../components/track/TrackView';

import { useTelemetry } from '../hooks/useTelemetry';
import { useSystemHealth } from '../hooks/useSystemHealth';
import { usePolling } from '../hooks/usePolling';

import {
  CAMERA_FRONT_URL,
  CAMERA_REAR_URL,
  sendControlCommand,
  getControlHistory,
} from '../services/api';

import SectionHeader from '../components/ui/SectionHeader';
import PanelShell from '../components/ui/PanelShell';
import DataRow from '../components/ui/DataRow';
import StatusBadge from '../components/ui/StatusBadge';
import ControlPanel from '../components/control/ControlPanel';
import Toast from '../components/ui/Toast';
import ConfirmModal from '../components/ui/ConfirmModal';

import {
  formatCm,
  formatSpeed,
  formatDateTime,
} from '../utils/formatters';

let toastId = 0;

function n(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function fmt1(value, suffix = '') {
  const num = Number(value);
  if (!Number.isFinite(num)) return '--';
  return `${num.toFixed(1)}${suffix}`;
}

function getAutoVariant(autoState, running) {
  if (autoState === 'forward' || autoState === 'return') return 'success';
  if (running) return 'warning';
  return 'neutral';
}

function getAutoLabel(autoState) {
  if (autoState === 'forward') return 'AUTO FORWARD';
  if (autoState === 'return') return 'AUTO RETURN';
  return 'AUTO OFF';
}

export default function ControlPage() {
  const { telemetry } = useTelemetry(700);
  const { health } = useSystemHealth(2500);

  const [confirmEmergency, setConfirmEmergency] = useState(false);
  const [lastAck, setLastAck] = useState(null);
  const [speedPct, setSpeedPct] = useState(60);
  const [lastCommand, setLastCommand] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [busyCommand, setBusyCommand] = useState(null);

  const { data: historyRes } = usePolling(
    () => getControlHistory(8),
    3000,
    []
  );

  const history = Array.isArray(historyRes)
    ? historyRes
    : Array.isArray(historyRes?.data)
      ? historyRes.data
      : [];

  const devkitConnected =
    Boolean(health?.realtime?.devkit_connected) ||
    Boolean(health?.realtime?.devkitConnected) ||
    Boolean(health?.devkit?.connected);

  const pipelineConnected =
    Boolean(health?.realtime?.pipeline_connected) ||
    Boolean(health?.realtime?.pipelineConnected) ||
    Boolean(health?.pipeline?.connected);

  const dbConnected = health?.database === 'connected';

  const running = Boolean(telemetry?.running);
  const direction = telemetry?.direction || 'stop';

  const pos = telemetry?.track_position_cm ?? telemetry?.official_position_cm ?? telemetry?.pos ?? 0;
  const speed = telemetry?.speed_cm_s ?? telemetry?.speed ?? 0;
  const rpm = telemetry?.speed_rpm ?? 0;
  const rssi = telemetry?.wifi_rssi ?? '--';

  const trackLength = telemetry?.track_length_cm ?? 304;
  const progress = telemetry?.track_progress_pct ?? ((n(pos) / n(trackLength, 304)) * 100);

  const frontWheel = telemetry?.front_wheel_cm ?? null;
  const rearWheel = telemetry?.rear_wheel_cm ?? null;
  const encoderCount = telemetry?.encoder_count ?? '--';
  const encoderDistance = telemetry?.encoder_distance_cm ?? null;
  const encoderRef = telemetry?.encoder_ref || '--';

  const nearestSleeper = telemetry?.nearest_sleeper || '--';
  const sleeperStart = telemetry?.sleeper_start_cm ?? null;
  const sleeperEnd = telemetry?.sleeper_end_cm ?? null;
  const sleeperCenter = telemetry?.sleeper_center_cm ?? null;
  const distanceToSleeper = telemetry?.distance_to_sleeper_cm ?? null;

  const zone = telemetry?.track_zone || '--';
  const autoState = telemetry?.auto_state || 'off';
  const autoEnabled = Boolean(telemetry?.auto) || autoState !== 'off';
  const lapCount = telemetry?.lap_count ?? 0;

  const railJointDistance = telemetry?.rail_joint_distance_cm ?? null;
  const isOnRailJoint = Boolean(telemetry?.is_on_rail_joint);
  const railJointStart = telemetry?.rail_joint_start_cm ?? 141;
  const railJointEnd = telemetry?.rail_joint_end_cm ?? 163;

  const connectionVariant = devkitConnected
    ? 'success'
    : pipelineConnected || dbConnected
      ? 'warning'
      : 'danger';

  const connectionLabel = devkitConnected
    ? 'DEVKIT CONNECTED'
    : pipelineConnected || dbConnected
      ? 'SYSTEM ONLINE / DEVKIT OFFLINE'
      : 'SYSTEM OFFLINE';

  const safetyState = useMemo(() => {
    if (!devkitConnected) {
      return {
        label: pipelineConnected || dbConnected
          ? 'DevKit Offline'
          : 'System Offline',
        variant: pipelineConnected || dbConnected ? 'warning' : 'danger',
        message:
          'أوامر التحكم سيتم تسجيلها في النظام، لكنها لن تصل للقطار إلا عند اتصال الـ DevKit.',
      };
    }

    if (autoEnabled) {
      return {
        label: getAutoLabel(autoState),
        variant: 'success',
        message:
          'Auto Mode يعمل محليًا داخل ESP32، والسيرفر فقط يرسل أوامر التشغيل أو الإيقاف.',
      };
    }

    if (running) {
      return {
        label: 'Train Moving',
        variant: 'warning',
        message:
          'القطار في وضع حركة يدوي. استخدم Stop أو Emergency عند الحاجة.',
      };
    }

    return {
      label: 'Safe Idle',
      variant: 'success',
      message:
        'النظام متصل والقطار في وضع آمن وجاهز لاستقبال الأوامر.',
    };
  }, [devkitConnected, pipelineConnected, dbConnected, running, autoEnabled, autoState]);

  const addToast = useCallback((message, type = 'info') => {
    const id = ++toastId;
    const duration = type === 'danger' ? 3500 : 2400;

    setToasts((prev) => [...prev, { id, message, type, duration }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, duration);
  }, []);

  async function handleCommand(command, extra = {}) {
    setBusyCommand(command);
    setLastCommand(command);

    try {
      const res = await sendControlCommand({
        trainId: 'Train01',
        cmd: command,
        action: command,
        value: extra.value ?? null,
        direction: extra.direction ?? direction,
        reason: extra.reason || 'manual_dashboard_command',
      });

      const ack =
        Boolean(res?.data?.ack) ||
        Boolean(res?.data?.devkit_connected) ||
        Boolean(res?.data?.devkitConnected);

      setLastAck({
        command,
        ack,
        time: new Date(),
        devkitConnected: ack,
      });

      if (command === 'speed') {
        setSpeedPct(extra.value);
      }

      const labelMap = {
        forward: 'Forward',
        backward: 'Backward',
        stop: 'Stop',
        emergency: 'Emergency Stop',
        speed: `Speed ${extra.value}%`,
        autoon: 'Auto Mode ON',
        autooff: 'Auto Mode OFF',
        resetenc: 'Encoder Reset',
        setpos: `Set Position ${extra.value}cm`,
      };

      if (ack) {
        addToast(
          `تم إرسال الأمر بنجاح: ${labelMap[command] || command}`,
          'success'
        );
      } else {
        addToast(
          `تم تسجيل الأمر لكن DevKit غير متصل: ${labelMap[command] || command}`,
          'danger'
        );
      }
    } catch (err) {
      addToast('فشل إرسال الأمر للباك إند', 'danger');
    } finally {
      setBusyCommand(null);
    }
  }

  return (
    <div className="page-stack">
      <Toast toasts={toasts} />

      <SectionHeader
        title="لوحة التحكم بالقطار"
        subtitle="Train Command Center"
        action={
          <StatusBadge
            status={connectionLabel}
            variant={connectionVariant}
            dot
          />
        }
      />

      <section className={`command-hero ${devkitConnected ? 'online' : 'offline'}`}>
        <div>
          <span className="hero-kicker">MANUAL + AUTO + SLEEPER CONTROL</span>
          <h2>تحكم مباشر مع تتبع السليبر والموقع الحقيقي للقطار</h2>
          <p>{safetyState.message}</p>

          <div className="command-hero-tags">
            <span>Zone: {zone}</span>
            <span>Sleeper: {nearestSleeper}</span>
            <span>Progress: {fmt1(progress, '%')}</span>
            <span>Lap: {lapCount}</span>
          </div>
        </div>

        <div className="command-hero-card">
          <StatusBadge
            status={safetyState.label}
            variant={safetyState.variant}
            dot
          />
          <strong>{running ? 'Running' : 'Stopped'}</strong>
          <span>Direction: {direction}</span>
          <span>Auto: {getAutoLabel(autoState)}</span>
        </div>
      </section>

      {lastAck && (
        <div className={`ack-banner ${lastAck.ack ? 'ok' : 'bad'}`}>
          <div>
            <strong>
              {lastAck.ack ? 'Command Delivered' : 'Command Not Delivered'}
            </strong>
            <span>
              آخر أمر: {lastAck.command} •{' '}
              {lastAck.time.toLocaleTimeString('ar-EG')}
            </span>
          </div>

          <StatusBadge
            status={lastAck.ack ? 'ACK TRUE' : 'ACK FALSE'}
            variant={lastAck.ack ? 'success' : 'danger'}
            dot
          />
        </div>
      )}

      <ControlPanel
        speedPct={speedPct}
        direction={direction}
        isRunning={running}
        lastCommand={lastCommand}
        busyCommand={busyCommand}
        devkitConnected={devkitConnected}
        onForward={() => handleCommand('forward', { direction: 'forward' })}
        onBackward={() => handleCommand('backward', { direction: 'backward' })}
        onStop={() => handleCommand('stop')}
        onEmergency={() => setConfirmEmergency(true)}
        onSpeedChange={(value) => handleCommand('speed', { value })}
        onAutoOn={() => handleCommand('autoon')}
        onAutoOff={() => handleCommand('autooff')}
        onResetEncoder={() => handleCommand('resetenc')}
      />

      <div className="control-live-grid">
        <div className="control-live-main">
          <PanelShell
            title="Live Track Movement"
            headerRight={
              <StatusBadge
                status={autoEnabled ? getAutoLabel(autoState) : running ? 'MOVING' : 'IDLE'}
                variant={getAutoVariant(autoState, running)}
                dot
              />
            }
          >
            <TrackView trackPosCm={pos} defects={[]} />

            <div className="movement-strip">
              <div>
                <span>Position</span>
                <strong>{formatCm(pos)}</strong>
              </div>

              <div>
                <span>Speed</span>
                <strong>{formatSpeed(speed)}</strong>
              </div>

              <div>
                <span>Sleeper</span>
                <strong>{nearestSleeper}</strong>
              </div>

              <div>
                <span>Auto</span>
                <strong>{getAutoLabel(autoState)}</strong>
              </div>
            </div>

            <div className="track-intelligence-card">
              <div className="track-progress-head">
                <div>
                  <strong>Track Progress</strong>
                  <span>{fmt1(progress, '%')} of {fmt1(trackLength, ' cm')}</span>
                </div>
                <StatusBadge status={zone} variant="info" />
              </div>

              <div className="track-progress-bar">
                <span style={{ width: `${Math.max(0, Math.min(100, n(progress)))}%` }} />
              </div>

              <div className="track-intel-grid">
                <div>
                  <span>Nearest Sleeper</span>
                  <strong>{nearestSleeper}</strong>
                  <em>
                    {sleeperStart != null && sleeperEnd != null
                      ? `${fmt1(sleeperStart, ' cm')} - ${fmt1(sleeperEnd, ' cm')}`
                      : '--'}
                  </em>
                </div>

                <div>
                  <span>Distance to Sleeper</span>
                  <strong>{distanceToSleeper != null ? fmt1(distanceToSleeper, ' cm') : '--'}</strong>
                  <em>Center: {sleeperCenter != null ? fmt1(sleeperCenter, ' cm') : '--'}</em>
                </div>

                <div>
                  <span>Rail Joint</span>
                  <strong>{isOnRailJoint ? 'ON JOINT' : 'Clear'}</strong>
                  <em>
                    {isOnRailJoint
                      ? `${fmt1(railJointStart, ' cm')} - ${fmt1(railJointEnd, ' cm')}`
                      : `${railJointDistance != null ? fmt1(railJointDistance, ' cm') : '--'} away`}
                  </em>
                </div>

                <div>
                  <span>Wheels</span>
                  <strong>
                    F: {frontWheel != null ? fmt1(frontWheel, ' cm') : '--'}
                  </strong>
                  <em>
                    R: {rearWheel != null ? fmt1(rearWheel, ' cm') : '--'}
                  </em>
                </div>
              </div>
            </div>
          </PanelShell>
        </div>

        <div className="control-live-side">
          <div className="mini-camera-stack">
            <CameraCard
              title="Front Camera"
              label="Live control view"
              url={CAMERA_FRONT_URL}
              status={pipelineConnected ? 'Monitoring' : 'Stream'}
            />

            <CameraCard
              title="Rear Camera"
              label="Rear verification view"
              url={CAMERA_REAR_URL}
              status={pipelineConnected ? 'Monitoring' : 'Stream'}
            />
          </div>
        </div>
      </div>

      <div className="grid-2">
        <PanelShell
          title="Live Telemetry"
          headerRight={
            <StatusBadge
              status={devkitConnected ? 'LIVE' : 'WAITING'}
              variant={devkitConnected ? 'success' : 'warning'}
              dot
            />
          }
        >
          <DataRow label="Position" value={formatCm(pos)} />
          <DataRow label="Track Progress" value={`${fmt1(progress, '%')}`} />
          <DataRow label="Zone" value={zone} />
          <DataRow label="Nearest Sleeper" value={nearestSleeper} />
          <DataRow
            label="Sleeper Range"
            value={
              sleeperStart != null && sleeperEnd != null
                ? `${fmt1(sleeperStart, ' cm')} - ${fmt1(sleeperEnd, ' cm')}`
                : '--'
            }
          />
          <DataRow
            label="Distance to Sleeper"
            value={distanceToSleeper != null ? fmt1(distanceToSleeper, ' cm') : '--'}
          />
          <DataRow
            label="Rail Joint"
            value={
              isOnRailJoint
                ? 'On Rail Joint'
                : railJointDistance != null
                  ? `${fmt1(railJointDistance, ' cm')} away`
                  : '--'
            }
          />
          <DataRow label="Front Wheel" value={frontWheel != null ? fmt1(frontWheel, ' cm') : '--'} />
          <DataRow label="Rear Wheel" value={rearWheel != null ? fmt1(rearWheel, ' cm') : '--'} />
          <DataRow label="Encoder Count" value={encoderCount} />
          <DataRow label="Encoder Distance" value={encoderDistance != null ? fmt1(encoderDistance, ' cm') : '--'} />
          <DataRow label="Encoder Ref" value={encoderRef} />
          <DataRow label="Speed" value={formatSpeed(speed)} />
          <DataRow label="RPM" value={rpm} />
          <DataRow label="Direction" value={direction} />
          <DataRow
            label="Auto Mode"
            value={
              <StatusBadge
                status={getAutoLabel(autoState)}
                variant={getAutoVariant(autoState, running)}
              />
            }
          />
          <DataRow label="Lap Count" value={lapCount} />
          <DataRow
            label="Running"
            value={
              <StatusBadge
                status={running ? 'Yes' : 'No'}
                variant={running ? 'success' : 'neutral'}
              />
            }
          />
          <DataRow label="WiFi RSSI" value={`${rssi} dBm`} />
          <DataRow
            label="DevKit"
            value={
              <StatusBadge
                status={devkitConnected ? 'Connected' : 'Offline'}
                variant={devkitConnected ? 'success' : 'danger'}
              />
            }
          />
          <DataRow
            label="AI Pipeline"
            value={
              <StatusBadge
                status={pipelineConnected ? 'Connected' : 'Offline'}
                variant={pipelineConnected ? 'success' : 'danger'}
              />
            }
          />
        </PanelShell>

        <PanelShell
          title="Command History"
          headerRight={
            <StatusBadge
              status={`${history.length} latest`}
              variant="info"
            />
          }
        >
          {history.length ? (
            <div className="command-history-list">
              {history.map((item) => (
                <div
                  key={item._id || item.id || `${item.command}-${item.createdAt}`}
                  className="command-history-item"
                >
                  <div>
                    <strong>{item.command || item.cmd || '--'}</strong>
                    <span>{formatDateTime(item.createdAt || item.ts)}</span>
                  </div>

                  <StatusBadge
                    status={item.ack ? 'ACK' : 'FAILED'}
                    variant={item.ack ? 'success' : 'danger'}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">لا توجد أوامر مسجلة حتى الآن</div>
          )}
        </PanelShell>
      </div>

      <ConfirmModal
        open={confirmEmergency}
        title="تأكيد التوقف الطارئ"
        message="هل أنت متأكد أنك تريد إرسال أمر Emergency Stop للقطار؟ سيتم تسجيل الأمر في النظام فورًا."
        confirmLabel="إرسال Emergency"
        cancelLabel="إلغاء"
        tone="danger"
        onCancel={() => setConfirmEmergency(false)}
        onConfirm={() => {
          setConfirmEmergency(false);
          handleCommand('emergency', {
            reason: 'manual_emergency_stop_confirmed',
          });
        }}
      />
    </div>
  );
}
