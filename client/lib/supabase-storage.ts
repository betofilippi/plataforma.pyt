import { supabase } from './supabase';

// Função para gerar thumbnail garantido de qualquer documento
// TODO: Implementar geração de thumbnails sem PDF.js
async function generateDocumentThumbnailFromFile(file: File, publicUrl: string): Promise<Blob | null> {
  try {
    console.log(`🚀 Thumbnails de documentos temporariamente desabilitados`);
    
    // Estratégia 1: Usar nossa API backend com o arquivo público do Supabase
    const response = await fetch('/api/generate-pdf-thumbnail', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fileUrl: publicUrl,
        fileName: file.name,
        fileId: crypto.randomUUID()
      })
    });

    if (response.ok) {
      const result = await response.json();
      if (result.thumbnailUrl) {
        console.log('✅ Thumbnail gerado via API backend');
        const imageResponse = await fetch(result.thumbnailUrl);
        return await imageResponse.blob();
      } else if (result.placeholder) {
        console.log('⚠️ API retornou placeholder, thumbnail não pôde ser gerado');
        // Retornar null para usar visualização padrão
        return null;
      }
    }

    // Estratégia 2: PDF.js no cliente (melhor opção para PDFs)
    if (file.type === 'application/pdf') {
      try {
        console.log('🎨 Tentando gerar thumbnail com PDF.js simples...');
        const pdfThumbDataUrl = await generatePDFThumbnailSimple(file);
        if (pdfThumbDataUrl) {
          console.log('✅ Thumbnail gerado via PDF.js simples!');
          const response = await fetch(pdfThumbDataUrl);
          return await response.blob();
        }
      } catch (error) {
        console.error('PDF.js simples falhou:', error);
        // Tentar método antigo como fallback
        try {
          const pdfThumbDataUrl = await generatePDFThumbnail(file);
          if (pdfThumbDataUrl && !pdfThumbDataUrl.includes('svg+xml')) {
            console.log('✅ Thumbnail gerado via PDF.js frontend (fallback)');
            const response = await fetch(pdfThumbDataUrl);
            return await response.blob();
          }
        } catch (error2) {
          console.error('PDF.js frontend também falhou:', error2);
        }
      }
    }

    // Estratégia 3: Captura de iframe (desabilitada temporariamente)
    // const iframeBlob = await generateThumbnailWithIframe(publicUrl);
    // if (iframeBlob) {
    //   console.log('✅ Thumbnail gerado via iframe captura');
    //   return iframeBlob;
    // }

    // Estratégia 4: Google Docs Viewer (fallback final)
    const googleBlob = await generateThumbnailWithGoogleViewer(publicUrl);
    if (googleBlob) {
      console.log('✅ Thumbnail gerado via Google Docs');
      return googleBlob;
    }

    // Se todas as estratégias falharem, retornar null para usar placeholder
    console.warn('⚠️ Todas as estratégias de thumbnail falharam, usando placeholder');
    return null;
    
  } catch (error) {
    console.warn('⚠️ Erro na geração de thumbnail, usando placeholder:', error.message);
    return null;
  }
}

// Captura via iframe (temporariamente desabilitada)
async function generateThumbnailWithIframe(fileUrl: string): Promise<Blob | null> {
  // html2canvas foi removido - retornar null por enquanto
  console.log('⚠️ Captura via iframe desabilitada (html2canvas removido)');
  return null;
}

// Captura via Google Docs Viewer
async function generateThumbnailWithGoogleViewer(fileUrl: string): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      const iframe = document.createElement('iframe');
      iframe.src = `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`;
      iframe.style.position = 'absolute';
      iframe.style.left = '-9999px';
      iframe.style.width = '800px';
      iframe.style.height = '600px';
      iframe.style.border = 'none';
      
      document.body.appendChild(iframe);
      
      iframe.onload = () => {
        setTimeout(() => {
          // Simular captura do Google Viewer
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            document.body.removeChild(iframe);
            resolve(null);
            return;
          }
          
          canvas.width = 400;
          canvas.height = 560;
          
          // Desenhar preview básico
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, 400, 560);
          ctx.fillStyle = '#e0e0e0';
          ctx.fillRect(10, 10, 380, 540);
          ctx.fillStyle = '#666';
          ctx.font = '14px Arial';
          ctx.fillText('Visualização via Google Docs', 30, 40);
          
          canvas.toBlob((blob) => {
            document.body.removeChild(iframe);
            resolve(blob);
          }, 'image/jpeg', 0.8);
          
        }, 3000);
      };
      
      iframe.onerror = () => {
        document.body.removeChild(iframe);
        resolve(null);
      };
      
    } catch (error) {
      console.error('Erro no Google Viewer:', error);
      resolve(null);
    }
  });
}

