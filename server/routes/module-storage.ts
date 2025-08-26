import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://yhvtsbkotszxqndkhhhx.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlodnRzYmtvdHN6eHFuZGtoaGh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTkyMjI4NywiZXhwIjoyMDY1NDk4Mjg3fQ.Th-2FJSbwJPZmDrF9qWYGxmigIUvymNP_TCQMIuQ_Ac';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Configuração do multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
});

export const uploadMiddleware = upload.single('file');

// Lista de todos os módulos do sistema
const MODULES = [
  'ia',
  'database',
  'sistema',
  'estoque',
  'montagem',
  'vendas',
  'faturamento',
  'expedicao',
  'rh',
  'administrativo',
  'financeiro',
  'juridico',
  'tributario',
  'suporte',
  'comunicacao',
  'marketing',
  'produtos',
  'lojas',
  'cadastros',
  'notificacoes'
];

/**
 * Garante que o bucket existe para o módulo
 */
async function ensureBucketExists(moduleId: string): Promise<string> {
  const bucketName = `${moduleId}-documents`;
  
  try {
    // Verificar se o bucket existe
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === bucketName);
    
    if (!bucketExists) {
      // Criar o bucket se não existir
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: false,
        fileSizeLimit: 52428800, // 50MB
        allowedMimeTypes: undefined // Permite todos os tipos
      });
      
      if (createError && !createError.message.includes('already exists')) {
        console.error(`Erro ao criar bucket ${bucketName}:`, createError);
      } else {
        console.log(`✅ Bucket criado: ${bucketName}`);
      }
    }
  } catch (error) {
    console.error(`Erro ao verificar/criar bucket ${bucketName}:`, error);
  }
  
  return bucketName;
}

/**
 * Lista arquivos de um módulo
 */
