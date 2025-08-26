import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase com Service Role Key
const supabaseUrl = 'https://yhvtsbkotszxqndkhhhx.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlodnRzYmtvdHN6eHFuZGtoaGh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTkyMjI4NywiZXhwIjoyMDY1NDk4Mjg3fQ.Th-2FJSbwJPZmDrF9qWYGxmigIUvymNP_TCQMIuQ_Ac';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Lista de buckets para criar
const BUCKETS_TO_CREATE = [
  { name: 'plataforma-documents', public: false },
  { name: 'database-documents', public: false },
  { name: 'sistema-documents', public: false },
  { name: 'produtos-documents', public: false },
  { name: 'estoques-documents', public: false },
  { name: 'loja-documents', public: false },
  { name: 'identidade-documents', public: false },
];

async function createBuckets() {
  console.log('🚀 Iniciando criação de buckets no Supabase Storage...\n');
  
  // Primeiro, listar buckets existentes
  console.log('📋 Listando buckets existentes...');
  const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
  
  if (listError) {
    console.error('❌ Erro ao listar buckets:', listError);
    return;
  }
  
  console.log('✅ Buckets existentes:', existingBuckets?.map(b => b.name) || []);
  console.log('\n');
  
  // Criar cada bucket se não existir
  for (const bucket of BUCKETS_TO_CREATE) {
    const exists = existingBuckets?.some(b => b.name === bucket.name);
    
    if (exists) {
      console.log(`⏭️  Bucket "${bucket.name}" já existe`);
    } else {
      console.log(`📦 Criando bucket "${bucket.name}"...`);
      
      const { data, error } = await supabase.storage.createBucket(bucket.name, {
        public: bucket.public,
        allowedMimeTypes: undefined, // Permitir todos os tipos
        fileSizeLimit: 52428800, // 50MB
      });
      
      if (error) {
        console.error(`❌ Erro ao criar bucket "${bucket.name}":`, error.message);
      } else {
        console.log(`✅ Bucket "${bucket.name}" criado com sucesso!`);
        
        // Criar um arquivo .keep para garantir que o bucket existe
        const keepFile = new Blob([''], { type: 'text/plain' });
        const { error: uploadError } = await supabase.storage
          .from(bucket.name)
          .upload('.keep', keepFile, {
            contentType: 'text/plain',
            upsert: true,
          });
          
        if (uploadError) {
          console.log(`⚠️  Não foi possível criar .keep no bucket:`, uploadError.message);
        } else {
          console.log(`📄 Arquivo .keep criado no bucket`);
        }
      }
    }
    console.log('');
  }
  
  // Listar buckets finais
  console.log('\n📊 Verificando buckets finais...');
  const { data: finalBuckets, error: finalError } = await supabase.storage.listBuckets();
  
  if (finalError) {
    console.error('❌ Erro ao listar buckets finais:', finalError);
  } else {
    console.log('✅ Total de buckets:', finalBuckets?.length || 0);
    console.log('📦 Buckets disponíveis:', finalBuckets?.map(b => b.name) || []);
  }
  
  console.log('\n✨ Processo concluído!');
}

// Executar
createBuckets().catch(console.error);