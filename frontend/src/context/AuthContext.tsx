import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { CognitoUserPool, CognitoUser, AuthenticationDetails } from 'amazon-cognito-identity-js';

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
const COGNITO_USER_POOL_ID = import.meta.env.VITE_COGNITO_USER_POOL_ID as string | undefined;
const COGNITO_CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID as string | undefined;
const COGNITO_CONFIGURED = Boolean(COGNITO_USER_POOL_ID && COGNITO_CLIENT_ID);

const userPool = COGNITO_CONFIGURED
  ? new CognitoUserPool({ UserPoolId: COGNITO_USER_POOL_ID!, ClientId: COGNITO_CLIENT_ID! })
  : null;

// Deriva el rol desde los grupos de Cognito (claim cognito:groups)
function rolDesdeToken(payload: Record<string, unknown>): UserRole {
  const grupos = (payload['cognito:groups'] as string[]) || [];
  if (grupos.includes('admin')) return 'admin';
  if (grupos.includes('gerente')) return 'gerente';
  return 'vendedor';
}

// Login real contra Cognito: devuelve el user + guarda el idToken.
function loginCognito(email: string, password: string): Promise<{ token: string; user: User }> {
  return new Promise((resolve, reject) => {
    const cognitoUser = new CognitoUser({ Username: email, Pool: userPool! });
    const authDetails = new AuthenticationDetails({ Username: email, Password: password });
    cognitoUser.authenticateUser(authDetails, {
      onSuccess: (session) => {
        const idToken = session.getIdToken();
        const payload = idToken.decodePayload() as Record<string, unknown>;
        resolve({
          token: idToken.getJwtToken(),
          user: {
            id: String(payload['cognito:username'] || payload.sub),
            nombre: (payload.email as string) || email,
            email: (payload.email as string) || email,
            rol: rolDesdeToken(payload),
          },
        });
      },
      onFailure: (err) => reject(err),
      newPasswordRequired: () =>
        reject(new Error('Debes cambiar la contraseña temporal antes de iniciar sesión.')),
    });
  });
}

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
      // Producción: login real contra Cognito. Guarda el idToken (lo usa api.ts
      // en el header Authorization) y puebla el user desde los claims del token.
      const { token, user: u } = await loginCognito(username, password);
      setUser(u);
      localStorage.setItem('erp_user', JSON.stringify(u));
      localStorage.setItem('erp_token', token);
      return true;
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
