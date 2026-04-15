const normalizeApiBase = (rawBase) => {
  const fallbackBase = 'http://localhost:3000';
  const base = rawBase || fallbackBase;

  if (typeof window === 'undefined') {
    return base;
  }

  try {
    const url = new URL(base);

    // Docker service names like "backend" are reachable from containers,
    // but not from the user's browser on the host machine.
    if (url.hostname === 'backend') {
      url.hostname = window.location.hostname || 'localhost';
    }

    return url.toString().replace(/\/$/, '');
  } catch {
    return fallbackBase;
  }
};

export const API_BASE = normalizeApiBase(import.meta.env.VITE_API_URL);

export const getAuthToken = () => localStorage.getItem('authToken');

export const getFetchOptions = (opts = {}) => {
  const token = getAuthToken();
  return {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
    ...opts,
  };
};

export const apiFetch = async (path, opts = {}) => {
  const url = `${API_BASE}${path}`;
  const optsWithAuth = getFetchOptions(opts);

  let res;

  try {
    res = await fetch(url, optsWithAuth);
  } catch {
    throw new Error(`Could not reach the backend at ${API_BASE}. Make sure the backend server is running.`);
  }

  const body = await res.json().catch(() => ({}));

  if (res.status === 401) {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    window.location.href = '/login';
    throw new Error('Unauthorized, please log in again.');
  }

  if (!res.ok) {
    const error = body?.error || `Request failed (${res.status})`;
    throw new Error(error);
  }
  return body;
};

export const getLedgers = () => apiFetch('/api/ledgers');
export const createLedger = (data) => apiFetch('/api/ledgers', { method: 'POST', body: JSON.stringify(data) });
export const updateLedger = (ledgerId, data) =>
  apiFetch(`/api/ledgers/${ledgerId}`, { method: 'PUT', body: JSON.stringify(data) });
export const createTransaction = (ledgerId, data) => apiFetch(`/api/ledgers/${ledgerId}/transactions`, { method: 'POST', body: JSON.stringify(data) });
export const getLedgerTransactions = (ledgerId) => apiFetch(`/api/ledgers/${ledgerId}/transactions`);
export const updateTransaction = (ledgerId, transactionId, data) =>
  apiFetch(`/api/ledgers/${ledgerId}/transactions/${transactionId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
