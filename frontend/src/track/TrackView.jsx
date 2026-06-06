import { useState, useEffect } from 'react'

const TRACK_LENGTH_CM = 300
const SLEEPER_COUNT = 15

export default function TrackView({ trackPosCm = 0, defects = [] }) {
  const [animated, setAnimated] = useState(trackPosCm)

  useEffect(() => {
    const id = setInterval(() => {
      setAnimated(prev => {
        const diff = trackPosCm - prev
        if (Math.abs(diff) < 0.2) return trackPosCm
        return prev + diff * 0.15
      })
    }, 30)
    return () => clearInterval(id)
  }, [trackPosCm])

  const clamped = Math.max(0, Math.min(TRACK_LENGTH_CM, animated))
  const progress = (clamped / TRACK_LENGTH_CM) * 100

  const RAIL_START = 40
  const RAIL_END = 660
  const RAIL_LEN = RAIL_END - RAIL_START
  const trainX = RAIL_START + (RAIL_LEN * clamped) / TRACK_LENGTH_CM

  const MARGIN = 20
  const firstX = RAIL_START + MARGIN
  const lastX = RAIL_END - MARGIN
  const spacing = (lastX - firstX) / (SLEEPER_COUNT - 1)

  const sleepers = Array.from({ length: SLEEPER_COUNT }, (_, i) => firstX + i * spacing)

  const rulerPositions = [0, 50, 100, 150, 200, 250, 300]

  return (
    <div className="track-view">
      <svg viewBox="0 0 700 150" className="track-svg">
        {/* Rail background line */}
        <rect x={RAIL_START} y="65" width={RAIL_LEN} height="20" rx="3" fill="#0b1018" />

        {/* Top rail */}
        <rect x={RAIL_START} y="63" width={RAIL_LEN} height="4" rx="2" className="track-rail" />
        {/* Bottom rail */}
        <rect x={RAIL_START} y="83" width={RAIL_LEN} height="4" rx="2" className="track-rail" />

        {/* Sleepers - exactly 15 */}
        {sleepers.map((x, i) => (
          <rect key={i} x={x - 3} y="60" width="6" height="30" rx="1" className="track-sleeper" />
        ))}

        {/* Defect markers */}
        {defects.map((defect, i) => {
          const dx = RAIL_START + (RAIL_LEN * (defect.track_position_cm || 0)) / TRACK_LENGTH_CM
          if (dx < RAIL_START || dx > RAIL_END) return null
          return (
            <g key={i}>
              <polygon
                points={`${dx},52 ${dx - 5},43 ${dx + 5},43`}
                className="track-defect-marker"
              />
            </g>
          )
        })}

        {/* Train marker */}
        <rect
          x={trainX - 20}
          y="40"
          width="40"
          height="24"
          rx="5"
          className="track-train"
        />
        <text
          x={trainX}
          y="56"
          textAnchor="middle"
          className="track-train-label"
        >
          Train
        </text>

        {/* Ruler */}
        {rulerPositions.map(pos => {
          const rx = RAIL_START + (RAIL_LEN * pos) / TRACK_LENGTH_CM
          return (
            <text key={pos} x={rx} y="110" textAnchor="middle" className="track-ruler-text">
              {pos}
            </text>
          )
        })}
        <text x="350" y="130" textAnchor="middle" className="track-ruler-unit">cm</text>
      </svg>

      <div className="track-progress">
        <div className="track-progress-bar" style={{ width: `${progress}%` }} />
      </div>
    </div>
  )
}