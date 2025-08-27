import React from 'react';

console.log('🎨 [APP-MINIMAL] App component loading...');

const AppMinimal = () => {
  console.log('🎨 [APP-MINIMAL] App component rendering...');
  
  return (
    <div style={{ padding: '20px', background: '#f0f0f0', color: '#333' }}>
      <h1>Minimal App Test</h1>
      <p>If you can see this, React is mounting correctly!</p>
    </div>
  );
};

console.log('✅ [APP-MINIMAL] App component created and ready to export');

export default AppMinimal;