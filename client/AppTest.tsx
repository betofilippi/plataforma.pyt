import React from 'react';

const AppTest = () => {
  console.log('🎨 [APP-TEST] AppTest carregando...');
  
  return (
    <div style={{ 
      padding: '40px',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#1f2937',
      color: 'white',
      minHeight: '100vh'
    }}>
      <h1 style={{ color: '#10b981' }}>✅ REACT FUNCIONANDO!</h1>
      <div style={{ 
        background: 'rgba(255, 255, 255, 0.1)', 
        padding: '20px', 
        borderRadius: '10px',
        margin: '20px 0' 
      }}>
        <h2>🎯 Diagnóstico Sucesso</h2>
        <p>Se você está vendo isso, significa que:</p>
        <ul>
          <li>✅ React está funcionando</li>
          <li>✅ TypeScript compilando</li>
          <li>✅ Vite servindo corretamente</li>
          <li>❓ O problema está no App.tsx complexo</li>
        </ul>
        <p><strong>Timestamp:</strong> {new Date().toLocaleString()}</p>
      </div>
      
      <div style={{ 
        background: 'rgba(59, 130, 246, 0.1)', 
        padding: '20px', 
        borderRadius: '10px',
        margin: '20px 0' 
      }}>
        <h3>📋 Próximos Passos:</h3>
        <ol>
          <li>Se isso funciona, o problema está nas dependências do App.tsx</li>
          <li>Verificar moduleRegistry, AuthProvider, ou outros componentes complexos</li>
          <li>Isolar cada import do App.tsx um por um</li>
        </ol>
      </div>
    </div>
  );
};

console.log('✅ [APP-TEST] AppTest definido e pronto');

export default AppTest;