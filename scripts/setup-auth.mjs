import { Pool } from 'pg';

const pool = new Pool({
  connectionString: 'postgresql://postgres:Bdebola2025@@db.yhvtsbkotszxqndkhhhx.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function setup() {
  try {
    console.log('🔗 Connecting to database...');
    
    // Enable UUID extension
    console.log('📦 Enabling UUID extension...');
    await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    console.log('✅ UUID extension enabled');
    
    // Create plataforma_core schema
    console.log('📋 Creating plataforma_core schema...');
    await pool.query('CREATE SCHEMA IF NOT EXISTS plataforma_core');
    console.log('✅ Schema created');
    
    // Create users table
    console.log('👤 Creating users table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS plataforma_core.users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255),
        avatar_url TEXT,
        role VARCHAR(50) DEFAULT 'user',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_login TIMESTAMP WITH TIME ZONE,
        metadata JSONB DEFAULT '{}'
      )
    `);
    console.log('✅ Users table created');
    
    // Create refresh tokens table
    console.log('🔑 Creating refresh_tokens table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS plataforma_core.refresh_tokens (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES plataforma_core.users(id) ON DELETE CASCADE,
        token_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        revoked_at TIMESTAMP WITH TIME ZONE,
        is_active BOOLEAN DEFAULT true,
        device_info JSONB DEFAULT '{}',
        ip_address INET,
        user_agent TEXT
      )
    `);
    console.log('✅ Refresh tokens table created');
    
    // Create login attempts table
    console.log('📋 Creating login_attempts table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS plataforma_core.login_attempts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) NOT NULL,
        ip_address INET NOT NULL,
        success BOOLEAN NOT NULL DEFAULT false,
        attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        user_agent TEXT,
        failure_reason VARCHAR(100),
        metadata JSONB DEFAULT '{}'
      )
    `);
    console.log('✅ Login attempts table created');
    
    // Create password reset tokens table
    console.log('🔐 Creating password_reset_tokens table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS plataforma_core.password_reset_tokens (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES plataforma_core.users(id) ON DELETE CASCADE,
        token_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        used_at TIMESTAMP WITH TIME ZONE,
        is_used BOOLEAN DEFAULT false
      )
    `);
    console.log('✅ Password reset tokens table created');
    
    // Create indexes
    console.log('🔍 Creating indexes...');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_users_email ON plataforma_core.users(email)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON plataforma_core.refresh_tokens(user_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON plataforma_core.refresh_tokens(token_hash)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON plataforma_core.login_attempts(email)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON plataforma_core.login_attempts(ip_address)');
    console.log('✅ Indexes created');
    
    // Create functions
    console.log('⚙️ Creating utility functions...');
    
    // Rate limiting function
    await pool.query(`
      CREATE OR REPLACE FUNCTION plataforma_core.check_login_attempts(
        p_email VARCHAR(255),
        p_ip_address INET,
        p_time_window_minutes INTEGER DEFAULT 15,
        p_max_attempts INTEGER DEFAULT 5
      ) RETURNS BOOLEAN AS $func$
      DECLARE
        attempt_count INTEGER;
      BEGIN
        SELECT COUNT(*)
        INTO attempt_count
        FROM plataforma_core.login_attempts
        WHERE (email = p_email OR ip_address = p_ip_address)
          AND success = false
          AND attempted_at > NOW() - INTERVAL '1 minute' * p_time_window_minutes;
          
        RETURN attempt_count < p_max_attempts;
      END;
      $func$ LANGUAGE plpgsql;
    `);
    
    // Record login attempt function
    await pool.query(`
      CREATE OR REPLACE FUNCTION plataforma_core.record_login_attempt(
        p_email VARCHAR(255),
        p_ip_address INET,
        p_success BOOLEAN,
        p_user_agent TEXT DEFAULT NULL,
        p_failure_reason VARCHAR(100) DEFAULT NULL
      ) RETURNS VOID AS $func$
      BEGIN
        INSERT INTO plataforma_core.login_attempts (
          email,
          ip_address,
          success,
          user_agent,
          failure_reason
        ) VALUES (
          p_email,
          p_ip_address,
          p_success,
          p_user_agent,
          p_failure_reason
        );
      END;
      $func$ LANGUAGE plpgsql;
    `);
    
    console.log('✅ Functions created');
    
    // Create admin user if not exists
    console.log('👑 Creating admin user...');
    const adminCheck = await pool.query('SELECT id FROM plataforma_core.users WHERE email = $1', ['admin@plataforma.app']);
    
    if (adminCheck.rows.length === 0) {
      await pool.query(`
        INSERT INTO plataforma_core.users (email, name, role, is_active)
        VALUES ($1, $2, $3, $4)
      `, ['admin@plataforma.app', 'Administrador', 'admin', true]);
      console.log('✅ Admin user created');
    } else {
      console.log('ℹ️  Admin user already exists');
    }
    
    // Test the setup
    const userCount = await pool.query('SELECT COUNT(*) FROM plataforma_core.users');
    const tableCount = await pool.query(`
      SELECT COUNT(*) 
      FROM information_schema.tables 
      WHERE table_schema = 'plataforma_core'
    `);
    
    console.log(`\\n🎉 Setup complete!`);
    console.log(`📊 Created ${tableCount.rows[0].count} tables`);
    console.log(`👥 Found ${userCount.rows[0].count} users in database`);
    console.log(`\\n📝 Next steps:`);
    console.log(`1. Copy .env.example to .env and set JWT secrets`);
    console.log(`2. Start the server: npm run dev`);
    console.log(`3. Visit http://localhost:5173/login`);
    console.log(`4. Use admin@plataforma.app with any password for first login`);
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setup();