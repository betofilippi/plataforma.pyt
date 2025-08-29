import { test, expect } from '@playwright/test';

test('Admin login and sistema debug test', async ({ page }) => {
  // Capturar logs do console
  const consoleMessages: string[] = [];
  page.on('console', (msg) => {
    if (msg.text().includes('SistemaModule DEBUG')) {
      consoleMessages.push(msg.text());
      console.log('🔍 CONSOLE LOG CAPTURADO:', msg.text());
    }
  });

  // Ir para a página de login
  await page.goto('http://localhost:3333');
  
  // Fazer login como admin
  await page.click('button:has-text("Fazer Login")');
  
  // Preencher credenciais admin
  await page.fill('input[type="email"]', 'admin@plataforma.app');
  await page.fill('input[type="password"]', 'admin123');
  
  // Clicar em entrar
  await page.click('button:has-text("Entrar com Email")');
  
  // Aguardar redirecionamento para dashboard
  await page.waitForURL('**/platform');
  
  // Clicar em CONFIGURAÇÕES
  await page.click('text=CONFIGURAÇÕES');
  
  // Aguardar página de sistema carregar
  await page.waitForURL('**/sistema**');
  
  // Aguardar logs aparecerem (componente carregar)
  await page.waitForTimeout(2000);
  
  // Verificar se há logs de debug
  console.log('📊 TODOS OS LOGS CAPTURADOS:', consoleMessages);
  
  // Verificar se o ícone admin existe na página
  const adminIcon = await page.locator('text=ADMIN PANEL').count();
  console.log('🔍 ADMIN PANEL ICON COUNT:', adminIcon);
  
  // Tirar screenshot para debug visual
  await page.screenshot({ path: 'debug-sistema-page.png', fullPage: true });
  
  console.log('✅ Teste concluído. Verifique os logs acima para debug.');
});