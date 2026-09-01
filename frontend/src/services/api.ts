/**
 * API Service — Wrapper para llamadas al backend
 *
 * Inyecta el token de autenticación (JWT de Cognito) en el header Authorization.
 * En desarrollo sin Cognito, además envía X-Dev-User con el usuario logueado
 * para que la auditoría refleje quién hace cada acción.
 */
// En dev usamos el proxy de Vite (/api -> localhost:3000). En producción,
// VITE_API_URL apunta al API Gateway; las rutas ya incluyen el prefijo /api.
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) || '';
const BASE_URL = `${API_BASE}/api`;

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
    // Token ausente/expirado o sesión vencida: limpiar y llevar al login.
    localStorage.removeItem('erp_token');
    localStorage.removeItem('erp_user');
    localStorage.removeItem('erp_dev_user');
    localStorage.removeItem('erp_session_exp');
    // Redirige a la raíz (login) evitando quedar en un estado roto (404/pantalla vacía).
    if (window.location.pathname !== '/') {
      window.location.href = '/';
    }
  }

  const data = await res.json();

  if (!res.ok) {
    // Si el backend devuelve el detalle de validación (Zod), lo mostramos campo
    // por campo para que el error sea específico y no un genérico "Datos inválidos".
    if (Array.isArray(data.details) && data.details.length > 0) {
      const detalle = data.details
        .map((d: { campo?: string; mensaje?: string }) =>
          d.campo ? `${d.campo}: ${d.mensaje}` : d.mensaje,
        )
        .join(' · ');
      throw new Error(detalle || data.error || `Error ${res.status}`);
    }
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
