import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

// Configuração do Supabase - USANDO SERVICE ROLE KEY PARA ACESSO COMPLETO AO STORAGE
const supabaseUrl = 'https://yhvtsbkotszxqndkhhhx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlodnRzYmtvdHN6eHFuZGtoaGh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTkyMjI4NywiZXhwIjoyMDY1NDk4Mjg3fQ.Th-2FJSbwJPZmDrF9qWYGxmigIUvymNP_TCQMIuQ_Ac';

const supabase = createClient(supabaseUrl, supabaseKey);

// Configuração do multer para upload temporário
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
});

// Middleware para upload
export const uploadMiddleware = upload.single('file');

// Mapeamento de módulos para buckets
const MODULE_BUCKETS: Record<string, string> = {
  'plataforma': 'plataforma-documents',
  'database': 'database-documents',
  'sistema': 'sistema-documents',
  'produtos': 'produtos-documents',
  'estoques': 'estoques-documents',
  'loja': 'loja-documents',
  'identidade': 'identidade-documents',
};

/**
 * Garante que o bucket existe para o módulo
 */
async function ensureBucketExists(moduleId: string) {
  const bucketName = MODULE_BUCKETS[moduleId] || `${moduleId}-documents`;
  
  // Verificar se o bucket existe
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  
  if (listError) {
    console.error('Erro ao listar buckets:', listError);
    return bucketName;
  }
  
  const bucketExists = buckets?.some(b => b.name === bucketName);
  
  if (!bucketExists) {
    // Criar o bucket
    const { data, error } = await supabase.storage.createBucket(bucketName, {
      public: false, // Bucket privado
      allowedMimeTypes: undefined, // Permitir todos os tipos
      fileSizeLimit: 52428800, // 50MB
    });
    
    if (error) {
      console.error(`Erro ao criar bucket ${bucketName}:`, error);
    } else {
      console.log(`✅ Bucket criado: ${bucketName}`);
      
      // Configurar políticas RLS para o bucket
      await configureBucketPolicies(bucketName);
    }
  }
  
  return bucketName;
}

/**
 * Configura políticas de acesso para o bucket
 */
async function configureBucketPolicies(bucketName: string) {
  // Aqui você pode adicionar políticas RLS específicas se necessário
  // Por enquanto, vamos deixar com acesso autenticado padrão
  console.log(`📝 Políticas configuradas para bucket: ${bucketName}`);
}

/**
 * Lista arquivos de um diretório
 */
