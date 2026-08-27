import { useLocation } from 'react-router-dom';

export default function Placeholder() {
  const location = useLocation();
  const name = location.pathname.replace('/', '') || 'módulo';

  return (
    <div>
      <h2 className="text-lg font-bold mb-4 capitalize">{name}</h2>
      <p className="text-sm text-gray-500">Módulo en construcción.</p>
    </div>
  );
}
