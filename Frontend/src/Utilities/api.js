const normalizeApiBase = (rawBase) => {
  const fallbackBase = 'http://localhost:3000';
  const base = rawBase || fallbackBase;

  if (typeof window === 'undefined') {
    return base;
  }

  try {
    const url = new URL(base);

    const pageHostname = window.location.hostname || 'localhost';
    const pageIsLocalhost = pageHostname === 'localhost' || pageHostname === '127.0.0.1';
    const apiIsLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';

    // Docker service names and localhost are not reachable from another device's
    // browser, so use the host that served the frontend during LAN testing.
    if (url.hostname === 'backend' || (apiIsLocalhost && !pageIsLocalhost)) {
      url.hostname = pageHostname;
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
  console.log("apiFetch called");
  console.log("API_BASE:", API_BASE);
  console.log("Path:", path);
  const url = `${API_BASE}${path}`;
  const optsWithAuth = getFetchOptions(opts);

  //const timeoutMs = typeof optsWithAuth.timeout === 'number' ? optsWithAuth.timeout : 10000;
  const timeoutMs = 60000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  if (optsWithAuth.signal) {
    optsWithAuth.signal.addEventListener('abort', () => controller.abort());
  }

  optsWithAuth.signal = controller.signal;
  delete optsWithAuth.timeout;

  let res;

  try {
    res = await fetch(url, optsWithAuth);
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Request to ${url} timed out after ${timeoutMs}ms.`);
    }
    throw new Error(`Could not reach the backend at ${API_BASE}. Make sure the backend server is running.`);
  } finally {
    clearTimeout(timeoutId);
  }

  const body = await res.json().catch(() => ({}));

  if (res.status === 401) {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    window.location.href = '/login';
    throw new Error('Unauthorized, please log in again.');
  }

  if (!res.ok) {
    const error = new Error(body?.error || `Request failed (${res.status})`);
    error.status = res.status;
    error.body = body;
    throw error;
  }
  return body;
};

export const getLedgers = () => apiFetch('/api/ledgers');
export const createLedger = (data) => apiFetch('/api/ledgers', { method: 'POST', body: JSON.stringify(data) });
export const updateLedger = (ledgerId, data) =>
  apiFetch(`/api/ledgers/${ledgerId}`, { method: 'PUT', body: JSON.stringify(data) });
export const createTransaction = (ledgerId, data) => apiFetch(`/api/ledgers/${ledgerId}/transactions`, { method: 'POST', body: JSON.stringify(data) });
export const saveLedgerTransactions = (ledgerId, transactions) =>
  apiFetch(`/api/ledgers/${ledgerId}/transactions/bulk`, {
    method: 'POST',
    body: JSON.stringify({ transactions }),
  });
export const getLedgerTransactions = (ledgerId) => apiFetch(`/api/ledgers/${ledgerId}/transactions`);
export const updateTransaction = (ledgerId, transactionId, data) =>
  apiFetch(`/api/ledgers/${ledgerId}/transactions/${transactionId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
export const deleteTransaction = (ledgerId, transactionId) =>
  apiFetch(`/api/ledgers/${ledgerId}/transactions/${transactionId}`, {
    method: 'DELETE',
  });
