import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export type UserRole = 'admin' | 'gerente' | 'vendedor';

interface User {
  id: string;
  nombre: string;
  email: string;
  rol: UserRole;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

// ¿Está Cognito configurado? (variables de entorno de Vite)
const COGNITO_CONFIGURED = Boolean(
  import.meta.env.VITE_COGNITO_USER_POOL_ID && import.meta.env.VITE_COGNITO_CLIENT_ID,
);

const AuthContext = createContext<AuthContextType | null>(null);

// Usuarios locales para desarrollo (después se reemplaza con Cognito)
const USERS_DEV: Record<string, { password: string; user: User }> = {
  admin: {
    password: 'admin123',
    user: { id: 'admin', nombre: 'Administrador', email: 'admin@rockality.com', rol: 'admin' },
  },
  gerente: {
    password: 'gerente123',
    user: { id: 'gerente', nombre: 'Gerente', email: 'gerente@rockality.com', rol: 'gerente' },
  },
  vendedor: {
    password: 'vendedor123',
    user: {
      id: 'vendedor',
      nombre: 'Vendedor',
      email: 'vendedor@rockality.com',
      rol: 'vendedor',
    },
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('erp_user');
    return stored ? JSON.parse(stored) : null;
  });

  const login = async (username: string, password: string): Promise<boolean> => {
    if (COGNITO_CONFIGURED) {
      // Producción: login contra Cognito. La integración con Amplify/SDK se
      // conecta aquí; debe obtener el idToken, guardarlo en 'erp_token' y
      // poblar el user desde los claims. (Pendiente al configurar el User Pool.)
      throw new Error('Login con Cognito aún no configurado en este entorno.');
    }

    // Desarrollo: login local (mock) mientras no exista Cognito.
    const entry = USERS_DEV[username];
    if (entry && entry.password === password) {
      setUser(entry.user);
      localStorage.setItem('erp_user', JSON.stringify(entry.user));
      // Identifica al usuario para la auditoría del backend en modo dev
      localStorage.setItem('erp_dev_user', entry.user.id);
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('erp_user');
    localStorage.removeItem('erp_token');
    localStorage.removeItem('erp_dev_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}
