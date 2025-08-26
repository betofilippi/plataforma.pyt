import { Request, Response } from "express";

// Simulação de database/cache para planilhas (mesmo do data-import)
const spreadsheetCache = new Map<string, any>();

// Utility para converter número da coluna para letra
function numberToColumn(num: number): string {
  let result = "";
  while (num >= 0) {
    result = String.fromCharCode(65 + (num % 26)) + result;
    num = Math.floor(num / 26) - 1;
  }
  return result;
}

// Detectar tipo de dados automaticamente
function detectDataType(value: any): string {
  if (value === null || value === undefined || value === "") return "text";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  if (value instanceof Date) return "date";

  const str = String(value);
  
  // Email
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) return "email";
  
  // URL
  if (/^https?:\/\//.test(str)) return "url";
  
  // Data
  if (/^\d{4}-\d{2}-\d{2}/.test(str) || /^\d{2}\/\d{2}\/\d{4}/.test(str)) return "date";
  
  // Número
  if (/^\d+(\.\d+)?$/.test(str)) return "number";
  
  // Moeda
  if (/^R\$\s?\d+[,.]?\d*/.test(str)) return "currency";
  
  // Telefone
  if (/^\(\d{2}\)\s?\d{4,5}-?\d{4}/.test(str)) return "phone";
  
  // CPF/CNPJ
  if (/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(str)) return "cpf";
  if (/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(str)) return "cnpj";

  return "text";
}

// Interface para dados do webhook
interface WebhookData {
  spreadsheetId?: string;
  table?: string;
  data: Record<string, any> | Record<string, any>[];
  source?: string;
  timestamp?: string;
  event_type?: string;
}

// Interface para configuração do webhook
interface WebhookConfig {
  id: string;
  url: string;
  spreadsheetId: string;
  table: string;
  mapping?: Record<string, string>;
  active: boolean;
  secret?: string;
  events: string[];
  created: Date;
  lastTriggered?: Date;
  totalRequests: number;
}

// Armazenamento de configurações de webhook
const webhookConfigs = new Map<string, WebhookConfig>();

