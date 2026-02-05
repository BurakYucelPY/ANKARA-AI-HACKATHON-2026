import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Fields from './pages/Fields';
import PlantLibrary from './pages/PlantLibrary';
import ManualControl from './pages/ManualControl';
import Sensors from './pages/Sensors';
import Weather from './pages/Weather';
import './App.css';

/**
 * Ana Uygulama Bileşeni
 * Single Responsibility: Routing ve layout yönetimi
 */
function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/fields" element={<Fields />} />
          <Route path="/weather" element={<Weather />} />
          <Route path="/plants" element={<PlantLibrary />} />
          <Route path="/manual" element={<ManualControl />} />
          <Route path="/sensors" element={<Sensors />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