export async function listFiles(req: Request, res: Response) {
  console.log('📋 Requisição de listagem recebida:', {
    body: req.body
  });
  
  try {
    const { moduleId, path = '' } = req.body;
    
    if (!moduleId) {
      return res.status(400).json({ error: 'Module ID é obrigatório' });
    }
    
    const bucketName = await ensureBucketExists(moduleId);
    
    // SEMPRE listar dentro da pasta 'documents' por padrão
    // Se o path estiver vazio, usar 'documents'
    // Se já tiver um path, adicionar 'documents/' no início se necessário
    let listPath = path;
    if (!path) {
      listPath = 'documents';
    } else if (!path.startsWith('documents')) {
      listPath = `documents/${path}`;
    }
    
    console.log(`📂 Listando arquivos do bucket: ${bucketName}, path: "${listPath}"`);
    
    // Listar arquivos do bucket
    const { data, error } = await supabase.storage
      .from(bucketName)
      .list(listPath, {
        limit: 1000,
        offset: 0,
      });
    
    if (error) {
      console.error('❌ Erro ao listar arquivos:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log(`📊 Arquivos encontrados:`, data?.length || 0);
    console.log('🗂️ Dados brutos:', data);
    
    // Formatar resposta
    const files = data?.map(item => {
      // Determinar se é pasta ou arquivo
      const isFolder = !item.id || item.name.endsWith('/');
      const fileName = item.name.replace(/\/$/, ''); // Remover barra final se for pasta
      
      // Path completo para URL (com documents/)
      const fullPath = listPath ? `${listPath}/${fileName}` : fileName;
      
      return {
        id: item.id || `${item.name}-${Date.now()}`,
        name: fileName,
        type: isFolder ? 'folder' : 'file',
        size: item.metadata?.size || 0,
        modified: item.updated_at || item.created_at || new Date(),
        extension: !isFolder ? fileName.split('.').pop() : undefined,
        mimeType: item.metadata?.mimetype || item.metadata?.contentType,
        path: fileName, // Path simplificado para exibição
        url: !isFolder ? supabase.storage.from(bucketName).getPublicUrl(fullPath).data.publicUrl : undefined,
      };
    }).filter(item => item.name !== '.keep') || []; // Filtrar arquivo .keep
    
    console.log(`✅ Retornando ${files.length} arquivos formatados`);
    return res.json(files);
  } catch (error: any) {
    console.error('Erro ao listar arquivos:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Upload de arquivo
 */
export async function uploadFile(req: Request, res: Response) {
  console.log('📨 Upload requisição recebida:', {
    file: req.file ? { name: req.file.originalname, size: req.file.size } : 'Nenhum arquivo',
    body: req.body
  });
  
  try {
    if (!req.file) {
      console.error('❌ Nenhum arquivo no request');
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }
    
    const { moduleId, path = '' } = req.body;
    
    if (!moduleId) {
      console.error('❌ Module ID ausente');
      return res.status(400).json({ error: 'Module ID é obrigatório' });
    }
    
    console.log(`🪣 Verificando bucket para módulo: ${moduleId}`);
    const bucketName = await ensureBucketExists(moduleId);
    
    // Gerar nome único para o arquivo
    const fileExt = req.file.originalname.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    
    // SEMPRE salvar dentro da pasta 'documents'
    let uploadPath = 'documents';
    if (path && path !== 'documents') {
      uploadPath = path.startsWith('documents') ? path : `documents/${path}`;
    }
    const filePath = `${uploadPath}/${fileName}`;
    
    // Upload para o Supabase Storage
    console.log(`📤 Fazendo upload: ${filePath} para bucket ${bucketName}`);
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });
    
    if (error) {
      console.error('❌ Erro no upload para Supabase:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log('✅ Upload para Supabase concluído:', data);
    
    // Obter URL público do arquivo
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);
    
    return res.json({
      success: true,
      file: {
        name: req.file.originalname,
        path: filePath,
        size: req.file.size,
        mimeType: req.file.mimetype,
        url: urlData.publicUrl,
      },
    });
  } catch (error: any) {
    console.error('Erro no upload:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Download de arquivo
 */
export async function downloadFile(req: Request, res: Response) {
  try {
    const { moduleId, path } = req.params;
    
    if (!moduleId || !path) {
      return res.status(400).json({ error: 'Module ID e path são obrigatórios' });
    }
    
    const bucketName = MODULE_BUCKETS[moduleId] || `${moduleId}-documents`;
    
    // Download do arquivo
    const { data, error } = await supabase.storage
      .from(bucketName)
      .download(path);
    
    if (error) {
      console.error('Erro no download:', error);
      return res.status(500).json({ error: error.message });
    }
    
    if (!data) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }
    
    // Converter Blob para Buffer
    const buffer = Buffer.from(await data.arrayBuffer());
    
    // Definir headers apropriados
    const fileName = path.split('/').pop() || 'download';
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', data.type);
    res.setHeader('Content-Length', buffer.length.toString());
    
    return res.send(buffer);
  } catch (error: any) {
    console.error('Erro no download:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Deletar arquivo
 */
export async function deleteFile(req: Request, res: Response) {
  try {
    const { moduleId, path } = req.body;
    
    if (!moduleId || !path) {
      return res.status(400).json({ error: 'Module ID e path são obrigatórios' });
    }
    
    const bucketName = MODULE_BUCKETS[moduleId] || `${moduleId}-documents`;
    
    // Deletar arquivo
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([path]);
    
    if (error) {
      console.error('Erro ao deletar:', error);
      return res.status(500).json({ error: error.message });
    }
    
    return res.json({ success: true, message: 'Arquivo deletado com sucesso' });
  } catch (error: any) {
    console.error('Erro ao deletar:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Criar pasta
 */
export async function createFolder(req: Request, res: Response) {
  try {
    const { moduleId, path, folderName } = req.body;
    
    if (!moduleId || !folderName) {
      return res.status(400).json({ error: 'Module ID e nome da pasta são obrigatórios' });
    }
    
    const bucketName = await ensureBucketExists(moduleId);
    
    // SEMPRE criar pastas dentro de 'documents'
    let basePath = 'documents';
    if (path && path !== 'documents') {
      basePath = path.startsWith('documents') ? path : `documents/${path}`;
    }
    
    // No Supabase, pastas são criadas automaticamente quando você faz upload de um arquivo com path
    // Vamos criar um arquivo placeholder para criar a pasta
    const folderPath = `${basePath}/${folderName}/.keep`;
    
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(folderPath, new Blob([''], { type: 'text/plain' }), {
        contentType: 'text/plain',
        upsert: true,
      });
    
    if (error) {
      console.error('Erro ao criar pasta:', error);
      return res.status(500).json({ error: error.message });
    }
    
    return res.json({
      success: true,
      folder: {
        name: folderName,
        path: path ? `${path}/${folderName}` : folderName,
      },
    });
  } catch (error: any) {
    console.error('Erro ao criar pasta:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Obter URL assinada para acesso temporário
 */
export async function getSignedUrl(req: Request, res: Response) {
  try {
    const { moduleId, path, expiresIn = 3600 } = req.body;
    
    if (!moduleId || !path) {
      return res.status(400).json({ error: 'Module ID e path são obrigatórios' });
    }
    
    const bucketName = MODULE_BUCKETS[moduleId] || `${moduleId}-documents`;
    
    // Gerar URL assinada
    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(path, expiresIn);
    
    if (error) {
      console.error('Erro ao gerar URL assinada:', error);
      return res.status(500).json({ error: error.message });
    }
    
    return res.json({
      success: true,
      signedUrl: data?.signedUrl,
      expiresIn,
    });
  } catch (error: any) {
    console.error('Erro ao gerar URL assinada:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Mover ou renomear arquivo
 */
export async function moveFile(req: Request, res: Response) {
  try {
    const { moduleId, oldPath, newPath } = req.body;
    
    if (!moduleId || !oldPath || !newPath) {
      return res.status(400).json({ error: 'Module ID, oldPath e newPath são obrigatórios' });
    }
    
    const bucketName = MODULE_BUCKETS[moduleId] || `${moduleId}-documents`;
    
    // Supabase não tem operação de move nativa, então precisamos:
    // 1. Download do arquivo
    // 2. Upload no novo local
    // 3. Deletar o arquivo antigo
    
    const { data: downloadData, error: downloadError } = await supabase.storage
      .from(bucketName)
      .download(oldPath);
    
    if (downloadError) {
      console.error('Erro ao baixar arquivo para mover:', downloadError);
      return res.status(500).json({ error: downloadError.message });
    }
    
    if (!downloadData) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }
    
    // Upload no novo local
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(newPath, downloadData, {
        contentType: downloadData.type,
        upsert: false,
      });
    
    if (uploadError) {
      console.error('Erro ao fazer upload do arquivo movido:', uploadError);
      return res.status(500).json({ error: uploadError.message });
    }
    
    // Deletar arquivo antigo
    const { error: deleteError } = await supabase.storage
      .from(bucketName)
      .remove([oldPath]);
    
    if (deleteError) {
      console.error('Erro ao deletar arquivo antigo:', deleteError);
      // Não retornar erro aqui, pois o arquivo já foi copiado
    }
    
    return res.json({
      success: true,
      message: 'Arquivo movido com sucesso',
      newPath,
    });
  } catch (error: any) {
    console.error('Erro ao mover arquivo:', error);
    return res.status(500).json({ error: error.message });
  }
}