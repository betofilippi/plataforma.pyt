/**
 * Captura completa do erro de login
 */

import { test } from '@playwright/test';

test('CAPTURAR ERRO DE LOGIN COMPLETO', async ({ page }) => {
  // Captura TODOS os console logs
  const logs: string[] = [];
  page.on('console', msg => {
    const text = `[${msg.type()}] ${msg.text()}`;
    logs.push(text);
    console.log(text);
  });

  // Captura TODOS os erros de página
  page.on('pageerror', error => {
    const text = `[PAGE ERROR] ${error.message}`;
    logs.push(text);
    console.error(text);
  });

  // Captura TODAS as requisições
  const requests: any[] = [];
  page.on('request', request => {
    const req = {
      url: request.url(),
      method: request.method(),
      headers: request.headers(),
      postData: request.postData()
    };
    requests.push(req);
    console.log(`\n>>> REQUEST: ${req.method} ${req.url}`);
    if (req.postData) {
      console.log('    BODY:', req.postData);
    }
  });

  // Captura TODAS as respostas
  const responses: any[] = [];
  page.on('response', async response => {
    try {
      const body = await response.text();
      const resp = {
        url: response.url(),
        status: response.status(),
        statusText: response.statusText(),
        body: body
      };
      responses.push(resp);
      console.log(`\n<<< RESPONSE: ${resp.status} ${resp.statusText} - ${resp.url}`);
      if (body && resp.url.includes('/api')) {
        console.log('    BODY:', body.substring(0, 500));
      }
    } catch (e) {
      console.log(`<<< RESPONSE ERROR: ${response.url()} - ${e}`);
    }
  });

  console.log('\n========================================');
  console.log('NAVEGANDO PARA LOGIN');
  console.log('========================================\n');
  
  // Navega para login
  await page.goto('http://localhost:3333/login', { 
    waitUntil: 'networkidle',
    timeout: 30000 
  });

  // Aguarda um pouco para carregar
  await page.waitForTimeout(3000);

  // Tira screenshot
  await page.screenshot({ 
    path: 'test-results/login-page-before.png', 
    fullPage: true 
  });

  console.log('\n========================================');
  console.log('CLICANDO NO BOTÃO "FAZER LOGIN" PARA ABRIR O MODAL');
  console.log('========================================\n');

  // Primeiro precisa clicar no botão "Fazer Login" para abrir o modal
  try {
    // Procura o botão que contém o texto "Fazer Login"
    await page.click('button:has-text("Fazer Login")');
    console.log('✓ Botão "Fazer Login" clicado - modal deve abrir');
    
    // Aguarda o modal aparecer
    await page.waitForTimeout(1000);
    
    console.log('\n========================================');
    console.log('PREENCHENDO FORMULÁRIO NO MODAL');
    console.log('========================================\n');
    
    // Agora preenche os campos dentro do modal
    await page.fill('input[type="email"]', 'admin@plataforma.app');
    console.log('✓ Email preenchido');
    
    await page.fill('input[type="password"]', 'admin123');
    console.log('✓ Senha preenchida');
    
    // Aguarda um momento
    await page.waitForTimeout(1000);
    
    console.log('\n========================================');
    console.log('CLICANDO NO BOTÃO DE SUBMIT DO FORMULÁRIO');
    console.log('========================================\n');
    
    // Clica no botão de submit dentro do modal
    await page.click('button[type="submit"]');
    console.log('✓ Botão de submit clicado');
    
  } catch (e) {
    console.error('\n!!! ERRO AO PREENCHER FORMULÁRIO:', e);
    console.log('\n=== CONTEÚDO DA PÁGINA ===');
    const content = await page.content();
    console.log(content.substring(0, 2000));
  }

  // Aguarda resposta ou erro
  await page.waitForTimeout(5000);

  // Tira screenshot final
  await page.screenshot({ 
    path: 'test-results/login-page-after.png', 
    fullPage: true 
  });

  console.log('\n========================================');
  console.log('RESULTADO FINAL');
  console.log('========================================\n');
  
  // URL final
  console.log('URL FINAL:', page.url());
  
  // Procura por mensagens de erro
  const errorElement = await page.$('.error, [role="alert"], .text-red-500, .alert-error');
  if (errorElement) {
    const errorText = await errorElement.textContent();
    console.log('\n!!! MENSAGEM DE ERRO ENCONTRADA:', errorText);
  }

  // Imprime todos os logs coletados
  console.log('\n========================================');
  console.log('TODOS OS LOGS DO CONSOLE');
  console.log('========================================\n');
  logs.forEach(log => console.log(log));

  // Imprime requisições para /api
  console.log('\n========================================');
  console.log('REQUISIÇÕES PARA /api');
  console.log('========================================\n');
  requests.filter(r => r.url.includes('/api')).forEach(req => {
    console.log(`${req.method} ${req.url}`);
    if (req.postData) {
      console.log('  Body:', req.postData);
    }
  });

  // Imprime respostas de /api
  console.log('\n========================================');
  console.log('RESPOSTAS DE /api');
  console.log('========================================\n');
  responses.filter(r => r.url.includes('/api')).forEach(resp => {
    console.log(`${resp.status} ${resp.url}`);
    if (resp.body) {
      console.log('  Body:', resp.body.substring(0, 500));
    }
  });
});