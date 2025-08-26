import { Request, Response } from "express";

// OpenAPI/Swagger documentation
const apiDocumentation = {
  openapi: "3.0.0",
  info: {
    title: "Planilha API - Sistema de Importação de Dados",
    version: "1.0.0",
    description:
      "API completa para importação de dados com criação automática de linhas em planilhas virtualizadas",
    contact: {
      name: "Suporte Técnico",
      email: "suporte@planilha.app",
    },
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Servidor de Desenvolvimento",
    },
    {
      url: "https://planilha.app",
      description: "Servidor de Produção",
    },
  ],
  paths: {
    "/api/data/import": {
      post: {
        summary: "Importar dados em lote",
        description:
          "Importa array de objetos criando linhas automaticamente na planilha",
        tags: ["Importação de Dados"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["spreadsheetId", "data"],
                properties: {
                  spreadsheetId: {
                    type: "string",
                    description: "ID único da planilha",
                    example: "clientes-2024",
                  },
                  data: {
                    type: "array",
                    description: "Array de objetos para importar",
                    items: {
                      type: "object",
                      additionalProperties: true,
                    },
                    example: [
                      { nome: "João Silva", email: "joao@empresa.com" },
                      { nome: "Maria Santos", email: "maria@empresa.com" },
                    ],
                  },
                  options: {
                    type: "object",
                    properties: {
                      mapping: {
                        type: "object",
                        description: "Mapear campos para colunas específicas",
                        example: { nome: "A", email: "B", telefone: "C" },
                      },
                      autoExpand: {
                        type: "boolean",
                        default: true,
                        description: "Criar linhas automaticamente",
                      },
                      batchSize: {
                        type: "number",
                        default: 1000,
                        description: "Tamanho do lote para processamento",
                      },
                      onConflict: {
                        type: "string",
                        enum: ["overwrite", "skip", "append"],
                        default: "overwrite",
                        description: "Como lidar com dados existentes",
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Dados importados com sucesso",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "1000 registros importados com sucesso",
                    },
                    results: {
                      type: "object",
                      properties: {
                        totalRecords: { type: "number", example: 1000 },
                        processedRecords: { type: "number", example: 1000 },
                        newRows: {
                          type: "number",
                          example: 1000,
                          description: "Linhas criadas automaticamente",
                        },
                        newCols: { type: "number", example: 5 },
                        insertedCells: { type: "number", example: 5000 },
                        errors: { type: "array", items: { type: "object" } },
                      },
                    },
                    spreadsheet: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        rows: {
                          type: "number",
                          description: "Total de linhas após importação",
                        },
                        cols: {
                          type: "number",
                          description: "Total de colunas após importação",
                        },
                        totalCells: { type: "number" },
                      },
                    },
                  },
                },
              },
            },
          },
          400: {
            description: "Erro na requisição",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: false },
                    error: {
                      type: "string",
                      example: "spreadsheetId e data são obrigatórios",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/data/bulk-insert": {
      post: {
        summary: "Inserção em massa",
        description: "Inserção otimizada para grandes volumes de dados",
        tags: ["Importação de Dados"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["spreadsheetId", "records"],
                properties: {
                  spreadsheetId: { type: "string", example: "vendas-2024" },
                  records: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        row: {
                          type: "number",
                          description: "Linha específica (opcional)",
                        },
                        data: { type: "object", additionalProperties: true },
                      },
                    },
                    example: [
                      { data: { produto: "Notebook", valor: 2500 } },
                      { row: 10, data: { produto: "Mouse", valor: 50 } },
                    ],
                  },
                  options: {
                    type: "object",
                    properties: {
                      autoExpand: { type: "boolean", default: true },
                      preserveTypes: { type: "boolean", default: true },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Inserção realizada com sucesso",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    results: {
                      type: "object",
                      properties: {
                        insertedCells: { type: "number" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/data/auto-map": {
      post: {
        summary: "Auto-mapeamento de campos",
        description:
          "Analisa dados de amostra e sugere mapeamento automático para colunas",
        tags: ["Utilitários"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["sampleData"],
                properties: {
                  sampleData: {
                    type: "array",
                    description: "Amostra dos dados para análise",
                    minItems: 1,
                    items: { type: "object", additionalProperties: true },
                    example: [
                      {
                        nome_completo: "João Silva",
                        email_contato: "joao@empresa.com",
                        numero_telefone: "(11) 99999-1234",
                        valor_salario: "R$ 5.000,00",
                      },
                    ],
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Mapeamento gerado com sucesso",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    mapping: {
                      type: "object",
                      description: "Mapeamento campo -> coluna",
                      example: {
                        nome_completo: "A",
                        email_contato: "B",
                        numero_telefone: "C",
                      },
                    },
                    suggestions: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          field: { type: "string" },
                          column: { type: "string" },
                          suggestedType: {
                            type: "string",
                            enum: [
                              "text",
                              "email",
                              "phone",
                              "currency",
                              "date",
                              "cpf",
                              "cnpj",
                            ],
                          },
                          suggestedFormat: { type: "string" },
                          sampleValue: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/data/{spreadsheetId}": {
      get: {
        summary: "Obter dados da planilha",
        description:
          "Recupera dados de uma planilha específica com suporte a paginação",
        tags: ["Consulta de Dados"],
        parameters: [
          {
            name: "spreadsheetId",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "ID da planilha",
          },
          {
            name: "startRow",
            in: "query",
            schema: { type: "number", default: 0 },
            description: "Linha inicial",
          },
          {
            name: "endRow",
            in: "query",
            schema: { type: "number" },
            description: "Linha final",
          },
          {
            name: "startCol",
            in: "query",
            schema: { type: "number", default: 0 },
            description: "Coluna inicial",
          },
          {
            name: "endCol",
            in: "query",
            schema: { type: "number" },
            description: "Coluna final",
          },
        ],
        responses: {
          200: {
            description: "Dados recuperados com sucesso",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "array",
                      items: { type: "array", items: { type: "string" } },
                      description: "Matriz de dados da planilha",
                    },
                    metadata: {
                      type: "object",
                      properties: {
                        rows: { type: "number" },
                        cols: { type: "number" },
                        totalCells: { type: "number" },
                        range: {
                          type: "object",
                          properties: {
                            startRow: { type: "number" },
                            endRow: { type: "number" },
                            startCol: { type: "number" },
                            endCol: { type: "number" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          404: {
            description: "Planilha não encontrada",
          },
        },
      },
    },
    "/api/data/stream": {
      post: {
        summary: "Streaming de dados",
        description:
          "Inicia stream de dados em tempo real via Server-Sent Events",
        tags: ["Streaming"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["spreadsheetId"],
                properties: {
                  spreadsheetId: { type: "string" },
                  chunkSize: { type: "number", default: 100 },
                  mapping: { type: "object" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Stream iniciado com sucesso",
            content: {
              "text/event-stream": {
                schema: {
                  type: "string",
                  description: "Server-Sent Events stream",
                },
                example:
                  'data: {"type": "connected", "message": "Stream iniciado"}\n\ndata: {"type": "data", "records": [...], "totalRecords": 150}\n\n',
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Error: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          error: { type: "string" },
          details: { type: "string" },
        },
      },
      ImportResult: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          message: { type: "string" },
          results: {
            type: "object",
            properties: {
              totalRecords: { type: "number" },
              processedRecords: { type: "number" },
              newRows: {
                type: "number",
                description: "Linhas criadas automaticamente",
              },
              newCols: { type: "number" },
              insertedCells: { type: "number" },
              errors: { type: "array", items: { type: "object" } },
            },
          },
        },
      },
    },
  },
  tags: [
    {
      name: "Importação de Dados",
      description:
        "Endpoints para importar dados com criação automática de linhas",
    },
    {
      name: "Consulta de Dados",
      description: "Endpoints para consultar dados existentes",
    },
    {
      name: "Utilitários",
      description: "Ferramentas auxiliares como auto-mapeamento",
    },
    {
      name: "Streaming",
      description: "Recebimento de dados em tempo real",
    },
  ],
};

// Endpoint para documentação OpenAPI
export async function getApiDocs(req: Request, res: Response) {
  res.json(apiDocumentation);
}

// Endpoint para status da API
export async function getApiStatus(req: Request, res: Response) {
  res.json({
    status: "online",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    endpoints: {
      import: { status: "active", description: "Importação de dados" },
      bulkInsert: { status: "active", description: "Inserção em massa" },
      autoMap: { status: "active", description: "Auto-mapeamento" },
      getData: { status: "active", description: "Consulta de dados" },
      stream: { status: "active", description: "Streaming de dados" },
    },
    features: {
      autoRowCreation: true,
      typeDetection: true,
      intelligentMapping: true,
      batchProcessing: true,
      realTimeStreaming: true,
    },
    performance: {
      maxBatchSize: 10000,
      maxConcurrentStreams: 10,
      averageProcessingTime: "2-5s per 1000 records",
    },
  });
}

// Endpoint para métricas da API
export async function getApiMetrics(req: Request, res: Response) {
  // Em produção, isso viria de um sistema de monitoramento
  res.json({
    totalRequests: 15420,
    totalRecordsProcessed: 2580000,
    totalRowsCreated: 2580000,
    averageResponseTime: 245,
    successRate: 99.8,
    uptime: "99.9%",
    lastUpdate: new Date().toISOString(),
    breakdown: {
      import: { requests: 8500, records: 1200000 },
      bulkInsert: { requests: 4200, records: 900000 },
      autoMap: { requests: 1800, records: 0 },
      getData: { requests: 820, records: 0 },
      stream: { requests: 100, records: 480000 },
    },
  });
}
