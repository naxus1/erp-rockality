import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div>
      <h2 className="text-lg font-bold mb-4">Dashboard</h2>
      <p className="text-sm text-gray-600">
        Bienvenido, {user?.nombre}. Rol: {user?.rol}
      </p>
      <p className="text-sm text-gray-400 mt-2">Reportes y métricas próximamente.</p>
    </div>
  );
}
