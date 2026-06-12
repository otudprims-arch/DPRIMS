// src/services/api.js
import axios from 'axios';

export const API_BASE =
  import.meta.env.VITE_API_BASE || 'http://localhost:3000/api';

/*
  Dashboard camera feeds should read from Python restream.
  Do not read directly from ESP32-CAM while Python pipeline is running.
*/
export const CAMERA_FRONT_URL =
  import.meta.env.VITE_FRONT_CAMERA || 'http://localhost:5050/front';

export const CAMERA_REAR_URL =
  import.meta.env.VITE_REAR_CAMERA || 'http://localhost:5050/rear';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 12000,
});

function unwrap(res) {
  return res?.data?.data ?? res?.data ?? null;
}

function normalizeParams(params = {}) {
  if (typeof params === 'number') return { limit: params };
  return params || {};
}

function normalizeListResponse(res) {
  const body = res?.data || {};

  return {
    success: body?.success ?? true,
    data: Array.isArray(body?.data) ? body.data : [],
    pagination: body?.pagination ?? null,
    filter: body?.filter ?? {},
    message: body?.message || '',
  };
}

function normalizeStatsResponse(res) {
  const body = res?.data || {};
  return body?.data ?? body ?? {};
}

export function buildEventImageUrl(path) {
  if (!path) return '';
  return `${API_BASE}/events/image?path=${encodeURIComponent(path)}`;
}

// ================= SYSTEM =================
export async function getSystemHealth() {
  const res = await api.get('/system/health');
  return unwrap(res);
}

export async function getSystemTimeline(params = {}) {
  const finalParams = normalizeParams(params);

  const res = await api.get('/system/timeline', {
    params: finalParams,
  });

  return unwrap(res);
}

// ================= TELEMETRY =================
export async function getLatestTelemetry() {
  const res = await api.get('/telemetry/latest');
  return unwrap(res);
}

export async function getTelemetryState() {
  try {
    const res = await api.get('/telemetry/state');
    return unwrap(res);
  } catch {
    const res = await api.get('/telemetry/latest');
    return unwrap(res);
  }
}

export async function getTelemetryHistory(params = {}) {
  const finalParams = normalizeParams(params);

  const res = await api.get('/telemetry/history', {
    params: finalParams,
  });

  return unwrap(res);
}

// ================= CONTROL =================
export async function sendControlCommand(payload = {}) {
  const normalizedPayload = {
    ...payload,
    cmd: payload.cmd || payload.action,
    action: payload.action || payload.cmd,
  };

  const res = await api.post('/control', normalizedPayload);
  return res.data;
}

export async function getControlHistory(params = {}) {
  const finalParams = normalizeParams(params);

  const res = await api.get('/control/history', {
    params: finalParams,
  });

  return unwrap(res);
}

// ================= ALERTS =================
export async function getAlerts(params = {}) {
  const finalParams = normalizeParams(params);

  const res = await api.get('/alerts', {
    params: finalParams,
  });

  return normalizeListResponse(res);
}

export async function getAlertById(id) {
  const res = await api.get(`/alerts/${id}`);
  return res.data;
}

export async function getAlertStats() {
  const res = await api.get('/alerts/stats');
  return normalizeStatsResponse(res);
}

export async function getAlertsTimeline(params = {}) {
  const finalParams = normalizeParams(params);

  const res = await api.get('/alerts/timeline', {
    params: finalParams,
  });

  return unwrap(res);
}

// aliases عشان أي كود قديم ما يضربش
export async function getAlertTimeline(params = {}) {
  return getAlertsTimeline(params);
}

export async function acknowledgeAlert(id, payload = {}) {
  const res = await api.patch(`/alerts/${id}/ack`, payload);
  return res.data;
}

export async function resolveAlert(id, payload = {}) {
  const res = await api.patch(`/alerts/${id}/resolve`, payload);
  return res.data;
}

export async function markAlertFalsePositive(id, payload = {}) {
  const res = await api.patch(`/alerts/${id}/false-positive`, payload);
  return res.data;
}

// alias
export async function falsePositiveAlert(id, payload = {}) {
  return markAlertFalsePositive(id, payload);
}

export async function confirmFaultFromAlert(id, payload = {}) {
  const res = await api.post(`/alerts/${id}/confirm-fault`, payload);
  return res.data;
}

