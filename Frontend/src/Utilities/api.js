const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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

  const res = await fetch(url, optsWithAuth);
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
export const createTransaction = (ledgerId, data) => apiFetch(`/api/ledgers/${ledgerId}/transactions`, { method: 'POST', body: JSON.stringify(data) });
export const getLedgerTransactions = (ledgerId) => apiFetch(`/api/ledgers/${ledgerId}/transactions`);
