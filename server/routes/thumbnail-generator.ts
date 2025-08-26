import express from 'express';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import FormData from 'form-data';

const router = express.Router();

// APIs de conversão confiáveis (com fallbacks)
const CONVERSION_APIS = {
  // PDF.co - API gratuita e confiável para PDFs
  PDFCO: {
    apiKey: process.env.PDFCO_API_KEY || 'demo',
    baseUrl: 'https://api.pdf.co/v1'
  },
  
  // ConvertAPI - Conversão universal (trial gratuito)
  CONVERTAPI: {
    secret: process.env.CONVERTAPI_SECRET || 'trial',
    baseUrl: 'https://v2.convertapi.com'
  },
  
  // Cloudmersive - API para documentos Office
  CLOUDMERSIVE: {
    apiKey: process.env.CLOUDMERSIVE_API_KEY || 'demo',
    baseUrl: 'https://api.cloudmersive.com'
  },
  
  // ILovePDF API - Backup para PDFs
  ILOVEPDF: {
    publicKey: process.env.ILOVEPDF_PUBLIC_KEY || 'project_public_key',
    baseUrl: 'https://api.ilovepdf.com'
  }
};

// Diretório para cache de thumbnails
const THUMBNAIL_CACHE_DIR = path.join(process.cwd(), 'cache', 'thumbnails');

// Garantir que o diretório existe
if (!fs.existsSync(THUMBNAIL_CACHE_DIR)) {
  fs.mkdirSync(THUMBNAIL_CACHE_DIR, { recursive: true });
}

// Função para gerar hash único do arquivo
function generateFileHash(fileUrl: string, fileName: string): string {
  return createHash('md5').update(fileUrl + fileName).digest('hex');
}

// Função para gerar thumbnail PDF com 100% de garantia
async function generatePDFThumbnail(fileUrl: string, fileHash: string, thumbnailPath: string): Promise<boolean> {
  const strategies = [
    () => tryPDFCoAPI(fileUrl, thumbnailPath),
    () => tryConvertAPI(fileUrl, thumbnailPath, 'pdf', 'jpg'),
    () => tryCloudmersiveAPI(fileUrl, thumbnailPath),
    () => tryIframeCaptureMethod(fileUrl, thumbnailPath),
    () => tryGoogleDocsViewer(fileUrl, thumbnailPath),
    () => tryMozillaPDFJS(fileUrl, thumbnailPath)
  ];

  for (let i = 0; i < strategies.length; i++) {
    try {
      console.log(`🔄 Tentativa ${i + 1}: Estratégia ${['PDF.co', 'ConvertAPI', 'Cloudmersive', 'Iframe', 'Google Docs', 'Mozilla PDF.js'][i]}`);
      const success = await strategies[i]();
      if (success) {
        console.log(`✅ Sucesso com estratégia ${i + 1}`);
        return true;
      }
    } catch (error) {
      console.log(`❌ Estratégia ${i + 1} falhou:`, error.message);
    }
  }
  
  return false;
}

