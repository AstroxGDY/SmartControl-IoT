import { Link } from 'react-router-dom';

export default function IndexPage() {
  return (
    <div className="p-8 text-center bg-gray-900 min-h-screen text-white">
      <h1 className="text-4xl font-extrabold text-blue-500 mb-6">
        SmartControl Dashboard
      </h1>
      <p className="text-gray-400 mb-8">Bienvenido a la gestión centralizada de tu TFG.</p>
      
      <Link 
        to="/api-test" 
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-lg"
      >
        Probar Conexión Backend
      </Link>
    </div>
  );
}