// src/pages/CamerasPage.jsx
import { useState } from 'react';
import SectionHeader from '../components/ui/SectionHeader';
import PanelShell from '../components/ui/PanelShell';
import StatusBadge from '../components/ui/StatusBadge';
import DataRow from '../components/ui/DataRow';
import CameraCard from '../components/cameras/CameraCard';
import { CAMERA_FRONT_URL, CAMERA_REAR_URL } from '../services/api';
import { useSystemHealth } from '../hooks/useSystemHealth';

export default function CamerasPage() {
  const { health } = useSystemHealth(3000);
  const [refreshKey, setRefreshKey] = useState(0);

  const pipelineConnected = Boolean(health?.realtime?.pipeline_connected);

  function refreshFeeds() {
    setRefreshKey((prev) => prev + 1);
  }

  return (
    <div className="page-stack">
      <SectionHeader
        title="مركز الكاميرات"
        subtitle="Dual ESP32-CAM Monitoring"
        action={
          <StatusBadge
            status={pipelineConnected ? 'AI PIPELINE ONLINE' : 'AI PIPELINE OFFLINE'}
            variant={pipelineConnected ? 'success' : 'danger'}
            dot
          />
        }
      />

      <section className="camera-command-strip">
        <div>
          <span className="hero-kicker">LIVE VISION</span>
          <h3>Front + Rear Camera Feeds</h3>
          <p>
            بث مباشر من كاميرتين ESP32-CAM، مع مراقبة حالة الـ AI Pipeline وربط التنبيهات بالجلسات.
          </p>
        </div>

        <button className="table-view-btn" onClick={refreshFeeds}>
          Refresh Feeds
        </button>
      </section>

      <div className="grid-2">
        <CameraCard
          key={`front-${refreshKey}`}
          title="Front Camera"
          label="FRONT / Primary Detection View"
          url={CAMERA_FRONT_URL}
          status={pipelineConnected ? 'AI Monitoring' : 'Stream Only'}
        />

        <CameraCard
          key={`rear-${refreshKey}`}
          title="Rear Camera"
          label="REAR / Verification View"
          url={CAMERA_REAR_URL}
          status={pipelineConnected ? 'Verification Active' : 'Stream Only'}
        />
      </div>

      <div className="grid-2">
        <PanelShell title="Vision Pipeline">
          <DataRow label="AI Model" value="YOLOv8 / rail_defect_v3" />
          <DataRow label="Pipeline" value={
            <StatusBadge
              status={pipelineConnected ? 'Connected' : 'Disconnected'}
              variant={pipelineConnected ? 'success' : 'danger'}
            />
          } />
          <DataRow label="Front URL" value={CAMERA_FRONT_URL} />
          <DataRow label="Rear URL" value={CAMERA_REAR_URL} />
        </PanelShell>

        <PanelShell title="Operational Notes">
          <div className="note-list">
            <p>لا تفتح نفس Stream في أكثر من مكان أثناء تشغيل Python لتقليل سقوط ESP32-CAM.</p>
            <p>لو ظهر timeout، استخدم Refresh Feeds أو أعد تشغيل الكاميرا.</p>
            <p>يفضل QVGA أثناء العرض العملي لضمان ثبات البث.</p>
          </div>
        </PanelShell>
      </div>
    </div>
  );
}