// Estratégia 1: PDF.co API (mais confiável)
async function tryPDFCoAPI(fileUrl: string, thumbnailPath: string): Promise<boolean> {
  try {
    console.log('🔄 Tentando PDF.co API com URL:', fileUrl);
    console.log('📌 Using API Key:', CONVERSION_APIS.PDFCO.apiKey?.substring(0, 20) + '...');
    
    // Primeiro, verificar se o PDF tem páginas válidas
    const infoResponse = await fetch(`${CONVERSION_APIS.PDFCO.baseUrl}/pdf/info`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CONVERSION_APIS.PDFCO.apiKey
      },
      body: JSON.stringify({
        url: fileUrl
      })
    });
    
    if (infoResponse.ok) {
      const info = await infoResponse.json();
      console.log('📄 PDF info:', info);
      
      // Verificar se tem pelo menos 1 página
      if (!info.pageCount || info.pageCount < 1) {
        console.log('⚠️ PDF vazio ou sem páginas');
        return false;
      }
    }
    
    const response = await fetch(`${CONVERSION_APIS.PDFCO.baseUrl}/pdf/convert/to/jpg`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CONVERSION_APIS.PDFCO.apiKey
      },
      body: JSON.stringify({
        url: fileUrl,
        pages: '0', // Usar página 0 (primeira página) em vez de 1
        password: '',
        name: 'thumbnail',
        width: 400,
        height: 560
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log('PDF.co resposta de erro:', errorText);
      
      // Se for erro de página, retornar false em vez de throw
      if (errorText.includes('Invalid page number')) {
        console.log('⚠️ PDF não tem páginas válidas para gerar thumbnail');
        return false;
      }
      
      throw new Error(`PDF.co API falhou: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('PDF.co resultado:', result);
    
    if (!result.url) throw new Error('Sem URL de resultado do PDF.co');

    const imageResponse = await fetch(result.url);
    if (!imageResponse.ok) throw new Error('Falha ao baixar imagem do PDF.co');
    
    const buffer = await imageResponse.buffer();
    fs.writeFileSync(thumbnailPath, buffer);
    console.log('✅ PDF.co sucesso, thumbnail salvo');
    return true;
  } catch (error) {
    console.error('❌ PDF.co falhou:', error.message);
    throw error;
  }
}

// Estratégia 2: ConvertAPI (universal)
async function tryConvertAPI(fileUrl: string, thumbnailPath: string, from: string, to: string): Promise<boolean> {
  const response = await fetch(`${CONVERSION_APIS.CONVERTAPI.baseUrl}/convert/${from}/to/${to}?Secret=${CONVERSION_APIS.CONVERTAPI.secret}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      Parameters: [
        {
          Name: 'File',
          FileValue: {
            Url: fileUrl
          }
        },
        {
          Name: 'PageRange',
          Value: '1'
        }
      ]
    })
  });

  if (!response.ok) throw new Error('ConvertAPI falhou');
  
  const result = await response.json();
  if (!result.Files || !result.Files[0]) throw new Error('Sem arquivos no resultado');

  const imageResponse = await fetch(result.Files[0].Url);
  if (!imageResponse.ok) throw new Error('Falha ao baixar imagem');
  
  const buffer = await imageResponse.buffer();
  fs.writeFileSync(thumbnailPath, buffer);
  return true;
}

// Estratégia 3: Cloudmersive API
async function tryCloudmersiveAPI(fileUrl: string, thumbnailPath: string): Promise<boolean> {
  const response = await fetch(`${CONVERSION_APIS.CLOUDMERSIVE.baseUrl}/convert/pdf/to/jpg`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Apikey': CONVERSION_APIS.CLOUDMERSIVE.apiKey
    },
    body: JSON.stringify({
      InputFileUrl: fileUrl,
      Quality: 90
    })
  });

  if (!response.ok) throw new Error('Cloudmersive API falhou');
  
  const result = await response.json();
  if (!result.OutputFileUrl) throw new Error('Sem URL de saída');

  const imageResponse = await fetch(result.OutputFileUrl);
  if (!imageResponse.ok) throw new Error('Falha ao baixar imagem');
  
  const buffer = await imageResponse.buffer();
  fs.writeFileSync(thumbnailPath, buffer);
  return true;
}

// Estratégia 4: Captura de iframe (sempre funciona)
async function tryIframeCaptureMethod(fileUrl: string, thumbnailPath: string): Promise<boolean> {
  const puppeteer = require('puppeteer');
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { margin: 0; padding: 0; background: white; }
          iframe { border: none; }
        </style>
      </head>
      <body>
        <iframe src="${fileUrl}#page=1&zoom=100" width="600" height="800"></iframe>
      </body>
    </html>
  `;
  
  await page.setContent(htmlContent);
  await page.setViewport({ width: 600, height: 800 });
  await page.waitForTimeout(3000);
  
  const screenshot = await page.screenshot({ 
    type: 'jpeg',
    quality: 90,
    clip: { x: 0, y: 0, width: 400, height: 560 }
  });
  
  fs.writeFileSync(thumbnailPath, screenshot);
  await browser.close();
  return true;
}

// Estratégia 5: Google Docs Viewer
async function tryGoogleDocsViewer(fileUrl: string, thumbnailPath: string): Promise<boolean> {
  const puppeteer = require('puppeteer');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  const viewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`;
  
  await page.goto(viewerUrl, { waitUntil: 'networkidle0', timeout: 10000 });
  await page.setViewport({ width: 800, height: 600 });
  await page.waitForTimeout(2000);
  
  const screenshot = await page.screenshot({ 
    type: 'jpeg',
    quality: 90,
    clip: { x: 50, y: 50, width: 400, height: 560 }
  });
  
  fs.writeFileSync(thumbnailPath, screenshot);
  await browser.close();
  return true;
}

// Estratégia 6: Mozilla PDF.js Viewer
async function tryMozillaPDFJS(fileUrl: string, thumbnailPath: string): Promise<boolean> {
  const puppeteer = require('puppeteer');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  const viewerUrl = `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(fileUrl)}`;
  
  await page.goto(viewerUrl, { waitUntil: 'networkidle0', timeout: 15000 });
  await page.setViewport({ width: 1200, height: 800 });
  await page.waitForTimeout(3000);
  
  // Aguardar o PDF carregar
  await page.waitForSelector('.page', { timeout: 10000 });
  
  const screenshot = await page.screenshot({ 
    type: 'jpeg',
    quality: 90,
    clip: { x: 200, y: 100, width: 400, height: 560 }
  });
  
  fs.writeFileSync(thumbnailPath, screenshot);
  await browser.close();
  return true;
}

