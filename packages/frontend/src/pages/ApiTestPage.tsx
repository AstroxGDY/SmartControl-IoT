import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ApiTestPage() {
  const [message, setMessage] = useState("Esperando respuesta...");
  const navigate = useNavigate();

  const callBackend = async () => {
    try {
      const response = await fetch('http://localhost:3000/hola');
      const data = await response.json();
      setMessage(data.msg);
    } catch (err) {
      setMessage("Error: ¿Has arrancado el backend? " + err);
    }
  };

  return (
    <div className="p-8 bg-gray-900 min-h-screen text-white">
      <button 
        onClick={() => navigate(-1)} 
        className="text-blue-400 hover:text-blue-300 underline mb-6 flex items-center"
      >
        ← Volver al Dashboard
      </button>
      
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-2xl">
        <h2 className="text-2xl font-bold mb-4">Estado del Servidor</h2>
        <div className="bg-black p-4 rounded-md mb-6 font-mono text-green-400 border border-green-900/30">
          {message}
        </div>
        
        <button 
          onClick={callBackend}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition-all"
        >
          Llamar al Backend (Fastify)
        </button>
      </div>
    </div>
  );
}