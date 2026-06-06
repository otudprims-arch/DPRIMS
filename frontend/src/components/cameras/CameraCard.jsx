// src/components/cameras/CameraCard.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import StatusBadge from '../ui/StatusBadge';

function buildCaptureUrl(streamUrl) {
  if (!streamUrl) return '';

  try {
    const u = new URL(streamUrl);

    if (u.pathname === '/front') {
      u.pathname = '/front.jpg';
      u.search = '';
      return u.toString();
    }

    if (u.pathname === '/rear') {
      u.pathname = '/rear.jpg';
      u.search = '';
      return u.toString();
    }

    u.port = '';
    u.pathname = '/capture';
    u.search = '';
    return u.toString();
  } catch {
    if (streamUrl.includes('/front')) return streamUrl.replace('/front', '/front.jpg');
    if (streamUrl.includes('/rear')) return streamUrl.replace('/rear', '/rear.jpg');

    return streamUrl
      .replace(':81/stream', '/capture')
      .replace('/stream', '/capture');
  }
}

export default function CameraCard({
  title,
  label,
  url,
  status,
  mode = 'stream',
  refreshMs = 1200,
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [snapshotTick, setSnapshotTick] = useState(Date.now());
  const [useSnapshotFallback, setUseSnapshotFallback] = useState(false);
  const failCountRef = useRef(0);

  const captureUrl = useMemo(() => buildCaptureUrl(url), [url]);

  const finalUrl = useMemo(() => {
    if (!url) return '';

    if (mode === 'snapshot' || useSnapshotFallback) {
      const sep = captureUrl.includes('?') ? '&' : '?';
      return `${captureUrl}${sep}t=${snapshotTick}`;
    }

    return url;
  }, [url, captureUrl, snapshotTick, mode, useSnapshotFallback]);

  useEffect(() => {
    if (mode !== 'snapshot' && !useSnapshotFallback) return;

    const id = setInterval(() => {
      setSnapshotTick(Date.now());
    }, refreshMs);

    return () => clearInterval(id);
  }, [mode, useSnapshotFallback, refreshMs]);

  function handleLoad() {
    setLoaded(true);
    setFailed(false);
    failCountRef.current = 0;
  }

  function handleError() {
    failCountRef.current += 1;
    setLoaded(false);

    if (!useSnapshotFallback && failCountRef.current >= 1) {
      setUseSnapshotFallback(true);
      setFailed(false);
      setSnapshotTick(Date.now());
      return;
    }

    setFailed(true);
  }

  function retryCamera() {
    failCountRef.current = 0;
    setFailed(false);
    setLoaded(false);
    setUseSnapshotFallback(false);
    setSnapshotTick(Date.now());
  }

  const badgeStatus = failed
    ? 'OFFLINE'
    : loaded
      ? useSnapshotFallback || mode === 'snapshot'
        ? 'SNAPSHOT'
        : 'LIVE'
      : status || 'CONNECTING';

  const badgeVariant = failed
    ? 'danger'
    : loaded
      ? useSnapshotFallback || mode === 'snapshot'
        ? 'warning'
        : 'success'
      : 'info';

  return (
    <div className="pro-camera-card">
      <div className="pro-camera-head">
        <div>
          <h3>{title}</h3>
          <p>{label}</p>
        </div>

        <StatusBadge status={badgeStatus} variant={badgeVariant} dot />
      </div>

      <div className="pro-camera-frame">
        {!failed ? (
          <img
            src={finalUrl}
            alt={title}
            onLoad={handleLoad}
            onError={handleError}
            className="camera-stream-img"
          />
        ) : (
          <div className="camera-offline">
            <strong>Camera stream unavailable</strong>
            <span>{url}</span>
            <button type="button" onClick={retryCamera}>
              Retry Camera
            </button>
          </div>
        )}

        <div className="camera-overlay-meta">
          <span>{useSnapshotFallback ? captureUrl : url}</span>
        </div>

        {useSnapshotFallback && !failed && (
          <div className="camera-fallback-badge">
            Snapshot fallback
          </div>
        )}
      </div>
    </div>
  );
}