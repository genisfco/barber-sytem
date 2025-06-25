import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { logError } from "@/utils/logger";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    logError(
      new Error(`Página não encontrada: ${window.location.pathname}`),
      'Página não encontrada:'
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4 text-red-600">404</h1>
        <p className="text-xl text-red-400 mb-6">Oops! Página não Encontrada</p>
        <a href="/" className="bg-blue-700 text-white px-6 py-2 rounded shadow hover:bg-blue-800 transition-colors duration-200">
          Retorne para o Dashboard
        </a>
      </div>
    </div>
  );
};

export default NotFound;
