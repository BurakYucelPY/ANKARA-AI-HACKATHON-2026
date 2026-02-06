import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Fields from './pages/Fields';
import PlantLibrary from './pages/PlantLibrary';
import ManualControl from './pages/ManualControl';
import Sensors from './pages/Sensors';
import Weather from './pages/Weather';
import FieldDetail from './pages/FieldDetail';
import './App.css';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return null;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/*" element={
        <ProtectedRoute>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/fields" element={<Fields />} />
              <Route path="/fields/:fieldId" element={<FieldDetail />} />
              <Route path="/weather" element={<Weather />} />
              <Route path="/plants" element={<PlantLibrary />} />
              <Route path="/manual" element={<ManualControl />} />
              <Route path="/sensors" element={<Sensors />} />
            </Routes>
          </Layout>
        </ProtectedRoute>
      } />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
