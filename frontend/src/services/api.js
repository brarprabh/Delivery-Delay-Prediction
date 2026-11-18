const API_BASE = '/api';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
  return res.json();
}

export async function fetchModelInfo() {
  const res = await fetch(`${API_BASE}/model-info`);
  if (!res.ok) throw new Error(`Failed to fetch model info: ${res.statusText}`);
  return res.json();
}

export async function predictDelivery(payload) {
  const res = await fetch(`${API_BASE}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Prediction error (${res.status})`);
  }
  return res.json();
}

export async function fetchPredictions(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, val);
    }
  });
  const url = `${API_BASE}/predictions${query.toString() ? `?${query.toString()}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch prediction records: ${res.statusText}`);
  return res.json();
}

export async function fetchPredictionDetail(id) {
  const res = await fetch(`${API_BASE}/predictions/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch prediction detail: ${res.statusText}`);
  return res.json();
}

export async function fetchAnalyticsOverview() {
  const res = await fetch(`${API_BASE}/analytics/overview`);
  if (!res.ok) throw new Error(`Failed to fetch analytics overview: ${res.statusText}`);
  return res.json();
}

export async function fetchAnalyticsTrends() {
  const res = await fetch(`${API_BASE}/analytics/trends`);
  if (!res.ok) throw new Error(`Failed to fetch analytics trends: ${res.statusText}`);
  return res.json();
}

