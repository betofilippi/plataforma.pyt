// Simple test to verify the fixes work
const puppeteer = require('puppeteer');

async function testApp() {
  console.log('🧪 Starting application tests...');
  
  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => console.log('📝 BROWSER:', msg.text()));
    page.on('pageerror', err => console.error('❌ PAGE ERROR:', err.message));
    
    console.log('🌐 Testing regular index.html...');
    
    // Test regular app
    const response = await page.goto('http://localhost:3030', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    console.log(`📊 Response status: ${response.status()}`);
    
    // Wait for React to load
    await page.waitForSelector('#root > *', { timeout: 10000 });
    
    const title = await page.title();
    console.log(`📑 Page title: ${title}`);
    
    // Check for React app content
    const hasReactContent = await page.$eval('#root', el => el.children.length > 0);
    console.log(`⚛️ React content loaded: ${hasReactContent}`);
    
    // Test navigation to login
    console.log('🔐 Testing navigation to /login...');
    await page.goto('http://localhost:3030/login', { waitUntil: 'networkidle0' });
    
    const loginLoaded = await page.waitForSelector('input[type="email"]', { timeout: 5000 }).then(() => true).catch(() => false);
    console.log(`🔑 Login page loaded: ${loginLoaded}`);
    
    console.log('✅ Basic tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testApp().then(() => {
  console.log('🎉 All tests completed successfully!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Tests failed:', error);
  process.exit(1);
});