// API: Receber dados via webhook
export async function receiveWebhook(req: Request, res: Response) {
  try {
    console.log('🔗 Webhook recebido:', {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body
    });

    const webhookData: WebhookData = req.body;
    
    // Validação básica
    if (!webhookData.data) {
      return res.status(400).json({
        success: false,
        error: "Campo 'data' é obrigatório",
        received: webhookData
      });
    }

    // Determinar ID da planilha (pode vir do body, query params ou header)
    const spreadsheetId = webhookData.spreadsheetId || 
                         req.query.spreadsheetId as string || 
                         req.headers['x-spreadsheet-id'] as string ||
                         'webhook-default';

    const table = webhookData.table || 
                  req.query.table as string || 
                  req.headers['x-table'] as string ||
                  'default';

    // Obter ou criar planilha
    let spreadsheet = spreadsheetCache.get(spreadsheetId);
    if (!spreadsheet) {
      spreadsheet = {
        id: spreadsheetId,
        cells: new Map(),
        rows: 0,
        cols: 0,
        tables: new Map(),
        metadata: {
          created: new Date(),
          lastModified: new Date(),
          webhookRequests: 0
        },
      };
      spreadsheetCache.set(spreadsheetId, spreadsheet);
    }

    // Obter ou criar tabela
    if (!spreadsheet.tables.has(table)) {
      spreadsheet.tables.set(table, {
        name: table,
        rows: 0,
        cols: 0,
        headers: [],
        data: []
      });
    }

    const targetTable = spreadsheet.tables.get(table);
    
    // Processar dados (pode ser objeto único ou array)
    const dataArray = Array.isArray(webhookData.data) ? webhookData.data : [webhookData.data];
    
    const results = {
      spreadsheetId,
      table,
      totalRecords: dataArray.length,
      processedRecords: 0,
      newRows: 0,
      insertedCells: 0,
      errors: [],
      timestamp: new Date().toISOString(),
      source: webhookData.source || 'webhook',
      event_type: webhookData.event_type || 'data_received'
    };

    // Processar cada registro
    for (let i = 0; i < dataArray.length; i++) {
      const record = dataArray[i];
      
      try {
        // Obter chaves dos campos
        const fields = Object.keys(record);
        
        // Atualizar headers se necessário
        fields.forEach(field => {
          if (!targetTable.headers.includes(field)) {
            targetTable.headers.push(field);
            targetTable.cols = targetTable.headers.length;
          }
        });

        // Inserir dados na tabela
        const rowIndex = targetTable.data.length;
        const newRow: any = {};
        
        fields.forEach((field, colIndex) => {
          const value = record[field];
          const dataType = detectDataType(value);
          
          newRow[field] = {
            value,
            dataType,
            row: rowIndex,
            col: colIndex,
            lastModified: new Date(),
            source: 'webhook'
          };

          // Também inserir no formato de células para compatibilidade
          const cellKey = `${rowIndex}-${colIndex}`;
          spreadsheet.cells.set(cellKey, {
            value,
            dataType,
            row: rowIndex,
            col: colIndex,
            table,
            field,
            lastModified: new Date(),
            source: 'webhook'
          });

          results.insertedCells++;
        });

        targetTable.data.push(newRow);
        targetTable.rows = targetTable.data.length;
        results.newRows++;
        results.processedRecords++;

      } catch (error) {
        results.errors.push({
          record: i,
          error: error.message,
          data: record
        });
      }
    }

    // Atualizar dimensões globais da planilha
    spreadsheet.rows = Math.max(spreadsheet.rows, targetTable.rows);
    spreadsheet.cols = Math.max(spreadsheet.cols, targetTable.cols);
    
    // Atualizar metadata
    spreadsheet.metadata.lastModified = new Date();
    spreadsheet.metadata.webhookRequests = (spreadsheet.metadata.webhookRequests || 0) + 1;
    spreadsheet.metadata.lastWebhook = {
      timestamp: new Date(),
      source: results.source,
      event_type: results.event_type,
      recordsProcessed: results.processedRecords
    };

    console.log('✅ Webhook processado com sucesso:', results);

    // Resposta de sucesso
    res.status(200).json({
      success: true,
      message: `${results.processedRecords} registros processados via webhook`,
      results,
      spreadsheet: {
        id: spreadsheetId,
        table,
        rows: targetTable.rows,
        cols: targetTable.cols,
        totalCells: spreadsheet.cells.size,
        headers: targetTable.headers
      }
    });

  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    
    res.status(500).json({
      success: false,
      error: "Erro interno do servidor",
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// API: Configurar webhook
export async function configureWebhook(req: Request, res: Response) {
  try {
    const {
      url,
      spreadsheetId,
      table = 'default',
      mapping = {},
      events = ['data.created', 'data.updated'],
      secret
    } = req.body;

    if (!url || !spreadsheetId) {
      return res.status(400).json({
        success: false,
        error: "URL e spreadsheetId são obrigatórios"
      });
    }

    const webhookId = `webhook_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    const config: WebhookConfig = {
      id: webhookId,
      url,
      spreadsheetId,
      table,
      mapping,
      active: true,
      secret,
      events,
      created: new Date(),
      totalRequests: 0
    };

    webhookConfigs.set(webhookId, config);

    res.json({
      success: true,
      webhook: {
        id: webhookId,
        endpoint: `/api/webhook/${webhookId}`,
        fullUrl: `${req.protocol}://${req.get('host')}/api/webhook/${webhookId}`,
        config: {
          spreadsheetId,
          table,
          events,
          active: true
        }
      },
      message: "Webhook configurado com sucesso"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// API: Listar webhooks configurados
export async function listWebhooks(req: Request, res: Response) {
  try {
    const { spreadsheetId } = req.query;
    
    let webhooks = Array.from(webhookConfigs.values());
    
    if (spreadsheetId) {
      webhooks = webhooks.filter(w => w.spreadsheetId === spreadsheetId);
    }

    res.json({
      success: true,
      webhooks: webhooks.map(w => ({
        id: w.id,
        url: w.url,
        spreadsheetId: w.spreadsheetId,
        table: w.table,
        active: w.active,
        events: w.events,
        created: w.created,
        lastTriggered: w.lastTriggered,
        totalRequests: w.totalRequests
      })),
      total: webhooks.length
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// API: Ativar/Desativar webhook
export async function toggleWebhook(req: Request, res: Response) {
  try {
    const { webhookId } = req.params;
    const { active } = req.body;

    const webhook = webhookConfigs.get(webhookId);
    if (!webhook) {
      return res.status(404).json({
        success: false,
        error: "Webhook não encontrado"
      });
    }

    webhook.active = active;
    webhookConfigs.set(webhookId, webhook);

    res.json({
      success: true,
      message: `Webhook ${active ? 'ativado' : 'desativado'} com sucesso`,
      webhook: {
        id: webhookId,
        active: webhook.active
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// API: Deletar webhook
export async function deleteWebhook(req: Request, res: Response) {
  try {
    const { webhookId } = req.params;

    const webhook = webhookConfigs.get(webhookId);
    if (!webhook) {
      return res.status(404).json({
        success: false,
        error: "Webhook não encontrado"
      });
    }

    webhookConfigs.delete(webhookId);

    res.json({
      success: true,
      message: "Webhook deletado com sucesso",
      webhookId
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// API: Testar webhook
export async function testWebhook(req: Request, res: Response) {
  try {
    const { webhookId } = req.params;
    
    const webhook = webhookConfigs.get(webhookId);
    if (!webhook) {
      return res.status(404).json({
        success: false,
        error: "Webhook não encontrado"
      });
    }

    // Enviar dados de teste
    const testData = {
      spreadsheetId: webhook.spreadsheetId,
      table: webhook.table,
      data: {
        id: Date.now(),
        nome: "Teste Webhook",
        email: "teste@webhook.com",
        timestamp: new Date().toISOString()
      },
      source: 'webhook_test',
      event_type: 'test'
    };

    // Simular chamada para o próprio endpoint
    const result = await receiveWebhook({
      body: testData,
      method: 'POST',
      url: `/api/webhook/${webhookId}`,
      headers: {},
      query: {}
    } as any, res);

    webhook.lastTriggered = new Date();
    webhook.totalRequests++;
    webhookConfigs.set(webhookId, webhook);

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// API: Obter dados de uma tabela específica
export async function getTableData(req: Request, res: Response) {
  try {
    const { spreadsheetId, table = 'default' } = req.params;
    const { format = 'json', limit = 100, offset = 0 } = req.query;

    const spreadsheet = spreadsheetCache.get(spreadsheetId);
    if (!spreadsheet) {
      return res.status(404).json({
        success: false,
        error: "Planilha não encontrada"
      });
    }

    const targetTable = spreadsheet.tables.get(table);
    if (!targetTable) {
      return res.status(404).json({
        success: false,
        error: "Tabela não encontrada"
      });
    }

    const startIndex = parseInt(offset as string);
    const limitNum = parseInt(limit as string);
    const data = targetTable.data.slice(startIndex, startIndex + limitNum);

    // Formatar dados conforme solicitado
    let formattedData;
    if (format === 'array') {
      formattedData = data.map(row => 
        targetTable.headers.map(header => row[header]?.value || '')
      );
    } else {
      formattedData = data.map(row => {
        const obj: any = {};
        targetTable.headers.forEach(header => {
          obj[header] = row[header]?.value || '';
        });
        return obj;
      });
    }

    res.json({
      success: true,
      data: formattedData,
      metadata: {
        table,
        spreadsheetId,
        headers: targetTable.headers,
        totalRows: targetTable.rows,
        totalCols: targetTable.cols,
        returnedRows: data.length,
        pagination: {
          offset: startIndex,
          limit: limitNum,
          hasMore: startIndex + limitNum < targetTable.rows
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// Exportar dados como CSV
export async function exportCSV(req: Request, res: Response) {
  try {
    const { spreadsheetId, table = 'default' } = req.params;

    const spreadsheet = spreadsheetCache.get(spreadsheetId);
    if (!spreadsheet) {
      return res.status(404).json({
        success: false,
        error: "Planilha não encontrada"
      });
    }

    const targetTable = spreadsheet.tables.get(table);
    if (!targetTable) {
      return res.status(404).json({
        success: false,
        error: "Tabela não encontrada"
      });
    }

    // Gerar CSV
    const rows = [targetTable.headers.join(',')];
    
    targetTable.data.forEach(row => {
      const values = targetTable.headers.map(header => {
        const value = row[header]?.value || '';
        // Escapar aspas e vírgulas
        return typeof value === 'string' && (value.includes(',') || value.includes('"')) 
          ? `"${value.replace(/"/g, '""')}"` 
          : value;
      });
      rows.push(values.join(','));
    });

    const csvContent = rows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${spreadsheetId}_${table}.csv"`);
    res.send(csvContent);

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
