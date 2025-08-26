import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Building2, Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">
                PLATAFORMA.APP
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* 404 Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="mb-8">
            <div className="text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-4">
              404
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Página não encontrada
            </h1>
            <p className="text-gray-600 mb-8">
              A página que você está procurando não existe ou foi movida. Que
              tal explorar nossos módulos empresariais?
            </p>
          </div>

          <div className="space-y-4">
            <Link to="/">
              <Button size="lg" className="w-full">
                <Home className="w-4 h-4 mr-2" />
                Voltar ao Início
              </Button>
            </Link>

            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Página Anterior
            </Button>
          </div>

          <div className="mt-12 text-sm text-gray-500">
            <p>Precisa de ajuda? Entre em contato conosco!</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
