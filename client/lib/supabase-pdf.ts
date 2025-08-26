/**
 * Cliente Supabase específico para uploads de PDF
 * Usa service_key para bypass de RLS policies
 */
import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase
const SUPABASE_URL = 'https://yhvtsbkotszxqndkhhhx.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlodnRzYmtvdHN6eHFuZGtoaGh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTkyMjI4NywiZXhwIjoyMDY1NDk4Mjg3fQ.Th-2FJSbwJPZmDrF9qWYGxmigIUvymNP_TCQMIuQ_Ac';

// Cliente Supabase com service_key para bypass de RLS
export const supabasePDF = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    headers: {
      'x-application': 'plataforma.app-pdf-upload',
    },
  },
});

/**
 * Interface para resultado do upload
 */
export interface PDFUploadResult {
  success: boolean;
  url?: string;
  fileName?: string;
  size?: number;
  error?: string;
}

/**
 * Upload de PDF para Supabase Storage com service_key
 */
export async function uploadPDF(
  file: File, 
  tableName: string = 'documents',
  columnName: string = 'pdf'
): Promise<PDFUploadResult> {
  
  console.log('🔧 Iniciando upload com service_key...');
  
  try {
    // Validar arquivo
    if (file.type !== 'application/pdf') {
      return {
        success: false,
        error: 'Arquivo deve ser PDF'
      };
    }

    // Validar tamanho (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        success: false,
        error: 'Arquivo muito grande. Máximo: 10MB'
      };
    }

    // Configurar bucket
    const bucketName = 'pdf-uploads';
    
    console.log('📦 Verificando bucket:', bucketName);
    
    // Verificar/criar bucket
    const { data: buckets } = await supabasePDF.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === bucketName);
    
    console.log('📋 Buckets existentes:', buckets?.map(b => b.name));
    
    if (!bucketExists) {
      console.log('📁 Criando bucket:', bucketName);
      
      const { error: createError } = await supabasePDF.storage.createBucket(bucketName, {
        public: true, // Público para download direto
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['application/pdf']
      });
      
      if (createError) {
        console.error('❌ Erro ao criar bucket:', createError);
        return {
          success: false,
          error: `Erro ao criar bucket: ${createError.message}`
        };
      }
      
      console.log('✅ Bucket criado com sucesso');
    }

    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${tableName}/${columnName}/${timestamp}_${randomSuffix}_${sanitizedName}`;

    console.log('📤 Fazendo upload:', fileName);

    // Upload do arquivo
    const { data: uploadData, error: uploadError } = await supabasePDF.storage
      .from(bucketName)
      .upload(fileName, file, {
        contentType: 'application/pdf',
        upsert: false
      });

    if (uploadError) {
      console.error('❌ Erro no upload:', uploadError);
      return {
        success: false,
        error: `Erro no upload: ${uploadError.message}`
      };
    }

    console.log('✅ Upload concluído:', uploadData);

    // Obter URL pública
    const { data: publicUrlData } = supabasePDF.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    if (!publicUrlData?.publicUrl) {
      console.error('❌ Erro ao gerar URL pública');
      return {
        success: false,
        error: 'Não foi possível gerar URL pública'
      };
    }

    const finalUrl = publicUrlData.publicUrl;
    console.log('🔗 URL pública:', finalUrl);

    return {
      success: true,
      url: finalUrl,
      fileName: sanitizedName,
      size: file.size
    };

  } catch (error) {
    console.error('❌ Erro inesperado no upload:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

/**
 * Verificar se arquivo PDF existe
 */
export async function checkPDFExists(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}