import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clientes from './pages/Clientes';
import Productos from './pages/Productos';
import Ventas from './pages/Ventas';
import Terceros from './pages/Terceros';
import Compras from './pages/Compras';
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
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/productos" element={<Productos />} />
            <Route path="/ventas" element={<Ventas />} />
            <Route path="/pagos" element={<Placeholder />} />
            <Route path="/planes" element={<Placeholder />} />
            <Route path="/gastos" element={<Placeholder />} />
            <Route path="/gastos/nuevo" element={<Placeholder />} />
            <Route path="/compras" element={<Compras />} />
            <Route path="/terceros" element={<Terceros />} />
            <Route path="/reportes" element={<Placeholder />} />
            <Route path="/catalogos" element={<Placeholder />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
