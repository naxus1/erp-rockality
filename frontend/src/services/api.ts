/**
 * API Service — Wrapper para llamadas al backend
 *
 * Inyecta el token de autenticación (JWT de Cognito) en el header Authorization.
 * En desarrollo sin Cognito, además envía X-Dev-User con el usuario logueado
 * para que la auditoría refleje quién hace cada acción.
 */
const BASE_URL = '/api';

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const token = localStorage.getItem('erp_token');
  if (token) headers.Authorization = `Bearer ${token}`;
  // Modo dev (sin token real): identifica al usuario logueado para la auditoría
  const devUser = localStorage.getItem('erp_dev_user');
  if (!token && devUser) headers['X-Dev-User'] = devUser;
  return headers;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(options?.headers as Record<string, string> | undefined),
    },
  });

  if (res.status === 401) {
    // Token ausente/expirado: forzar re-login
    localStorage.removeItem('erp_token');
    localStorage.removeItem('erp_user');
  }

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Error ${res.status}`);
  }

  return data;
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body: unknown) =>
    request<T>(url, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(url: string, body: unknown) =>
    request<T>(url, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(url: string) => request<T>(url, { method: 'DELETE' }),
};
