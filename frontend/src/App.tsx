import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Placeholder from './pages/Placeholder';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/clientes" element={<Placeholder />} />
            <Route path="/productos" element={<Placeholder />} />
            <Route path="/ventas" element={<Placeholder />} />
            <Route path="/pagos" element={<Placeholder />} />
            <Route path="/planes" element={<Placeholder />} />
            <Route path="/gastos" element={<Placeholder />} />
            <Route path="/terceros" element={<Placeholder />} />
            <Route path="/reportes" element={<Placeholder />} />
            <Route path="/catalogos" element={<Placeholder />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
