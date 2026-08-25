import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Usuario y contraseña son obligatorios');
      return;
    }

    const success = login(username, password);
    if (success) {
      navigate('/');
    } else {
      setError('Usuario o contraseña incorrectos');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#e0e5ec]">
      <div className="w-full max-w-sm p-8 rounded-2xl neu-flat">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-700">Rockality</h1>
          <p className="text-xs text-gray-400 mt-1">ERP Gimnasio</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="username" className="block text-xs font-medium text-gray-500 mb-2">
              Usuario
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#e0e5ec] rounded-lg px-4 py-2.5 text-sm text-gray-700 neu-pressed outline-none focus:ring-2 focus:ring-blue-300/50"
              autoComplete="username"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-medium text-gray-500 mb-2">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#e0e5ec] rounded-lg px-4 py-2.5 text-sm text-gray-700 neu-pressed outline-none focus:ring-2 focus:ring-blue-300/50"
              autoComplete="current-password"
            />
          </div>

          {error && <p className="text-red-500 text-xs text-center">{error}</p>}

          <button
            type="submit"
            className="w-full bg-[#e0e5ec] text-gray-700 font-medium py-2.5 rounded-lg text-sm neu-btn transition-all hover:text-gray-900"
          >
            Iniciar sesión
          </button>
        </form>

        <p className="mt-6 text-[10px] text-gray-400 text-center">
          Dev: admin/admin123 · gerente/gerente123 · vendedor/vendedor123
        </p>
      </div>
    </div>
  );
}
