import { BrowserRouter, Routes, Route } from 'react-router-dom';
// Importamos nuestras nuevas páginas
import IndexPage from './pages/IndexPage';
import ApiTestPage from './pages/ApiTestPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta principal: Index */}
        <Route path="/" element={<IndexPage />} />
        
        {/* Ruta de prueba: API */}
        <Route path="/api-test" element={<ApiTestPage />} />
        
        {/* Aquí irás añadiendo más rutas como /login, /devices, etc. */}
      </Routes>
    </BrowserRouter>
  );
}