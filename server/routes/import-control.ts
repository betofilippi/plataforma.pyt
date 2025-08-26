import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://yhvtsbkotszxqndkhhhx.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

// Configuração do Multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/import-documents');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Apenas arquivos PDF, JPG, JPEG e PNG são permitidos'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// GET /api/import/processes - Listar todos os processos
router.get('/processes', async (req, res) => {
  try {
    const { data: processes, error } = await supabase
      .from('import_processes')
      .select(`
        *,
        supplier:suppliers(*),
        documents:import_documents(*),
        stages:process_stages(*),
        tax_calculation:tax_calculations(*),
        consolidated_products:consolidated_products(*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(processes || []);
  } catch (error) {
    console.error('Erro ao buscar processos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/import/processes - Criar novo processo
router.post('/processes', async (req, res) => {
  try {
    const { supplier, ...processData } = req.body;

    // Primeiro, criar ou encontrar o fornecedor
    let supplierId;
    if (supplier.id) {
      supplierId = supplier.id;
    } else {
      const { data: newSupplier, error: supplierError } = await supabase
        .from('suppliers')
        .insert([supplier])
        .select('id')
        .single();
      
      if (supplierError) throw supplierError;
      supplierId = newSupplier.id;
    }

    // Criar o processo
    const { data: newProcess, error: processError } = await supabase
      .from('import_processes')
      .insert([{
        ...processData,
        supplier_id: supplierId
      }])
      .select(`
        *,
        supplier:suppliers(*),
        documents:import_documents(*),
        stages:process_stages(*),
        tax_calculation:tax_calculations(*),
        consolidated_products:consolidated_products(*)
      `)
      .single();

    if (processError) throw processError;

    // Criar os estágios iniciais do processo
    const stages = [
      { stage: 'budget', status: 'in_progress', process_id: newProcess.id },
      { stage: 'order', status: 'pending', process_id: newProcess.id },
      { stage: 'shipment', status: 'pending', process_id: newProcess.id },
      { stage: 'port_arrival', status: 'pending', process_id: newProcess.id },
      { stage: 'customs_clearance', status: 'pending', process_id: newProcess.id },
      { stage: 'delivery', status: 'pending', process_id: newProcess.id }
    ];

    await supabase.from('process_stages').insert(stages);

    res.status(201).json(newProcess);
  } catch (error) {
    console.error('Erro ao criar processo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/import/documents/upload - Upload de documentos
router.post('/documents/upload', upload.array('documents'), async (req, res) => {
  try {
    const { processId, documentType } = req.body;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const documents = files.map(file => ({
      process_id: processId,
      type: documentType,
      file_name: file.originalname,
      file_path: file.path,
      status: 'completed',
      uploaded_at: new Date().toISOString()
    }));

    const { data: newDocuments, error } = await supabase
      .from('import_documents')
      .insert(documents)
      .select();

    if (error) throw error;

    res.json(newDocuments);
  } catch (error) {
    console.error('Erro no upload:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/import/documents/:id/ocr - Processar OCR em documento
router.post('/documents/:id/ocr', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Aqui você implementaria a integração com Tesseract.js ou Google Vision API
    // Por enquanto, retornamos dados mock
    const mockOCRData = {
      extractedText: 'Texto extraído do documento...',
      values: {
        amount: '1234.56',
        date: '2024-01-15',
        invoice_number: 'INV-001'
      },
      confidence: 0.95
    };

    const { error } = await supabase
      .from('import_documents')
      .update({
        ocr_data: mockOCRData,
        status: 'completed'
      })
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true, ocrData: mockOCRData });
  } catch (error) {
    console.error('Erro no processamento OCR:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/import/processes/:id/taxes - Salvar cálculo de impostos
router.post('/processes/:id/taxes', async (req, res) => {
  try {
    const { id } = req.params;
    const taxData = req.body;

    const { data, error } = await supabase
      .from('tax_calculations')
      .upsert([{
        process_id: id,
        ...taxData
      }])
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Erro ao salvar cálculo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/import/translate - Traduzir texto
router.post('/translate', async (req, res) => {
  try {
    const { text, from, to } = req.body;
    
    // Aqui você implementaria a integração com Google Translate API
    // Por enquanto, retornamos uma tradução mock
    const mockTranslation = {
      originalText: text,
      translatedText: `Tradução de "${text}" do ${from} para ${to}`,
      from,
      to,
      confidence: 0.98
    };

    // Salvar a tradução no banco para cache
    await supabase
      .from('translations')
      .insert([{
        original_text: text,
        original_language: from,
        translated_text: mockTranslation.translatedText,
        target_language: to
      }]);

    res.json({ translation: mockTranslation.translatedText });
  } catch (error) {
    console.error('Erro na tradução:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/import/ncm/:code - Buscar informações de NCM
router.get('/ncm/:code', async (req, res) => {
  try {
    const { code } = req.params;
    
    // Aqui você implementaria a consulta a uma base de NCM
    // Por enquanto, retornamos dados mock
    const mockNCMData = {
      code,
      description: 'Descrição do produto NCM',
      iiRate: 0.14, // 14%
      ipiRate: 0.05, // 5%
      unit: 'UN'
    };

    res.json(mockNCMData);
  } catch (error) {
    console.error('Erro ao buscar NCM:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/import/products/consolidate - Consolidar produtos de um processo
router.post('/products/consolidate', async (req, res) => {
  try {
    const { processId, products } = req.body;

    const consolidatedProducts = products.map((product: any) => ({
      ...product,
      process_id: processId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from('consolidated_products')
      .insert(consolidatedProducts)
      .select();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Erro ao consolidar produtos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/import/dashboard/metrics - Métricas para o dashboard
router.get('/dashboard/metrics', async (req, res) => {
  try {
    const { data: processes, error } = await supabase
      .from('import_processes')
      .select('*, tax_calculations(*)')
      .eq('status', 'active');

    if (error) throw error;

    const metrics = {
      activeProcesses: processes.length,
      processesPerStage: processes.reduce((acc: any, p: any) => {
        acc[p.stage] = (acc[p.stage] || 0) + 1;
        return acc;
      }, {}),
      delayedProcesses: 0, // Implementar lógica de atraso
      totalImportValue: processes.reduce((sum: number, p: any) => sum + (p.fob_value_usd || 0), 0),
      totalTaxes: processes.reduce((sum: number, p: any) => 
        sum + (p.tax_calculations?.[0]?.total_taxes || 0), 0
      ),
      averageProcessTime: 15 // Mock - implementar cálculo real
    };

    res.json(metrics);
  } catch (error) {
    console.error('Erro ao buscar métricas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;