// src/pages/AnalyticsPage.jsx
import { useEffect, useMemo, useState } from 'react';

import StatCard from '../components/ui/StatCard';
import SectionHeader from '../components/ui/SectionHeader';
import PanelShell from '../components/ui/PanelShell';
import StatusBadge from '../components/ui/StatusBadge';

import {
  getAlerts,
  getFaults,
  getSessions,
} from '../services/api';

import { defectLabel } from '../utils/formatters';

function normalizeList(res) {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.items)) return res.items;
  return [];
}

function getAlertType(item) {
  return (
    item?.primary_defect ||
    item?.defect_type ||
    item?.defect?.type ||
    item?.defects?.[0]?.type ||
    item?.defects?.[0]?.class_name ||
    item?.type ||
    'unknown'
  );
}

function getSeverity(item) {
  const direct = item?.severity || item?.defect?.severity;
  if (direct) return direct;

  const score = item?.ssim_anomaly_score ?? item?.ssim_score ?? 0;
  if (score >= 0.5) return 'critical';
  if (score >= 0.3) return 'medium';
  return 'low';
}

function getStatus(item) {
  return item?.status || (item?.resolved_at ? 'resolved' : 'new');
}

function getZone(item) {
  return item?.track_zone || item?.defect?.track_zone || 'unknown';
}

function getSleeper(item) {
  return item?.nearest_sleeper || item?.defect?.nearest_sleeper || 'unknown';
}

function getCamera(item) {
  return item?.defect_camera || item?.camera || item?.defect?.camera || 'unknown';
}

function getPosition(item) {
  return Number(
    item?.defect_position_cm ??
    item?.track_position_cm ??
    item?.defect?.track_position_cm ??
    0
  );
}

function countBy(items, getter) {
  const map = new Map();

  for (const item of items) {
    const key = getter(item) || 'unknown';
    map.set(key, (map.get(key) || 0) + 1);
  }

  return [...map.entries()]
    .map(([key, count]) => ({ _id: key, count }))
    .sort((a, b) => b.count - a.count);
}

function groupByHour(items) {
  const map = new Map();

  for (const item of items) {
    const raw = item?.createdAt || item?.timestamp || item?.confirmed_at || item?.updatedAt;
    const date = raw ? new Date(raw) : null;

    if (!date || Number.isNaN(date.getTime())) continue;

    const key = `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:00`;
    map.set(key, (map.get(key) || 0) + 1);
  }

  return [...map.entries()].map(([hour, count]) => ({ _id: hour, count }));
}

