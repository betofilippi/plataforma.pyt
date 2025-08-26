/**
 * PDF Service - API para conversão de PDF para thumbnail
 * 
 * Converte a primeira página de PDFs em imagens JPG para preview
 */

import express from 'express';
import fetch from 'node-fetch';
import { createWriteStream, createReadStream, existsSync, mkdirSync, unlinkSync, readdirSync } from 'fs';
import { join, extname } from 'path';
import { promisify } from 'util';
import { pipeline as streamPipeline } from 'stream';
import crypto from 'crypto';
import pdf2pic from 'pdf2pic';

const router = express.Router();
const pipeline = promisify(streamPipeline);

// Diretório para cache de thumbnails
const THUMBNAIL_CACHE_DIR = join(process.cwd(), 'storage', 'pdf-thumbnails');

// Criar diretório de cache se não existir
if (!existsSync(THUMBNAIL_CACHE_DIR)) {
  mkdirSync(THUMBNAIL_CACHE_DIR, { recursive: true });
}

/**
 * Gerar hash único para URL do PDF
 */
function generateCacheKey(pdfUrl: string): string {
  return crypto.createHash('md5').update(pdfUrl).digest('hex');
}

/**
 * Baixar PDF da URL
 */
async function downloadPDF(url: string, filepath: string): Promise<void> {
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Erro ao baixar PDF: ${response.statusText}`);
  }
  
  if (!response.body) {
    throw new Error('Corpo da resposta vazio');
  }
  
  await pipeline(response.body, createWriteStream(filepath));
}

/**
 * Converter primeira página do PDF para JPG
 */
async function convertPDFToThumbnail(pdfPath: string, outputPath: string): Promise<string> {
  try {
    // Configurar pdf2pic para converter apenas primeira página
    const convert = pdf2pic.fromPath(pdfPath, {
      density: 150,           // DPI da imagem
      saveFilename: "thumbnail",
      savePath: THUMBNAIL_CACHE_DIR,
      format: "jpeg",
      width: 200,             // Largura da thumbnail
      height: 280,            // Altura da thumbnail  
      page: 1                 // Apenas primeira página
    });

    const result = await convert(1, { responseType: "image" });
    
    if (result.length > 0) {
      return result[0].path;
    } else {
      throw new Error('Erro na conversão do PDF');
    }
  } catch (error) {
    console.error('Erro ao converter PDF:', error);
    throw new Error('Falha na conversão do PDF para imagem');
  }
}

/**
 * POST /api/pdf/thumbnail
 * Gerar thumbnail de PDF
 */
router.post('/thumbnail', async (req, res) => {
  try {
    const { pdfUrl } = req.body;

    if (!pdfUrl) {
      return res.status(400).json({ error: 'URL do PDF é obrigatória' });
    }

    // Validar se é URL válida
    try {
      new URL(pdfUrl);
    } catch {
      return res.status(400).json({ error: 'URL inválida' });
    }

    // Gerar chave de cache
    const cacheKey = generateCacheKey(pdfUrl);
    const thumbnailPath = join(THUMBNAIL_CACHE_DIR, `${cacheKey}.jpg`);

    // Verificar se thumbnail já existe no cache
    if (existsSync(thumbnailPath)) {
      console.log('📸 [PDF] Thumbnail encontrada no cache:', cacheKey);
      return res.json({ 
        success: true, 
        thumbnailUrl: `/api/pdf/thumbnail/${cacheKey}.jpg`,
        cached: true 
      });
    }

    // Baixar PDF temporariamente
    const tempPdfPath = join(THUMBNAIL_CACHE_DIR, `temp_${cacheKey}.pdf`);
    
    console.log('⬇️ [PDF] Baixando PDF:', pdfUrl);
    await downloadPDF(pdfUrl, tempPdfPath);

    console.log('🔄 [PDF] Convertendo primeira página para thumbnail...');
    const resultPath = await convertPDFToThumbnail(tempPdfPath, thumbnailPath);

    // Limpar arquivo PDF temporário
    unlinkSync(tempPdfPath);

    console.log('✅ [PDF] Thumbnail gerada:', cacheKey);
    
    res.json({ 
      success: true, 
      thumbnailUrl: `/api/pdf/thumbnail/${cacheKey}.jpg`,
      cached: false 
    });

  } catch (error) {
    console.error('❌ [PDF] Erro ao gerar thumbnail:', error);
    
    res.status(500).json({ 
      error: 'Erro interno ao processar PDF',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/pdf/thumbnail/:filename
 * Servir thumbnail gerada
 */
router.get('/thumbnail/:filename', (req, res) => {
  const { filename } = req.params;
  
  // Validar nome do arquivo
  if (!filename.endsWith('.jpg') || filename.includes('..')) {
    return res.status(400).json({ error: 'Nome de arquivo inválido' });
  }
  
  const filepath = join(THUMBNAIL_CACHE_DIR, filename);
  
  if (!existsSync(filepath)) {
    return res.status(404).json({ error: 'Thumbnail não encontrada' });
  }
  
  // Definir headers apropriados
  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache por 1 dia
  
  // Servir arquivo
  const stream = createReadStream(filepath);
  stream.pipe(res);
});

/**
 * DELETE /api/pdf/cache
 * Limpar cache de thumbnails (para desenvolvimento)
 */
router.delete('/cache', (req, res) => {
  try {
    const files = readdirSync(THUMBNAIL_CACHE_DIR);
    
    let deletedCount = 0;
    files.forEach((file: string) => {
      if (file.endsWith('.jpg') || file.endsWith('.pdf')) {
        unlinkSync(join(THUMBNAIL_CACHE_DIR, file));
        deletedCount++;
      }
    });
    
    console.log(`🗑️ [PDF] Cache limpo: ${deletedCount} arquivos removidos`);
    
    res.json({ 
      success: true, 
      message: `${deletedCount} arquivos removidos do cache` 
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao limpar cache' });
  }
});

export default router;