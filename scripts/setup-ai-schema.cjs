const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function setupAISchema() {
  const pool = new Pool({
    connectionString: 'postgresql://postgres:Bdebola2025@@db.yhvtsbkotszxqndkhhhx.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🚀 Setting up AI database schema...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, '..', 'database', 'ai-schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL
    await pool.query(sql);
    
    console.log('✅ AI schema setup completed successfully!');
    console.log('📊 Created tables:');
    console.log('   - ai_executions');
    console.log('   - ai_templates');
    console.log('   - ai_workflows');
    console.log('   - ai_batch_operations');
    console.log('   - ai_cost_tracking');
    console.log('   - ai_rate_limits');
    console.log('   - ai_cache');
    console.log('   - ai_user_preferences');
    
    // Test the setup by counting templates
    const result = await pool.query('SELECT COUNT(*) FROM plataforma_core.ai_templates');
    console.log(`📝 Default templates created: ${result.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error setting up AI schema:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setupAISchema();