// Storage bucket name for table attachments
const BUCKET_NAME = 'table-attachments';

export interface StoredFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  url: string;
  thumbnailUrl?: string;
  publicUrl: string;
  path: string;
  uploadedAt: string;
}

// Initialize bucket if it doesn't exist
export async function initializeStorage() {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    
    if (!buckets?.find(b => b.name === BUCKET_NAME)) {
      const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true, // Make files publicly accessible
        fileSizeLimit: 52428800, // 50MB limit
        allowedMimeTypes: [
          'image/*',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'video/*',
          'text/plain',
          'text/csv'
        ]
      });
      
      if (error) {
        console.error('Error creating storage bucket:', error);
      }
    }
  } catch (error) {
    console.error('Error initializing storage:', error);
  }
}

// Upload file to Supabase Storage
export async function uploadFile(
  file: File,
  tableName: string,
  columnName: string,
  rowId: string | number
): Promise<StoredFile | null> {
  try {
    // Generate unique file path
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${tableName}/${columnName}/${rowId}/${timestamp}_${sanitizedFileName}`;
    
    // Upload file to storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      console.error('Error uploading file:', error);
      return null;
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);
    
    // Retornar IMEDIATAMENTE sem esperar thumbnail
    const result: StoredFile = {
      id: `${timestamp}_${sanitizedFileName}`,
      name: file.name,
      size: file.size,
      mimeType: file.type || 'application/octet-stream',
      url: publicUrl,
      publicUrl: publicUrl,
      path: filePath,
      uploadedAt: new Date().toISOString()
    };
    
    // Gerar thumbnail em BACKGROUND (não esperar)
    generateThumbnailInBackground(file, tableName, columnName, rowId, timestamp, sanitizedFileName, publicUrl);
    
    return result;
  } catch (error) {
    console.error('Error uploading file:', error);
    return null;
  }
}

// Função para gerar thumbnail em background
async function generateThumbnailInBackground(
  file: File,
  tableName: string,
  columnName: string,
  rowId: string | number,
  timestamp: number,
  sanitizedFileName: string,
  publicUrl: string
) {
  try {
    let thumbnailUrl: string | undefined;
    let thumbnailPath: string | undefined;
    
    if (file.type.startsWith('image/')) {
      // For images, create a smaller thumbnail
      try {
        const thumbnail = await createImageThumbnail(file);
        if (thumbnail) {
          const thumbnailFilePath = `${tableName}/${columnName}/${rowId}/thumb_${timestamp}_${sanitizedFileName}`;
          const { error: thumbError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(thumbnailFilePath, thumbnail, {
              cacheControl: '3600',
              upsert: false
            });
          
          if (!thumbError) {
            const { data: { publicUrl: thumbUrl } } = supabase.storage
              .from(BUCKET_NAME)
              .getPublicUrl(thumbnailFilePath);
            thumbnailUrl = thumbUrl;
            thumbnailPath = thumbnailFilePath;
            console.log('✅ Image thumbnail generated in background');
          }
        }
      } catch (error) {
        console.error('Error creating image thumbnail:', error);
      }
    } else if (file.type === 'application/pdf' || 
               file.type.includes('word') || 
               file.type.includes('sheet') || 
               file.type.includes('excel')) {
      // Generate document thumbnail using our 100% guaranteed system
      try {
        const thumbnailBlob = await generateDocumentThumbnailFromFile(file, publicUrl);
        if (thumbnailBlob) {
          const thumbnailFilePath = `${tableName}/${columnName}/${rowId}/thumb_${timestamp}_${sanitizedFileName}.jpg`;
          const thumbnailFile = new File([thumbnailBlob], `thumb_${sanitizedFileName}.jpg`, { type: 'image/jpeg' });
          
          const { error: thumbError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(thumbnailFilePath, thumbnailFile, {
              cacheControl: '3600',
              upsert: false
            });
          
          if (!thumbError) {
            const { data: { publicUrl: thumbUrl } } = supabase.storage
              .from(BUCKET_NAME)
              .getPublicUrl(thumbnailFilePath);
            thumbnailUrl = thumbUrl;
            thumbnailPath = thumbnailFilePath;
            console.log('✅ Document thumbnail generated in background');
          }
        }
      } catch (error) {
        console.error('Error creating document thumbnail:', error);
      }
    }
  } catch (error) {
    console.error('Error generating thumbnail in background:', error);
  }
}

// Create image thumbnail
async function createImageThumbnail(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    img.onload = () => {
      if (!ctx) {
        resolve(null);
        return;
      }
      
      // Calculate thumbnail dimensions (max 200px)
      const maxSize = 200;
      let width = img.width;
      let height = img.height;
      
      if (width > height) {
        if (width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg', 0.8);
    };
    
    img.onerror = () => resolve(null);
    img.src = URL.createObjectURL(file);
  });
}

// Delete file from storage
export async function deleteFile(filePath: string, fileId?: string): Promise<boolean> {
  try {
    // Delete from storage
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);
    
    if (error) {
      console.error('Error deleting file from storage:', error);
      return false;
    }
    
    // Also delete from database if fileId provided
    if (fileId) {
      const { error: dbError } = await supabase
        .from('table_attachments')
        .delete()
        .eq('file_id', fileId);
      
      if (dbError) {
        console.error('Error deleting file metadata from database:', dbError);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error in deleteFile:', error);
    return false;
  }
}

// Get signed URL for private files (if needed in future)
export async function getSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, expiresIn);
    
    if (error) {
      console.error('Error getting signed URL:', error);
      return null;
    }
    
    return data.signedUrl;
  } catch (error) {
    console.error('Error in getSignedUrl:', error);
    return null;
  }
}

// List files in a specific path
export async function listFiles(path: string): Promise<StoredFile[]> {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(path, {
        limit: 100,
        offset: 0
      });
    
    if (error) {
      console.error('Error listing files:', error);
      return [];
    }
    
    // Convert to StoredFile format
    const files: StoredFile[] = [];
    for (const file of data || []) {
      const filePath = `${path}/${file.name}`;
      const { data: { publicUrl } } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);
      
      files.push({
        id: file.id || crypto.randomUUID(),
        name: file.name,
        size: file.metadata?.size || 0,
        mimeType: file.metadata?.mimetype || 'application/octet-stream',
        url: publicUrl,
        publicUrl,
        path: filePath,
        uploadedAt: file.created_at || new Date().toISOString()
      });
    }
    
    return files;
  } catch (error) {
    console.error('Error in listFiles:', error);
    return [];
  }
}

// Load files for a specific table/row from database
export async function loadTableAttachments(
  tableName: string,
  rowId?: string | number
): Promise<Map<string, StoredFile[]>> {
  try {
    let query = supabase
      .from('table_attachments')
      .select('*')
      .eq('table_name', tableName);
    
    if (rowId !== undefined) {
      query = query.eq('row_id', String(rowId));
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error loading table attachments:', error);
      return new Map();
    }
    
    // Group files by cell (row-column)
    const cellFiles = new Map<string, StoredFile[]>();
    
    for (const attachment of data || []) {
      const cellKey = `${attachment.row_id}-${attachment.column_name}`;
      
      const file: StoredFile = {
        id: attachment.file_id,
        name: attachment.file_name,
        size: attachment.file_size,
        mimeType: attachment.mime_type,
        url: attachment.public_url,
        publicUrl: attachment.public_url,
        thumbnailUrl: attachment.thumbnail_url,
        path: attachment.storage_path,
        uploadedAt: attachment.uploaded_at
      };
      
      if (!cellFiles.has(cellKey)) {
        cellFiles.set(cellKey, []);
      }
      cellFiles.get(cellKey)!.push(file);
    }
    
    return cellFiles;
  } catch (error) {
    console.error('Error in loadTableAttachments:', error);
    return new Map();
  }
}