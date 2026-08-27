/**
 * TYPES — Tipos compartidos de la aplicación
 *
 * Interfaces y tipos que se usan en múltiples capas.
 */

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export type UserRole = 'admin' | 'gerente';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}