function BarList({ items = [], labelKey = '_id', valueKey = 'count', tone = 'blue' }) {
  const max = Math.max(...items.map((item) => Number(item[valueKey] || 0)), 1);

  if (!items.length) {
    return <div className="empty-state">لا توجد بيانات كافية للعرض</div>;
  }

  return (
    <div className="analytics-bar-list">
      {items.slice(0, 8).map((item, index) => {
        const value = Number(item[valueKey] || 0);
        const width = Math.max(5, (value / max) * 100);
        const label = item[labelKey] || 'unknown';

        return (
          <div key={`${label}-${index}`} className="analytics-bar-row">
            <div className="analytics-bar-row-head">
              <span>{defectLabel(label)}</span>
              <strong>{value}</strong>
            </div>

            <div className="analytics-bar-track">
              <div
                className={`analytics-bar-fill ${tone}`}
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TimelineMini({ items = [] }) {
  const max = Math.max(...items.map((item) => item.count || 0), 1);

  if (!items.length) {
    return <div className="empty-state">لا يوجد Timeline بعد</div>;
  }

  return (
    <div className="analytics-timeline-mini">
      {items.slice(-18).map((item, index) => {
        const h = Math.max(8, ((item.count || 0) / max) * 100);
        const label = item?._id || `#${index + 1}`;

        return (
          <div className="analytics-timeline-bar" key={`${label}-${index}`}>
            <div style={{ height: `${h}%` }} />
            <span>{String(label).slice(-5)}</span>
          </div>
        );
      })}
    </div>
  );
}

function DonutMetric({ value, label, tone = 'blue' }) {
  const safe = Math.max(0, Math.min(100, Number(value) || 0));

  return (
    <div className={`analytics-donut ${tone}`}>
      <div
        className="analytics-donut-ring"
        style={{
          background: `conic-gradient(currentColor ${safe * 3.6}deg, rgba(148,163,184,0.16) 0deg)`,
        }}
      >
        <div>
          <strong>{safe}%</strong>
          <span>{label}</span>
        </div>
      </div>
    </div>
  );
}

function AnalyticsIcon({ type }) {
  const icons = {
    alerts: (
      <>
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 01-3.46 0" />
      </>
    ),
    critical: (
      <>
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </>
    ),
    risk: (
      <>
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </>
    ),
    session: (
      <>
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <path d="M14 2v6h6" />
      </>
    ),
  };

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      {icons[type]}
    </svg>
  );
}

export default function AnalyticsPage() {
  const [alerts, setAlerts] = useState([]);
  const [faults, setFaults] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('all');

  async function loadAnalytics() {
    try {
      const [alertsRes, faultsRes, sessionsRes] = await Promise.all([
        getAlerts({ limit: 300 }),
        getFaults({ limit: 200 }).catch(() => ({ data: [] })),
        getSessions().catch(() => []),
      ]);

      setAlerts(normalizeList(alertsRes));
      setFaults(normalizeList(faultsRes));
      setSessions(normalizeList(sessionsRes));
    } catch (err) {
      console.error('[Analytics] failed to load', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAnalytics();
    const id = setInterval(loadAnalytics, 6000);
    return () => clearInterval(id);
  }, []);

  const filteredAlerts = useMemo(() => {
    if (range === 'all') return alerts;

    const now = Date.now();
    const hours = range === '24h' ? 24 : range === '7d' ? 24 * 7 : 24 * 30;
    const min = now - hours * 60 * 60 * 1000;

    return alerts.filter((a) => {
      const t = new Date(a.createdAt || a.timestamp || a.updatedAt).getTime();
      return Number.isFinite(t) && t >= min;
    });
  }, [alerts, range]);

  const analytics = useMemo(() => {
    const totalAlerts = filteredAlerts.length;
    const totalFaults = faults.length;

    const criticalAlerts = filteredAlerts.filter((a) => getSeverity(a) === 'critical').length;
    const mediumAlerts = filteredAlerts.filter((a) => ['medium', 'warning'].includes(getSeverity(a))).length;
    const openAlerts = filteredAlerts.filter((a) => !['resolved', 'closed', 'false_positive'].includes(getStatus(a))).length;

    const openFaults = faults.filter((f) => !['closed', 'verified', 'rejected'].includes(getStatus(f))).length;
    const closedFaults = faults.filter((f) => ['closed', 'verified'].includes(getStatus(f))).length;

    const completedSessions = sessions.filter((s) => s.status === 'completed').length;
    const sessionAlerts = sessions.reduce((sum, s) => sum + Number(s.alerts_count || 0), 0);
    const totalDistance = sessions.reduce((sum, s) => sum + Number(s.total_distance_cm || 0), 0);

    const riskScore = Math.min(
      100,
      Math.round(
        criticalAlerts * 18 +
        mediumAlerts * 5 +
        openAlerts * 1.5 +
        openFaults * 8
      )
    );

    const repairRate = totalFaults
      ? Math.round((closedFaults / totalFaults) * 100)
      : 0;

    const criticalRate = totalAlerts
      ? Math.round((criticalAlerts / totalAlerts) * 100)
      : 0;

    return {
      totalAlerts,
      totalFaults,
      criticalAlerts,
      mediumAlerts,
      openAlerts,
      openFaults,
      closedFaults,
      completedSessions,
      sessionAlerts,
      totalDistance,
      riskScore,
      repairRate,
      criticalRate,
      bySeverity: countBy(filteredAlerts, getSeverity),
      byType: countBy(filteredAlerts, getAlertType),
      byZone: countBy(filteredAlerts, getZone),
      bySleeper: countBy(filteredAlerts, getSleeper),
      byCamera: countBy(filteredAlerts, getCamera),
      timeline: groupByHour(filteredAlerts),
      topPositions: [...filteredAlerts]
        .map((a) => ({
          _id: `${Math.round(getPosition(a))} cm`,
          count: 1,
        }))
        .reduce((acc, item) => {
          const found = acc.find((x) => x._id === item._id);
          if (found) found.count += 1;
          else acc.push(item);
          return acc;
        }, [])
        .sort((a, b) => b.count - a.count),
    };
  }, [filteredAlerts, faults, sessions]);

  const riskStatus =
    analytics.riskScore >= 70
      ? { label: 'HIGH RISK', variant: 'danger' }
      : analytics.riskScore >= 35
        ? { label: 'WATCH', variant: 'warning' }
        : { label: 'STABLE', variant: 'success' };

  return (
    <div className="page-stack">
      <SectionHeader
        title="الإحصائيات والتحليل"
        subtitle="Analytics & Operational Intelligence"
        action={
          <div className="analytics-actions">
            <select value={range} onChange={(e) => setRange(e.target.value)}>
              <option value="all">All Time</option>
              <option value="24h">Last 24H</option>
              <option value="7d">Last 7D</option>
              <option value="30d">Last 30D</option>
            </select>

            <StatusBadge
              status={loading ? 'LOADING' : riskStatus.label}
              variant={loading ? 'warning' : riskStatus.variant}
              dot
            />
          </div>
        }
      />

      <div className="grid-4">
        <StatCard
          label="Total Alerts"
          value={analytics.totalAlerts}
          color="blue"
          subtitle={`${analytics.openAlerts} open alerts`}
          icon={<AnalyticsIcon type="alerts" />}
        />

        <StatCard
          label="Critical Alerts"
          value={analytics.criticalAlerts}
          color={analytics.criticalAlerts > 0 ? 'red' : 'green'}
          subtitle={`${analytics.criticalRate}% critical rate`}
          icon={<AnalyticsIcon type="critical" />}
        />

        <StatCard
          label="Risk Score"
          value={`${analytics.riskScore}%`}
          color={analytics.riskScore >= 70 ? 'red' : analytics.riskScore >= 35 ? 'yellow' : 'green'}
          subtitle="Alerts + faults risk"
          icon={<AnalyticsIcon type="risk" />}
        />

        <StatCard
          label="Sessions"
          value={analytics.completedSessions}
          color="teal"
          subtitle={`${analytics.sessionAlerts} linked alerts`}
          icon={<AnalyticsIcon type="session" />}
        />
      </div>

      <section className="analytics-hero premium-analytics-hero">
        <div>
          <span className="hero-kicker">AI INSPECTION INSIGHTS</span>
          <h2>تحليل حي لحالة المسار بناءً على التنبيهات والأعطال والجلسات</h2>
          <p>
            الصفحة دي بتحسب المؤشرات مباشرة من بيانات Alerts و Faults و Sessions، لذلك تشتغل حتى لو endpoint الإحصائيات مش مضبوط.
          </p>

          <div className="analytics-hero-tags">
            <span>Faults: {analytics.totalFaults}</span>
            <span>Open Faults: {analytics.openFaults}</span>
            <span>Closed Faults: {analytics.closedFaults}</span>
            <span>Distance: {analytics.totalDistance.toFixed(1)} cm</span>
          </div>
        </div>

        <div className="analytics-donut-grid">
          <DonutMetric
            value={analytics.riskScore}
            label="Risk"
            tone={analytics.riskScore >= 70 ? 'red' : analytics.riskScore >= 35 ? 'amber' : 'green'}
          />
          <DonutMetric
            value={analytics.repairRate}
            label="Repair"
            tone="green"
          />
        </div>
      </section>

      <div className="grid-2">
        <PanelShell title="Severity Distribution" subtitle="By alert severity">
          <BarList items={analytics.bySeverity} tone="red" />
        </PanelShell>

        <PanelShell title="Defect Types" subtitle="Most detected defects">
          <BarList items={analytics.byType} tone="amber" />
        </PanelShell>
      </div>

      <div className="grid-2">
        <PanelShell title="Track Zones" subtitle="Alerts by zone">
          <BarList items={analytics.byZone} tone="teal" />
        </PanelShell>

        <PanelShell title="Affected Sleepers" subtitle="Most affected sleepers">
          <BarList items={analytics.bySleeper} tone="blue" />
        </PanelShell>
      </div>

      <div className="grid-2">
        <PanelShell title="Camera Contribution" subtitle="Front vs Rear detections">
          <BarList items={analytics.byCamera} tone="purple" />
        </PanelShell>

        <PanelShell title="Top Positions" subtitle="Repeated defect positions">
          <BarList items={analytics.topPositions} tone="amber" />
        </PanelShell>
      </div>

      <PanelShell title="Alerts Timeline" subtitle="Hourly activity">
        <TimelineMini items={analytics.timeline} />
      </PanelShell>
    </div>
  );
}