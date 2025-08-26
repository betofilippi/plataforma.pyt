import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase com Service Role Key
const supabaseUrl = 'https://yhvtsbkotszxqndkhhhx.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlodnRzYmtvdHN6eHFuZGtoaGh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTkyMjI4NywiZXhwIjoyMDY1NDk4Mjg3fQ.Th-2FJSbwJPZmDrF9qWYGxmigIUvymNP_TCQMIuQ_Ac';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixStorageStructure() {
  console.log('🔧 Corrigindo estrutura de arquivos no Storage...\n');
  
  const buckets = [
    'plataforma-documents',
    'database-documents',
    'sistema-documents'
  ];
  
  for (const bucketName of buckets) {
    console.log(`📦 Processando bucket: ${bucketName}`);
    console.log('─'.repeat(40));
    
    // Listar arquivos na raiz
    const { data: rootFiles, error: listError } = await supabase.storage
      .from(bucketName)
      .list('', { limit: 1000 });
    
    if (listError) {
      console.error(`❌ Erro ao listar arquivos:`, listError.message);
      continue;
    }
    
    console.log(`📊 Arquivos encontrados na raiz: ${rootFiles?.length || 0}`);
    
    // Filtrar apenas arquivos (não pastas)
    const filesToMove = rootFiles?.filter(f => f.id && !f.name.startsWith('documents/')) || [];
    
    if (filesToMove.length === 0) {
      console.log('✅ Nenhum arquivo para mover');
    } else {
      console.log(`📦 ${filesToMove.length} arquivos serão movidos para /documents`);
      
      for (const file of filesToMove) {
        if (file.name === '.keep') continue; // Pular arquivo .keep
        
        console.log(`  📄 Movendo: ${file.name}`);
        
        // Download do arquivo
        const { data: fileData, error: downloadError } = await supabase.storage
          .from(bucketName)
          .download(file.name);
        
        if (downloadError) {
          console.error(`    ❌ Erro no download:`, downloadError.message);
          continue;
        }
        
        // Upload para documents/
        const newPath = `documents/${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(newPath, fileData, {
            contentType: file.metadata?.mimetype || 'application/octet-stream',
            upsert: false
          });
        
        if (uploadError) {
          console.error(`    ❌ Erro no upload:`, uploadError.message);
          continue;
        }
        
        // Deletar arquivo da raiz
        const { error: deleteError } = await supabase.storage
          .from(bucketName)
          .remove([file.name]);
        
        if (deleteError) {
          console.error(`    ⚠️ Erro ao deletar original:`, deleteError.message);
        } else {
          console.log(`    ✅ Movido com sucesso para ${newPath}`);
        }
      }
    }
    
    // Verificar estrutura final
    console.log('\n📂 Estrutura final:');
    
    // Listar raiz novamente
    const { data: finalRoot } = await supabase.storage
      .from(bucketName)
      .list('', { limit: 10 });
    
    console.log(`  Raiz: ${finalRoot?.length || 0} itens`);
    finalRoot?.forEach(item => {
      console.log(`    - ${item.name} ${item.id ? '(arquivo)' : '(pasta)'}`);
    });
    
    // Listar documents/
    const { data: docsFiles } = await supabase.storage
      .from(bucketName)
      .list('documents', { limit: 10 });
    
    console.log(`  /documents: ${docsFiles?.length || 0} arquivos`);
    docsFiles?.forEach(item => {
      console.log(`    - ${item.name}`);
    });
    
    console.log('\n');
  }
  
  console.log('✨ Estrutura corrigida!');
}

// Executar
fixStorageStructure().catch(console.error);