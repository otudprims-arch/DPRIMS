// src/components/track/TrackView.jsx
import { useEffect, useId, useMemo, useState } from 'react';
import {
  TRACK_CALIBRATION,
  clampTrackCm,
  getFrontCameraPosition,
  getNearestSleeper,
  getRearCameraPosition,
  getTrackZone,
} from '../../config/calibration';

const SVG_W = 820;
const SVG_H = 285;

const RAIL_X = 70;
const RAIL_W = 680;

const TRACK_Y_TOP = 132;
const TRACK_Y_BOTTOM = 166;

const SLEEPER_Y = 105;
const SLEEPER_H = 94;

const TRAIN_Y = 42;
const RULER_Y = 225;

function cmToX(cm) {
  const safe = clampTrackCm(cm);
  return RAIL_X + (RAIL_W * safe) / TRACK_CALIBRATION.TRACK_LENGTH_CM;
}

function rawCmToX(cm) {
  return RAIL_X + (RAIL_W * Number(cm || 0)) / TRACK_CALIBRATION.TRACK_LENGTH_CM;
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function defectColor(alert) {
  const severity = alert?.severity || alert?.defect?.severity;

  if (severity === 'critical') return '#ef4444';
  if (severity === 'high') return '#f97316';
  if (severity === 'medium') return '#f59e0b';

  const s = alert?.ssim_anomaly_score ?? alert?.ssim_score;
  if (s != null && s > 0.5) return '#ef4444';
  if (s != null && s > 0.3) return '#f59e0b';

  return '#eab308';
}

function defectLabel(alert) {
  return (
    alert?.primary_defect ||
    alert?.defect?.type ||
    alert?.defects?.[0]?.type ||
    alert?.defects?.[0]?.class_name ||
    'defect'
  );
}

function getDefectPos(alert) {
  return (
    alert?.defect_position_cm ??
    alert?.track_position_cm ??
    alert?.defect?.track_position_cm ??
    0
  );
}

function getSleeperLabel(value) {
  if (typeof value === 'string') return value.startsWith('S') ? value : `S${value}`;
  if (typeof value === 'number') return `S${value}`;
  return '--';
}

function railJointRange() {
  const start =
    TRACK_CALIBRATION.RAIL_JOINT_START_CM ??
    TRACK_CALIBRATION.RAIL_JOIN_START_CM ??
    141;

  const end =
    TRACK_CALIBRATION.RAIL_JOINT_END_CM ??
    TRACK_CALIBRATION.RAIL_JOIN_END_CM ??
    163;

  const center =
    TRACK_CALIBRATION.RAIL_JOINT_CENTER_CM ??
    TRACK_CALIBRATION.RAIL_JOIN_CENTER_CM ??
    152;

  return { start, end, center };
}

function shortLabel(label) {
  if (!label) return 'defect';
  if (label.length <= 18) return label;
  return `${label.slice(0, 17)}…`;
}

function labelWidth(label) {
  const text = String(label || '');
  return Math.max(70, Math.min(150, text.length * 7 + 20));
}

export default function TrackView({
  trackPosCm = 0,
  defects = [],
  showDetails = true,
}) {
  const uid = useId().replace(/:/g, '');
  const [animated, setAnimated] = useState(trackPosCm);

  useEffect(() => {
    const id = setInterval(() => {
      setAnimated((prev) => {
        const diff = safeNumber(trackPosCm) - prev;
        if (Math.abs(diff) < 0.1) return safeNumber(trackPosCm);
        return prev + diff * 0.16;
      });
    }, 22);

    return () => clearInterval(id);
  }, [trackPosCm]);

  const encoderPos = clampTrackCm(animated);
  const frontCamPos = getFrontCameraPosition(encoderPos);
  const rearCamPos = getRearCameraPosition(encoderPos);

  // حساب واقعي مع رسم بصري أنضف بدون كسر calibration
  const rawTrainStart = encoderPos - TRACK_CALIBRATION.FRONT_TO_REAR_AXLE_CM;
  const rawTrainEnd = rawTrainStart + TRACK_CALIBRATION.TRAIN_BODY_LENGTH_CM;

  const realTrainStartX = Math.max(RAIL_X - 18, rawCmToX(rawTrainStart));
  const realTrainEndX = Math.min(RAIL_X + RAIL_W + 18, rawCmToX(rawTrainEnd));
  const realTrainWidth = Math.max(80, realTrainEndX - realTrainStartX);

  const trainWidth = Math.max(94, Math.min(150, realTrainWidth));
  const trainCenterX = (realTrainStartX + realTrainEndX) / 2;
  const trainStartX = trainCenterX - trainWidth / 2;
  const trainEndX = trainStartX + trainWidth;

  const encoderX = cmToX(encoderPos);
  const frontCamX = cmToX(frontCamPos);
  const rearCamX = cmToX(rearCamPos);

  const progress = Math.max(
    0,
    Math.min(100, (encoderPos / TRACK_CALIBRATION.TRACK_LENGTH_CM) * 100)
  );

  const railJoint = railJointRange();
  const railJointStartX = cmToX(railJoint.start);
  const railJointEndX = cmToX(railJoint.end);
  const railJointCenterX = cmToX(railJoint.center);
  const railJointW = Math.max(10, railJointEndX - railJointStartX);
  const onRailJoint = encoderPos >= railJoint.start && encoderPos <= railJoint.end;

  const sleepers = useMemo(() => {
    const count = TRACK_CALIBRATION.SLEEPER_COUNT || 15;
    const step = TRACK_CALIBRATION.TRACK_LENGTH_CM / (count - 1);

    return Array.from({ length: count }, (_, i) => {
      const cm = i * step;
      return {
        index: i + 1,
        cm,
        x: cmToX(cm),
      };
    });
  }, []);

  const uniqueDefects = useMemo(() => {
    const sorted = [...(Array.isArray(defects) ? defects : [])]
      .map((d) => ({
        ...d,
        _pos: clampTrackCm(getDefectPos(d)),
      }))
      .filter((d) => Number.isFinite(d._pos))
      .sort((a, b) => a._pos - b._pos);

    const out = [];

    for (const d of sorted) {
      const last = out[out.length - 1];

      if (last && Math.abs(last._pos - d._pos) < 4) {
        continue;
      }

      out.push(d);
    }

    return out;
  }, [defects]);

  const railJointDefects = uniqueDefects.filter((d) => {
    const label = defectLabel(d);
    const pos = d._pos;
    return (
      label === 'rail_joint_damage' ||
      label === 'rail_joint' ||
      (pos >= railJoint.start && pos <= railJoint.end)
    );
  });

  const nonRailJointDefects = uniqueDefects.filter((d) => {
    const label = defectLabel(d);
    const pos = d._pos;
    return !(
      label === 'rail_joint_damage' ||
      label === 'rail_joint' ||
      (pos >= railJoint.start && pos <= railJoint.end)
    );
  });

  const nearestSleeper = getNearestSleeper(encoderPos);
  const nearestSleeperLabel = getSleeperLabel(nearestSleeper);
  const zone = getTrackZone(encoderPos);

  const railGradient = `railGradient-${uid}`;
  const trainGradient = `trainGradient-${uid}`;
  const trainGlass = `trainGlass-${uid}`;
  const glow = `softGlow-${uid}`;
  const redGlow = `redGlow-${uid}`;
  const sleeperGradient = `sleeperGradient-${uid}`;
  const activeSleeperGradient = `activeSleeperGradient-${uid}`;

  return (
    <div className="track-view calibrated-track-view premium-track-view">
      <div className="track-info-strip premium-track-info">
        <div>
          <span>Encoder</span>
          <strong>{encoderPos.toFixed(1)} cm</strong>
        </div>

        <div>
          <span>Front Cam</span>
          <strong>{frontCamPos.toFixed(1)} cm</strong>
        </div>

        <div>
          <span>Rear Cam</span>
          <strong>{rearCamPos.toFixed(1)} cm</strong>
        </div>

        <div>
          <span>Nearest Sleeper</span>
          <strong>{nearestSleeperLabel}</strong>
        </div>

        <div>
          <span>Zone</span>
          <strong>{zone}</strong>
        </div>

        <div>
          <span>Rail Joint</span>
          <strong>
            {onRailJoint
              ? 'ON JOINT'
              : `${Math.abs(encoderPos - railJoint.center).toFixed(1)} cm`}
          </strong>
        </div>
      </div>

      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="track-svg premium-track-svg">
        <defs>
          <linearGradient id={railGradient} x1="0" x2="1">
            <stop offset="0%" stopColor="#172033" />
            <stop offset="18%" stopColor="#64748b" />
            <stop offset="50%" stopColor="#cbd5e1" />
            <stop offset="82%" stopColor="#64748b" />
            <stop offset="100%" stopColor="#172033" />
          </linearGradient>

          <linearGradient id={sleeperGradient} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="55%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          <linearGradient id={activeSleeperGradient} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="55%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#92400e" />
          </linearGradient>

          <linearGradient id={trainGradient} x1="0" x2="1">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="12%" stopColor="#1e3a8a" />
            <stop offset="52%" stopColor="#2563eb" />
            <stop offset="82%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#e0f2fe" />
          </linearGradient>

          <linearGradient id={trainGlass} x1="0" x2="1">
            <stop offset="0%" stopColor="#dbeafe" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#67e8f9" stopOpacity="0.7" />
          </linearGradient>

          <filter id={glow}>
            <feGaussianBlur stdDeviation="3.8" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id={redGlow}>
            <feGaussianBlur stdDeviation="4.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background panel */}
        <rect
          x="22"
          y="18"
          width={SVG_W - 44}
          height={SVG_H - 42}
          rx="22"
          fill="#020617"
          stroke="#172033"
        />

        <rect
          x="36"
          y="32"
          width={SVG_W - 72}
          height={SVG_H - 70}
          rx="18"
          fill="#050b16"
          stroke="#111827"
        />

        {/* Zone strip */}
        <g>
          <rect x={RAIL_X} y="62" width={RAIL_W / 3} height="7" rx="3.5" fill="#22c55e" opacity="0.52" />
          <rect x={RAIL_X + RAIL_W / 3} y="62" width={RAIL_W / 3} height="7" rx="3.5" fill="#f59e0b" opacity="0.52" />
          <rect x={RAIL_X + (RAIL_W * 2) / 3} y="62" width={RAIL_W / 3} height="7" rx="3.5" fill="#ef4444" opacity="0.52" />

          <text x={RAIL_X + RAIL_W / 6} y="55" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="800">Zone A</text>
          <text x={RAIL_X + RAIL_W / 2} y="55" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="800">Zone B</text>
          <text x={RAIL_X + (RAIL_W * 5) / 6} y="55" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="800">Zone C</text>
        </g>

        {/* Track base */}
        <rect
          x={RAIL_X - 14}
          y="92"
          width={RAIL_W + 28}
          height="126"
          rx="16"
          fill="#070b12"
          stroke="#172033"
        />

        {/* Rail joint area - background only */}
        <g>
          <rect
            x={railJointStartX}
            y="96"
            width={railJointW}
            height="112"
            rx="10"
            fill="#ef4444"
            opacity="0.08"
            stroke="#f87171"
            strokeDasharray="5,5"
          />
        </g>

        {/* Sleepers */}
        {sleepers.map((s) => {
          const isActive = nearestSleeperLabel === `S${s.index}`;
          const isPassed = s.cm <= encoderPos;

          return (
            <g key={s.index}>
              <rect
                x={s.x - 7.5}
                y={SLEEPER_Y}
                width="15"
                height={SLEEPER_H}
                rx="4"
                fill={isActive ? `url(#${activeSleeperGradient})` : `url(#${sleeperGradient})`}
                stroke={isActive ? '#fbbf24' : isPassed ? '#475569' : '#1f2937'}
                strokeWidth={isActive ? '1.8' : '1'}
                filter={isActive ? `url(#${glow})` : undefined}
              />

              <line
                x1={s.x - 5.2}
                y1={SLEEPER_Y + 6}
                x2={s.x + 5.2}
                y2={SLEEPER_Y + SLEEPER_H - 6}
                stroke={isActive ? '#fde68a' : '#334155'}
                strokeWidth="0.7"
                opacity="0.45"
              />

              <text
                x={s.x}
                y="215"
                textAnchor="middle"
                fill={isActive ? '#fbbf24' : '#64748b'}
                fontSize="8.5"
                fontWeight={isActive ? '900' : '700'}
                fontFamily="var(--mono)"
              >
                S{s.index}
              </text>
            </g>
          );
        })}

        {/* Rails */}
        <rect
          x={RAIL_X}
          y={TRACK_Y_TOP}
          width={RAIL_W}
          height="9"
          rx="4.5"
          fill={`url(#${railGradient})`}
        />

        <rect
          x={RAIL_X}
          y={TRACK_Y_BOTTOM}
          width={RAIL_W}
          height="9"
          rx="4.5"
          fill={`url(#${railGradient})`}
        />

        {/* Rail shine */}
        <rect x={RAIL_X + 8} y={TRACK_Y_TOP + 1.5} width={RAIL_W - 16} height="1.5" rx="1" fill="#f8fafc" opacity="0.35" />
        <rect x={RAIL_X + 8} y={TRACK_Y_BOTTOM + 1.5} width={RAIL_W - 16} height="1.5" rx="1" fill="#f8fafc" opacity="0.35" />

        {/* Rail joint foreground marker - drawn after rails */}
        <g>
          <line
            x1={railJointCenterX}
            y1="84"
            x2={railJointCenterX}
            y2="210"
            stroke="#f97316"
            strokeWidth="2"
            strokeDasharray="6,5"
            opacity="0.95"
          />

          <circle
            cx={railJointCenterX}
            cy="86"
            r="15"
            fill="#f97316"
            opacity="0.18"
          />
          <circle
            cx={railJointCenterX}
            cy="86"
            r="7"
            fill="#f97316"
            filter={`url(#${glow})`}
          />
          <circle
            cx={railJointCenterX}
            cy="86"
            r="2.5"
            fill="#fff"
          />

          <g transform={`translate(${railJointCenterX - 42}, 64)`}>
            <rect
              x="0"
              y="0"
              width="84"
              height="22"
              rx="9"
              fill="rgba(8,14,28,0.96)"
              stroke="rgba(249,115,22,0.65)"
            />
            <text
              x="42"
              y="15"
              textAnchor="middle"
              fill="#fed7aa"
              fontSize="8.5"
              fontWeight="900"
              fontFamily="var(--mono)"
            >
              RAIL JOINT
            </text>
          </g>
        </g>

        {/* Non rail-joint defects */}
        {nonRailJointDefects.map((d, i) => {
          const x = cmToX(d._pos);
          const color = defectColor(d);
          const label = shortLabel(defectLabel(d));
          const w = labelWidth(label);

          return (
            <g key={d._id || d.event_id || i}>
              <line
                x1={x}
                y1="76"
                x2={x}
                y2="128"
                stroke={color}
                strokeWidth="1.7"
                strokeDasharray="5,4"
                opacity="0.8"
              />

              <circle cx={x} cy="76" r="13" fill={color} opacity="0.16" />
              <circle cx={x} cy="76" r="7" fill={color} filter={`url(#${redGlow})`} />
              <circle cx={x} cy="76" r="2.4" fill="#fff" />

              {showDetails && (
                <g transform={`translate(${x - w / 2}, 45)`}>
                  <rect
                    x="0"
                    y="0"
                    width={w}
                    height="18"
                    rx="7"
                    fill="rgba(8,14,28,0.94)"
                    stroke={color}
                    opacity="0.98"
                  />
                  <text
                    x={w / 2}
                    y="12.5"
                    textAnchor="middle"
                    fill={color}
                    fontSize="8"
                    fontWeight="900"
                    fontFamily="var(--mono)"
                  >
                    {label}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Rail joint defects label - dedicated safe layer */}
        {railJointDefects.map((d, i) => {
          const color = defectColor(d);
          const label = shortLabel(defectLabel(d));
          const w = labelWidth(label);
          const y = 102 + i * 20;

          return (
            <g key={d._id || d.event_id || `joint-${i}`}>
              <g transform={`translate(${railJointCenterX - w / 2}, ${y})`}>
                <rect
                  x="0"
                  y="0"
                  width={w}
                  height="19"
                  rx="8"
                  fill="rgba(8,14,28,0.96)"
                  stroke={color}
                />
                <text
                  x={w / 2}
                  y="13"
                  textAnchor="middle"
                  fill={color}
                  fontSize="8"
                  fontWeight="900"
                  fontFamily="var(--mono)"
                >
                  {label}
                </text>
              </g>
            </g>
          );
        })}

        {/* Train group */}
        <g className="svg-train">
          <ellipse
            cx={trainStartX + trainWidth / 2}
            cy={TRAIN_Y + 72}
            rx={Math.max(36, trainWidth / 2)}
            ry="10"
            fill="#000"
            opacity="0.35"
          />

          <path
            d={`
              M ${trainStartX + 10} ${TRAIN_Y + 12}
              Q ${trainStartX + 15} ${TRAIN_Y} ${trainStartX + 34} ${TRAIN_Y}
              L ${trainEndX - 30} ${TRAIN_Y}
              Q ${trainEndX - 10} ${TRAIN_Y + 2} ${trainEndX - 4} ${TRAIN_Y + 20}
              L ${trainEndX - 4} ${TRAIN_Y + 48}
              Q ${trainEndX - 8} ${TRAIN_Y + 57} ${trainEndX - 20} ${TRAIN_Y + 57}
              L ${trainStartX + 13} ${TRAIN_Y + 57}
              Q ${trainStartX + 2} ${TRAIN_Y + 57} ${trainStartX + 2} ${TRAIN_Y + 46}
              L ${trainStartX + 2} ${TRAIN_Y + 22}
              Q ${trainStartX + 3} ${TRAIN_Y + 15} ${trainStartX + 10} ${TRAIN_Y + 12}
              Z
            `}
            fill={`url(#${trainGradient})`}
            stroke="#bfdbfe"
            strokeWidth="1.2"
            filter={`url(#${glow})`}
          />

          <path
            d={`
              M ${trainEndX - 38} ${TRAIN_Y + 7}
              Q ${trainEndX - 10} ${TRAIN_Y + 12} ${trainEndX - 8} ${TRAIN_Y + 31}
              L ${trainEndX - 8} ${TRAIN_Y + 47}
              Q ${trainEndX - 22} ${TRAIN_Y + 44} ${trainEndX - 32} ${TRAIN_Y + 32}
              Z
            `}
            fill="#e0f2fe"
            opacity="0.18"
          />

          {Array.from({ length: Math.max(2, Math.min(4, Math.floor(trainWidth / 42))) }, (_, i) => {
            const count = Math.max(2, Math.min(4, Math.floor(trainWidth / 42)));
            const gap = (trainWidth - 78) / Math.max(1, count - 1);
            const x = trainStartX + 24 + i * gap;

            return (
              <rect
                key={i}
                x={x}
                y={TRAIN_Y + 15}
                width="22"
                height="15"
                rx="5"
                fill={`url(#${trainGlass})`}
                stroke="#bae6fd"
                strokeWidth="0.7"
              />
            );
          })}

          <text
            x={trainStartX + trainWidth / 2}
            y={TRAIN_Y + 48}
            textAnchor="middle"
            fill="#eff6ff"
            fontSize="10"
            fontWeight="900"
            fontFamily="var(--font)"
          >
            DPATIMS TRAIN
          </text>

          <g>
            <circle cx={trainStartX + 18} cy={TRAIN_Y + 62} r="7" fill="#020617" stroke="#cbd5e1" strokeWidth="2" />
            <circle cx={trainEndX - 18} cy={TRAIN_Y + 62} r="7" fill="#020617" stroke="#cbd5e1" strokeWidth="2" />
            <circle cx={trainStartX + 18} cy={TRAIN_Y + 62} r="2" fill="#f8fafc" />
            <circle cx={trainEndX - 18} cy={TRAIN_Y + 62} r="2" fill="#f8fafc" />
          </g>
        </g>

        {/* Encoder marker */}
        <g>
          <line
            x1={encoderX}
            y1={TRAIN_Y + 72}
            x2={encoderX}
            y2={TRACK_Y_BOTTOM + 22}
            stroke="#f59e0b"
            strokeWidth="2.2"
            strokeDasharray="5,5"
          />
          <circle cx={encoderX} cy={TRACK_Y_BOTTOM + 27} r="6" fill="#f59e0b" filter={`url(#${glow})`} />
          <text
            x={encoderX}
            y={TRACK_Y_BOTTOM + 45}
            textAnchor="middle"
            fill="#f59e0b"
            fontSize="8"
            fontWeight="900"
            fontFamily="var(--mono)"
          >
            ENC
          </text>
        </g>

        {/* Camera markers */}
        <g>
          <line
            x1={frontCamX}
            y1={TRAIN_Y + 4}
            x2={frontCamX}
            y2={TRACK_Y_TOP}
            stroke="#38bdf8"
            strokeWidth="1.6"
            strokeDasharray="3,3"
          />
          <circle cx={frontCamX} cy={TRAIN_Y + 4} r="5" fill="#38bdf8" filter={`url(#${glow})`} />
          <text
            x={frontCamX}
            y={TRAIN_Y - 8}
            textAnchor="middle"
            fill="#38bdf8"
            fontSize="8"
            fontWeight="900"
            fontFamily="var(--mono)"
          >
            FRONT CAM
          </text>
        </g>

        <g>
          <line
            x1={rearCamX}
            y1={TRAIN_Y + 4}
            x2={rearCamX}
            y2={TRACK_Y_BOTTOM}
            stroke="#a78bfa"
            strokeWidth="1.6"
            strokeDasharray="3,3"
          />
          <circle cx={rearCamX} cy={TRAIN_Y + 4} r="5" fill="#a78bfa" filter={`url(#${glow})`} />
          <text
            x={rearCamX}
            y={TRAIN_Y - 20}
            textAnchor="middle"
            fill="#a78bfa"
            fontSize="8"
            fontWeight="900"
            fontFamily="var(--mono)"
          >
            REAR CAM
          </text>
        </g>

        {/* Ruler */}
        <line
          x1={RAIL_X}
          y1={RULER_Y}
          x2={RAIL_X + RAIL_W}
          y2={RULER_Y}
          stroke="#1a2638"
        />

        {Array.from(
          { length: Math.floor(TRACK_CALIBRATION.TRACK_LENGTH_CM / 10) + 1 },
          (_, i) => i * 10
        ).map((v) => {
          const major = v % 50 === 0;
          const x = cmToX(v);

          return (
            <g key={v}>
              <line
                x1={x}
                y1={RULER_Y}
                x2={x}
                y2={major ? RULER_Y + 15 : RULER_Y + 8}
                stroke={major ? '#475569' : '#263244'}
                strokeWidth={major ? 1.4 : 1}
              />

              {major && (
                <text
                  x={x}
                  y={RULER_Y + 31}
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize="9"
                  fontFamily="var(--mono)"
                >
                  {v}
                </text>
              )}
            </g>
          );
        })}

        <text
          x={SVG_W / 2}
          y="276"
          textAnchor="middle"
          fill="#64748b"
          fontSize="10"
          fontFamily="var(--font)"
        >
          Track {TRACK_CALIBRATION.TRACK_LENGTH_CM} cm — Train body {TRACK_CALIBRATION.TRAIN_BODY_LENGTH_CM} cm — Axle distance {TRACK_CALIBRATION.FRONT_TO_REAR_AXLE_CM} cm
        </text>
      </svg>

      <div className="track-progress-wrap premium-track-progress">
        <span className="track-progress-label">التقدم</span>
        <div className="track-progress">
          <div
            className="track-progress-bar"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="track-progress-pct">{progress.toFixed(1)}%</span>
      </div>
    </div>
  );
}
