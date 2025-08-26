import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./card";
import { Button } from "./button";
import { Badge } from "./badge";
import { Separator } from "./separator";
import {
  Book,
  ExternalLink,
  Server,
  Activity,
  Database,
  Zap,
  Copy,
  CheckCircle,
} from "lucide-react";
import { Link } from "react-router-dom";

interface ApiStatus {
  status: string;
  version: string;
  endpoints: Record<string, any>;
}

export function ApiQuickAccess() {
  const [apiStatus, setApiStatus] = useState<ApiStatus | null>(null);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    // Fetch API status
    fetch("/api/status")
      .then((res) => res.json())
      .then(setApiStatus)
      .catch(console.error);
  }, []);

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(""), 2000);
  };

  const baseUrl = window.location.origin;

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Book className="w-5 h-5 text-blue-600" />
            <CardTitle className="text-blue-900">API de Importação</CardTitle>
          </div>
          {apiStatus && (
            <Badge
              variant="default"
              className={
                apiStatus.status === "online" ? "bg-green-500" : "bg-red-500"
              }
            >
              <Server className="w-3 h-3 mr-1" />
              {apiStatus.status}
            </Badge>
          )}
        </div>
        <CardDescription className="text-blue-700">
          Acesso rápido à documentação e endpoints da API
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-blue-900 mb-2">Documentação:</h4>
            <div className="flex flex-wrap gap-2">
              <Link to="/api-docs">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-blue-300 text-blue-700 hover:bg-blue-100"
                >
                  <Book className="w-3 h-3 mr-1" />
                  Docs Completa
                </Button>
              </Link>

              <Button
                size="sm"
                variant="outline"
                className="border-blue-300 text-blue-700 hover:bg-blue-100"
                onClick={() => window.open("/api/docs", "_blank")}
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                OpenAPI JSON
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="border-blue-300 text-blue-700 hover:bg-blue-100"
                onClick={() => window.open("/api/status", "_blank")}
              >
                <Activity className="w-3 h-3 mr-1" />
                Status da API
              </Button>
            </div>
          </div>

          <Separator />

          {/* Quick Endpoints */}
          <div>
            <h4 className="font-semibold text-blue-900 mb-2">
              Endpoints Principais:
            </h4>
            <div className="space-y-2">
              {[
                {
                  method: "POST",
                  path: "/api/data/import",
                  desc: "Importar dados em lote",
                  icon: Database,
                },
                {
                  method: "POST",
                  path: "/api/data/bulk-insert",
                  desc: "Inserção em massa",
                  icon: Zap,
                },
                {
                  method: "POST",
                  path: "/api/data/auto-map",
                  desc: "Auto-mapeamento",
                  icon: Activity,
                },
                {
                  method: "GET",
                  path: "/api/data/{id}",
                  desc: "Obter dados",
                  icon: ExternalLink,
                },
              ].map((endpoint, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-white rounded border border-blue-200"
                >
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant="secondary"
                      className={
                        endpoint.method === "GET"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-green-100 text-green-800"
                      }
                    >
                      {endpoint.method}
                    </Badge>
                    <code className="text-xs font-mono text-gray-700">
                      {endpoint.path}
                    </code>
                    <span className="text-xs text-gray-600">
                      {endpoint.desc}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      handleCopy(`${baseUrl}${endpoint.path}`, endpoint.path)
                    }
                  >
                    {copied === endpoint.path ? (
                      <CheckCircle className="w-3 h-3 text-green-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Quick Examples */}
          <div>
            <h4 className="font-semibold text-blue-900 mb-2">
              Exemplo Rápido:
            </h4>
            <div className="bg-gray-100 p-3 rounded text-xs">
              <pre className="overflow-x-auto">{`curl -X POST ${baseUrl}/api/data/import \\
  -H "Content-Type: application/json" \\
  -d '{
    "spreadsheetId": "test",
    "data": [{"nome": "João", "email": "joao@test.com"}],
    "options": {"autoExpand": true}
  }'`}</pre>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={() =>
                handleCopy(
                  `curl -X POST ${baseUrl}/api/data/import -H "Content-Type: application/json" -d '{"spreadsheetId": "test", "data": [{"nome": "João", "email": "joao@test.com"}], "options": {"autoExpand": true}}'`,
                  "curl",
                )
              }
            >
              {copied === "curl" ? (
                <CheckCircle className="w-3 h-3 mr-1 text-green-600" />
              ) : (
                <Copy className="w-3 h-3 mr-1" />
              )}
              Copiar cURL
            </Button>
          </div>

          {/* Status Info */}
          {apiStatus && (
            <>
              <Separator />
              <div className="text-xs text-gray-600 space-y-1">
                <div>
                  <strong>Versão:</strong> {apiStatus.version}
                </div>
                <div>
                  <strong>Endpoints Ativos:</strong>{" "}
                  {Object.keys(apiStatus.endpoints).length}
                </div>
                <div>
                  <strong>Base URL:</strong> {baseUrl}
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