// alias
export async function confirmAlertAsFault(id, payload = {}) {
  return confirmFaultFromAlert(id, payload);
}

// ================= FAULTS =================
export async function getFaults(params = {}) {
  const finalParams = normalizeParams(params);

  const res = await api.get('/faults', {
    params: finalParams,
  });

  return normalizeListResponse(res);
}

export async function getFaultStats() {
  const res = await api.get('/faults/stats');
  return normalizeStatsResponse(res);
}

export async function getFaultById(id) {
  const res = await api.get(`/faults/${id}`);
  return res.data;
}

export async function assignFault(id, payload = {}) {
  const res = await api.patch(`/faults/${id}/assign`, payload);
  return res.data;
}

export async function startRepairFault(id, payload = {}) {
  const res = await api.patch(`/faults/${id}/start-repair`, payload);
  return res.data;
}

export async function markFaultRepaired(id, payload = {}) {
  const res = await api.patch(`/faults/${id}/repaired`, payload);
  return res.data;
}

export async function verifyFault(id, payload = {}) {
  const res = await api.patch(`/faults/${id}/verify`, payload);
  return res.data;
}

export async function closeFault(id, payload = {}) {
  const res = await api.patch(`/faults/${id}/close`, payload);
  return res.data;
}

export async function rejectFault(id, payload = {}) {
  const res = await api.patch(`/faults/${id}/reject`, payload);
  return res.data;
}

// aliases إضافية للواجهة
export async function startFaultRepair(id, payload = {}) {
  return startRepairFault(id, payload);
}

export async function repairFault(id, payload = {}) {
  return markFaultRepaired(id, payload);
}

export async function markRepairedFault(id, payload = {}) {
  return markFaultRepaired(id, payload);
}

export async function verifyRepairedFault(id, payload = {}) {
  return verifyFault(id, payload);
}

// ================= SESSIONS =================
export async function getSessions(params = {}) {
  const finalParams = normalizeParams(params);

  const res = await api.get('/sessions', {
    params: finalParams,
  });

  const data = unwrap(res);

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;

  return [];
}

export async function getCurrentSession() {
  const res = await api.get('/sessions/current');
  return unwrap(res);
}

export async function startSession(payload = {}) {
  const res = await api.post('/sessions/start', payload);
  return res.data;
}

export async function endSession(payload = {}) {
  const res = await api.post('/sessions/end', payload);
  return res.data;
}

export async function getSessionSummary(sessionId) {
  const res = await api.get(`/sessions/${sessionId}/summary`);
  return unwrap(res);
}

// ================= REPORTS HELPERS =================
// دي مش محتاجة backend جديد. بتجمع الداتا الحالية وتجهزها للتقارير.
export async function getReportsOverview(params = {}) {
  const finalParams = {
    limit: 200,
    ...normalizeParams(params),
  };

  const [
    health,
    alertStats,
    faultStats,
    alertsRes,
    faultsRes,
    sessions,
  ] = await Promise.allSettled([
    getSystemHealth(),
    getAlertStats(),
    getFaultStats(),
    getAlerts(finalParams),
    getFaults(finalParams),
    getSessions(finalParams),
  ]);

  return {
    health: health.status === 'fulfilled' ? health.value : null,
    alertStats: alertStats.status === 'fulfilled' ? alertStats.value : {},
    faultStats: faultStats.status === 'fulfilled' ? faultStats.value : {},
    alerts: alertsRes.status === 'fulfilled' ? alertsRes.value?.data || [] : [],
    faults: faultsRes.status === 'fulfilled' ? faultsRes.value?.data || [] : [],
    sessions: sessions.status === 'fulfilled' ? sessions.value || [] : [],
  };
}

export async function getDailyReport(params = {}) {
  return getReportsOverview({
    ...normalizeParams(params),
    period: 'daily',
  });
}

export async function getWeeklyReport(params = {}) {
  return getReportsOverview({
    ...normalizeParams(params),
    period: 'weekly',
  });
}

export async function getMaintenanceReport(params = {}) {
  return getReportsOverview({
    ...normalizeParams(params),
    report_type: 'maintenance',
  });
}

export async function getCriticalReport(params = {}) {
  const data = await getReportsOverview(params);

  return {
    ...data,
    alerts: data.alerts.filter((a) => a.severity === 'critical'),
    faults: data.faults.filter((f) => f.severity === 'critical'),
  };
}

// ================= RAW API =================
export default api;
