// src/utils/formatters.js

export function formatNumber(value, fallback = '--') {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return fallback;
  }
  return Number(value).toLocaleString();
}

export function formatCm(value, decimals = 1) {
  if (typeof value !== 'number') return '--';
  return `${value.toFixed(decimals)} cm`;
}

export function formatSpeed(value) {
  if (typeof value !== 'number') return '--';
  return `${value.toFixed(1)} cm/s`;
}

export function formatPercent(value, decimals = 0) {
  if (typeof value !== 'number') return '--';
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatDateTime(value) {
  if (!value) return '--';
  return new Date(value).toLocaleString('ar-EG', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  });
}

export function formatTime(value) {
  if (!value) return '--';
  return new Date(value).toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function severityVariant(severity) {
  switch (severity) {
    case 'critical':
      return 'danger';
    case 'high':
      return 'danger';
    case 'medium':
      return 'warning';
    case 'low':
      return 'info';
    default:
      return 'neutral';
  }
}

export function severityLabel(severity) {
  switch (severity) {
    case 'critical':
      return 'Critical';
    case 'high':
      return 'High';
    case 'medium':
      return 'Medium';
    case 'low':
      return 'Low';
    default:
      return '--';
  }
}

export function statusVariant(status) {
  switch (status) {
    case 'new':
      return 'warning';
    case 'acknowledged':
      return 'info';
    case 'under_review':
      return 'info';
    case 'resolved':
      return 'success';
    case 'false_positive':
      return 'neutral';
    default:
      return 'neutral';
  }
}

export function defectLabel(type) {
  const map = {
    broken_rail: 'Broken Rail',
    damaged_sleeper: 'Damaged Sleeper',
    loose_bolt: 'Loose Bolt',
    missing_bolt: 'Missing Bolt',
    rail_joint: 'Rail Joint',
    rail_joint_damage: 'Rail Joint Damage',
    ssim_anomaly: 'SSIM Anomaly',
  };

  return map[type] || type || '--';
}
export function formatDuration(seconds) {
  if (!seconds || seconds < 0) return '0s';

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function sessionStatusVariant(status) {
  switch (status) {
    case 'running':
      return 'success';
    case 'completed':
      return 'info';
    case 'failed':
      return 'danger';
    default:
      return 'neutral';
  }
}