export async function listModuleFiles(req: Request, res: Response) {
  const { moduleId } = req.params;
  let { path = '' } = req.body;
  
  // Remover barra inicial se houver
  if (path.startsWith('/')) {
    path = path.substring(1);
  }
  
  if (!MODULES.includes(moduleId)) {
    return res.status(400).json({
      success: false,
      error: 'Módulo inválido'
    });
  }
  
  try {
    const bucketName = await ensureBucketExists(moduleId);
    
    // Listar arquivos do bucket
    const { data: files, error } = await supabase.storage
      .from(bucketName)
      .list(path, {
        limit: 1000,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' }
      });
    
    if (error) {
      console.error('Erro ao listar arquivos:', error);
      return res.status(500).json({
        success: false,
        error: 'Falha ao listar arquivos'
      });
    }
    
    console.log(`📁 Listando arquivos do bucket ${bucketName}:`, files?.length || 0, 'arquivos encontrados');
    console.log('Raw files data:', JSON.stringify(files, null, 2));
    
    // Formatar arquivos para o frontend
    const formattedFiles = await Promise.all((files || []).map(async file => {
      // Detectar se é arquivo ou pasta
      // No Supabase Storage, arquivos têm 'id' não nulo
      // Pastas têm 'id' nulo e 'name' terminando em '/' ou sem extensão
      const isFile = file.id !== null && file.id !== undefined;
      
      console.log(`  - ${file.name}: tipo=${isFile ? 'arquivo' : 'pasta'}, id=${file.id}, metadata=${JSON.stringify(file.metadata)}, created_at=${file.created_at}, updated_at=${file.updated_at}`);
      
      // Gerar URL assinada para arquivos
      let fileUrl = undefined;
      if (isFile) {
        const filePath = path ? `${path}/${file.name}` : file.name;
        const { data: signedUrlData } = await supabase.storage
          .from(bucketName)
          .createSignedUrl(filePath, 3600); // URL válida por 1 hora
        
        fileUrl = signedUrlData?.signedUrl;
      }
      
      return {
        id: file.id || file.name || uuidv4(),
        name: file.name,
        type: isFile ? 'file' : 'folder',
        size: file.metadata?.size || 0,
        modified: file.updated_at || file.created_at || new Date().toISOString(),
        path: path ? `${path}/${file.name}` : file.name,
        mimeType: file.metadata?.mimetype,
        url: fileUrl
      };
    }));
    
    res.json({
      success: true,
      files: formattedFiles,
      path: path,
      moduleId: moduleId
    });
    
  } catch (error) {
    console.error('Erro ao listar arquivos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
}

/**
 * Upload de arquivo para um módulo
 */
export async function uploadModuleFile(req: Request, res: Response) {
  const { moduleId } = req.params;
  let { path = '' } = req.body;
  const file = req.file;
  
  // Remover barra inicial se houver
  if (path && path.startsWith('/')) {
    path = path.substring(1);
  }
  
  if (!MODULES.includes(moduleId)) {
    return res.status(400).json({
      success: false,
      error: 'Módulo inválido'
    });
  }
  
  if (!file) {
    return res.status(400).json({
      success: false,
      error: 'Nenhum arquivo enviado'
    });
  }
  
  try {
    const bucketName = await ensureBucketExists(moduleId);
    // Sanitizar o nome do arquivo - remover caracteres especiais
    const sanitizedName = file.originalname
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-zA-Z0-9.-]/g, '_'); // Substitui caracteres especiais por _
    
    const fileName = `${uuidv4()}-${sanitizedName}`;
    // Não adicionar '/documents' no caminho - usar apenas o path vazio ou fornecido
    const filePath = path ? `${path}/${fileName}` : fileName;
    
    console.log(`📤 Fazendo upload do arquivo:`, {
      bucketName,
      fileName,
      filePath,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size
    });
    
    // Upload para o Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      console.error('Erro no upload:', error);
      return res.status(500).json({
        success: false,
        error: 'Falha no upload do arquivo'
      });
    }
    
    console.log('✅ Upload concluído:', data);
    
    // Gerar URL pública
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);
    
    res.json({
      success: true,
      file: {
        id: uuidv4(),
        name: file.originalname,
        path: filePath,
        url: urlData.publicUrl,
        size: file.size,
        mimeType: file.mimetype,
        moduleId: moduleId
      }
    });
    
  } catch (error) {
    console.error('Erro no upload:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
}

/**
 * Download de arquivo de um módulo
 */
export async function downloadModuleFile(req: Request, res: Response) {
  const { moduleId, fileName } = req.params;
  
  if (!MODULES.includes(moduleId)) {
    return res.status(400).json({
      success: false,
      error: 'Módulo inválido'
    });
  }
  
  try {
    const bucketName = `${moduleId}-documents`;
    
    // Download do arquivo
    const { data, error } = await supabase.storage
      .from(bucketName)
      .download(fileName);
    
    if (error) {
      console.error('Erro no download:', error);
      return res.status(404).json({
        success: false,
        error: 'Arquivo não encontrado'
      });
    }
    
    // Converter blob para buffer
    const buffer = Buffer.from(await data.arrayBuffer());
    
    // Definir headers apropriados
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', data.type || 'application/octet-stream');
    res.send(buffer);
    
  } catch (error) {
    console.error('Erro no download:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
}

/**
 * Deletar arquivo de um módulo
 */
export async function deleteModuleFile(req: Request, res: Response) {
  const { moduleId, fileName } = req.params;
  
  if (!MODULES.includes(moduleId)) {
    return res.status(400).json({
      success: false,
      error: 'Módulo inválido'
    });
  }
  
  try {
    const bucketName = `${moduleId}-documents`;
    
    // Deletar arquivo
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([fileName]);
    
    if (error) {
      console.error('Erro ao deletar:', error);
      return res.status(500).json({
        success: false,
        error: 'Falha ao deletar arquivo'
      });
    }
    
    res.json({
      success: true,
      message: 'Arquivo deletado com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao deletar:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
}

/**
 * Criar pasta em um módulo
 */
export async function createModuleFolder(req: Request, res: Response) {
  const { moduleId } = req.params;
  const { folderName, path = '' } = req.body;
  
  if (!MODULES.includes(moduleId)) {
    return res.status(400).json({
      success: false,
      error: 'Módulo inválido'
    });
  }
  
  if (!folderName) {
    return res.status(400).json({
      success: false,
      error: 'Nome da pasta é obrigatório'
    });
  }
  
  try {
    const bucketName = await ensureBucketExists(moduleId);
    const folderPath = path ? `${path}/${folderName}/.keep` : `${folderName}/.keep`;
    
    // Criar um arquivo .keep para manter a pasta
    const { error } = await supabase.storage
      .from(bucketName)
      .upload(folderPath, new Blob([''], { type: 'text/plain' }), {
        cacheControl: '3600',
        upsert: false
      });
    
    if (error && !error.message.includes('already exists')) {
      console.error('Erro ao criar pasta:', error);
      return res.status(500).json({
        success: false,
        error: 'Falha ao criar pasta'
      });
    }
    
    res.json({
      success: true,
      folder: {
        name: folderName,
        path: path ? `${path}/${folderName}` : folderName,
        moduleId: moduleId
      }
    });
    
  } catch (error) {
    console.error('Erro ao criar pasta:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
}

/**
 * Inicializar buckets para todos os módulos
 */
export async function initializeAllBuckets() {
  console.log('🗂️ Inicializando buckets do Supabase Storage para todos os módulos...');
  
  for (const moduleId of MODULES) {
    await ensureBucketExists(moduleId);
  }
  
  console.log('✅ Todos os buckets foram verificados/criados');
}