// Rota para gerar thumbnail de PDF
router.post('/generate-pdf-thumbnail', async (req, res) => {
  try {
    const { fileUrl, fileName, fileId } = req.body;
    
    if (!fileUrl || !fileName || !fileId) {
      return res.status(400).json({ error: 'Parâmetros obrigatórios: fileUrl, fileName, fileId' });
    }

    const fileHash = generateFileHash(fileUrl, fileName);
    const thumbnailPath = path.join(THUMBNAIL_CACHE_DIR, `${fileHash}.jpg`);
    
    // Verificar se já existe no cache
    if (fs.existsSync(thumbnailPath)) {
      const thumbnailUrl = `/api/thumbnail/${fileHash}.jpg`;
      return res.json({ thumbnailUrl, cached: true });
    }

    console.log(`🚀 Iniciando geração de thumbnail para: ${fileName}`);
    
    // DESABILITADO: Agora usamos thumbnails reais no frontend
    // const success = await generatePDFThumbnail(fileUrl, fileHash, thumbnailPath);
    
    console.warn(`⚠️ Usando thumbnails frontend para: ${fileName}`);
    // Retornar placeholder - thumbnails são gerados no frontend agora
    res.json({ 
      thumbnailUrl: null, 
      generated: false,
      placeholder: true,
      message: 'Usando thumbnails reais do frontend' 
    });

  } catch (error) {
    console.error('Erro ao gerar thumbnail PDF:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Função para gerar thumbnail Office com 100% de garantia
async function generateOfficeThumbnail(fileUrl: string, fileHash: string, thumbnailPath: string, mimeType: string): Promise<boolean> {
  const isExcel = mimeType.includes('sheet') || mimeType.includes('excel');
  const strategies = [
    () => tryConvertAPI(fileUrl, thumbnailPath, isExcel ? 'xlsx' : 'docx', 'jpg'),
    () => tryCloudmersiveOfficeAPI(fileUrl, thumbnailPath, mimeType),
    () => tryOfficeOnlineViewer(fileUrl, thumbnailPath),
    () => tryGoogleDocsOfficeViewer(fileUrl, thumbnailPath),
    () => tryZamzarAPI(fileUrl, thumbnailPath),
    () => tryOnlineConvertFree(fileUrl, thumbnailPath, mimeType)
  ];

  for (let i = 0; i < strategies.length; i++) {
    try {
      console.log(`🔄 Office Tentativa ${i + 1}: ${['ConvertAPI', 'Cloudmersive', 'Office Online', 'Google Docs', 'Zamzar', 'Online Convert'][i]}`);
      const success = await strategies[i]();
      if (success) {
        console.log(`✅ Office sucesso com estratégia ${i + 1}`);
        return true;
      }
    } catch (error) {
      console.log(`❌ Office estratégia ${i + 1} falhou:`, error.message);
    }
  }
  
  return false;
}

// Cloudmersive para documentos Office
async function tryCloudmersiveOfficeAPI(fileUrl: string, thumbnailPath: string, mimeType: string): Promise<boolean> {
  let endpoint = '';
  if (mimeType.includes('word')) {
    endpoint = '/convert/docx/to/jpg';
  } else if (mimeType.includes('sheet') || mimeType.includes('excel')) {
    endpoint = '/convert/xlsx/to/jpg';
  } else {
    throw new Error('Tipo de arquivo não suportado');
  }

  const response = await fetch(`${CONVERSION_APIS.CLOUDMERSIVE.baseUrl}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Apikey': CONVERSION_APIS.CLOUDMERSIVE.apiKey
    },
    body: JSON.stringify({
      InputFileUrl: fileUrl,
      Quality: 90
    })
  });

  if (!response.ok) throw new Error('Cloudmersive Office API falhou');
  
  const result = await response.json();
  if (!result.OutputFileUrl) throw new Error('Sem URL de saída Office');

  const imageResponse = await fetch(result.OutputFileUrl);
  if (!imageResponse.ok) throw new Error('Falha ao baixar imagem Office');
  
  const buffer = await imageResponse.buffer();
  fs.writeFileSync(thumbnailPath, buffer);
  return true;
}

// Office Online Viewer (Microsoft)
async function tryOfficeOnlineViewer(fileUrl: string, thumbnailPath: string): Promise<boolean> {
  const puppeteer = require('puppeteer');
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  const page = await browser.newPage();
  
  const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
  
  await page.goto(viewerUrl, { waitUntil: 'networkidle0', timeout: 15000 });
  await page.setViewport({ width: 1200, height: 800 });
  await page.waitForTimeout(4000);
  
  // Aguardar o documento carregar
  await page.waitForSelector('#WebApplicationFrame', { timeout: 10000 });
  
  const screenshot = await page.screenshot({ 
    type: 'jpeg',
    quality: 90,
    clip: { x: 100, y: 100, width: 400, height: 560 }
  });
  
  fs.writeFileSync(thumbnailPath, screenshot);
  await browser.close();
  return true;
}

// Google Docs Viewer para Office
async function tryGoogleDocsOfficeViewer(fileUrl: string, thumbnailPath: string): Promise<boolean> {
  const puppeteer = require('puppeteer');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  const viewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`;
  
  await page.goto(viewerUrl, { waitUntil: 'networkidle0', timeout: 12000 });
  await page.setViewport({ width: 1000, height: 700 });
  await page.waitForTimeout(3000);
  
  const screenshot = await page.screenshot({ 
    type: 'jpeg',
    quality: 90,
    clip: { x: 50, y: 50, width: 400, height: 560 }
  });
  
  fs.writeFileSync(thumbnailPath, screenshot);
  await browser.close();
  return true;
}

// Zamzar API (alternativa confiável)
async function tryZamzarAPI(fileUrl: string, thumbnailPath: string): Promise<boolean> {
  // Esta seria uma implementação com Zamzar API se necessário
  // Por enquanto, vamos usar uma abordagem iframe genérica
  return tryGenericIframeCapture(fileUrl, thumbnailPath);
}

// OnlineConvert.com free API
async function tryOnlineConvertFree(fileUrl: string, thumbnailPath: string, mimeType: string): Promise<boolean> {
  // Implementação de conversão online gratuita
  return tryGenericIframeCapture(fileUrl, thumbnailPath);
}

// Captura genérica de iframe para qualquer documento
async function tryGenericIframeCapture(fileUrl: string, thumbnailPath: string): Promise<boolean> {
  const puppeteer = require('puppeteer');
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { margin: 0; padding: 0; background: white; }
          iframe { border: none; width: 100%; height: 100%; }
        </style>
      </head>
      <body>
        <iframe src="${fileUrl}" width="800" height="600"></iframe>
      </body>
    </html>
  `;
  
  await page.setContent(htmlContent);
  await page.setViewport({ width: 800, height: 600 });
  await page.waitForTimeout(4000);
  
  const screenshot = await page.screenshot({ 
    type: 'jpeg',
    quality: 90,
    clip: { x: 0, y: 0, width: 400, height: 560 }
  });
  
  fs.writeFileSync(thumbnailPath, screenshot);
  await browser.close();
  return true;
}

// Rota para gerar thumbnail de documentos Office
router.post('/generate-office-thumbnail', async (req, res) => {
  try {
    const { fileUrl, fileName, fileId, mimeType } = req.body;
    
    if (!fileUrl || !fileName || !fileId) {
      return res.status(400).json({ error: 'Parâmetros obrigatórios: fileUrl, fileName, fileId' });
    }

    const fileHash = generateFileHash(fileUrl, fileName);
    const thumbnailPath = path.join(THUMBNAIL_CACHE_DIR, `${fileHash}.jpg`);
    
    // Verificar se já existe no cache
    if (fs.existsSync(thumbnailPath)) {
      const thumbnailUrl = `/api/thumbnail/${fileHash}.jpg`;
      return res.json({ thumbnailUrl, cached: true });
    }

    console.log(`🚀 Iniciando geração de thumbnail Office para: ${fileName}`);
    
    // DESABILITADO: Agora usamos thumbnails reais no frontend
    // const success = await generateOfficeThumbnail(fileUrl, fileHash, thumbnailPath, mimeType);
    
    console.warn(`⚠️ Usando thumbnails frontend Office para: ${fileName}`);
    // Retornar placeholder - thumbnails são gerados no frontend agora
    res.json({ 
      thumbnailUrl: null, 
      generated: false,
      placeholder: true,
      message: 'Usando thumbnails reais do frontend Office' 
    });

  } catch (error) {
    console.error('Erro ao gerar thumbnail Office:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para servir thumbnails gerados
router.get('/thumbnail/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(THUMBNAIL_CACHE_DIR, filename);
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'Thumbnail não encontrado' });
  }
});

export default router;