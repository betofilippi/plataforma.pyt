-- Module Registry Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar TEXT,
  bio TEXT,
  website TEXT,
  github VARCHAR(100),
  twitter VARCHAR(100),
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'publisher', 'moderator', 'admin')),
  permissions JSONB DEFAULT '[]',
  packages_published INTEGER DEFAULT 0,
  total_downloads BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE
);

-- Packages table
CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,
  subcategory VARCHAR(50),
  author_id UUID REFERENCES users(id) ON DELETE CASCADE,
  homepage TEXT,
  repository TEXT,
  license VARCHAR(50) NOT NULL,
  keywords JSONB DEFAULT '[]',
  tags JSONB DEFAULT '[]',
  is_public BOOLEAN DEFAULT TRUE,
  is_deprecated BOOLEAN DEFAULT FALSE,
  deprecation_message TEXT,
  total_downloads BIGINT DEFAULT 0,
  weekly_downloads BIGINT DEFAULT 0,
  monthly_downloads BIGINT DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0.0,
  ratings_count INTEGER DEFAULT 0,
  security_score INTEGER DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Full text search
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', name), 'A') ||
    setweight(to_tsvector('english', display_name), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', array_to_string(keywords::text[], ' ')), 'C')
  ) STORED
);

-- Package versions table
CREATE TABLE package_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  package_id UUID REFERENCES packages(id) ON DELETE CASCADE,
  version VARCHAR(50) NOT NULL,
  tag VARCHAR(20) DEFAULT 'latest',
  description TEXT,
  changelog TEXT,
  tarball_url TEXT NOT NULL,
  tarball_size BIGINT NOT NULL,
  tarball_sha256 CHAR(64) NOT NULL,
  manifest JSONB NOT NULL,
  dependencies JSONB DEFAULT '{}',
  peer_dependencies JSONB DEFAULT '{}',
  dev_dependencies JSONB DEFAULT '{}',
  is_prerelease BOOLEAN DEFAULT FALSE,
  is_deprecated BOOLEAN DEFAULT FALSE,
  security_score INTEGER DEFAULT 100,
  downloads BIGINT DEFAULT 0,
  published_by UUID REFERENCES users(id) ON DELETE SET NULL,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  build_info JSONB,
  
  UNIQUE(package_id, version)
);

-- Security issues table
CREATE TABLE security_issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  package_id UUID REFERENCES packages(id) ON DELETE CASCADE,
  severity VARCHAR(10) CHECK (severity IN ('low', 'moderate', 'high', 'critical')),
  type VARCHAR(20) CHECK (type IN ('vulnerability', 'malware', 'typosquatting', 'deprecation')),
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  affected_versions JSONB NOT NULL,
  patched_versions JSONB DEFAULT '[]',
  cwe VARCHAR(20),
  cvss DECIMAL(3,1),
  references JSONB DEFAULT '[]',
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fixed_at TIMESTAMP WITH TIME ZONE
);

-- Package ratings and reviews
CREATE TABLE package_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  package_id UUID REFERENCES packages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  version VARCHAR(50),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  helpful INTEGER DEFAULT 0,
  reported BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(package_id, user_id)
);

-- Download tracking
CREATE TABLE package_downloads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  package_id UUID REFERENCES packages(id) ON DELETE CASCADE,
  version VARCHAR(50) NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ip INET NOT NULL,
  user_agent TEXT,
  referrer TEXT,
  country CHAR(2),
  downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Package categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(7),
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Package tags
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7),
  usage_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User API tokens
CREATE TABLE api_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  permissions JSONB DEFAULT '[]',
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhooks
CREATE TABLE webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  secret VARCHAR(255) NOT NULL,
  events JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  failures_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Registry statistics (materialized view)
CREATE MATERIALIZED VIEW registry_stats AS
SELECT
  (SELECT COUNT(*) FROM packages WHERE is_public = TRUE) as total_packages,
  (SELECT COUNT(*) FROM package_versions pv JOIN packages p ON pv.package_id = p.id WHERE p.is_public = TRUE) as total_versions,
  (SELECT COALESCE(SUM(total_downloads), 0) FROM packages WHERE is_public = TRUE) as total_downloads,
  (SELECT COUNT(*) FROM users WHERE is_active = TRUE) as total_users,
  (SELECT json_object_agg(category, count) FROM (
    SELECT category, COUNT(*) as count 
    FROM packages 
    WHERE is_public = TRUE 
    GROUP BY category
  ) cat_counts) as packages_by_category,
  (SELECT COALESCE(SUM(downloads), 0) FROM package_downloads WHERE downloaded_at >= CURRENT_DATE) as downloads_today,
  (SELECT COALESCE(SUM(downloads), 0) FROM package_downloads WHERE downloaded_at >= CURRENT_DATE - INTERVAL '7 days') as downloads_this_week,
  (SELECT COALESCE(SUM(downloads), 0) FROM package_downloads WHERE downloaded_at >= CURRENT_DATE - INTERVAL '30 days') as downloads_this_month,
  NOW() as updated_at;

-- Create indexes for performance
CREATE INDEX idx_packages_search ON packages USING gin(search_vector);
CREATE INDEX idx_packages_category ON packages(category);
CREATE INDEX idx_packages_author ON packages(author_id);
CREATE INDEX idx_packages_downloads ON packages(total_downloads DESC);
CREATE INDEX idx_packages_rating ON packages(average_rating DESC);
CREATE INDEX idx_packages_updated ON packages(updated_at DESC);
CREATE INDEX idx_packages_name_trgm ON packages USING gin(name gin_trgm_ops);

CREATE INDEX idx_package_versions_package ON package_versions(package_id);
CREATE INDEX idx_package_versions_published ON package_versions(published_at DESC);
CREATE INDEX idx_package_versions_tag ON package_versions(tag);

CREATE INDEX idx_package_downloads_package ON package_downloads(package_id);
CREATE INDEX idx_package_downloads_date ON package_downloads(downloaded_at);
CREATE INDEX idx_package_downloads_ip ON package_downloads(ip);

CREATE INDEX idx_package_ratings_package ON package_ratings(package_id);
CREATE INDEX idx_package_ratings_user ON package_ratings(user_id);
CREATE INDEX idx_package_ratings_rating ON package_ratings(rating);

CREATE INDEX idx_security_issues_package ON security_issues(package_id);
CREATE INDEX idx_security_issues_severity ON security_issues(severity);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

-- Insert default categories
INSERT INTO categories (name, display_name, description, icon, color, sort_order) VALUES
('ai', 'Artificial Intelligence', 'AI and machine learning modules', 'psychology', '#FF6B6B', 10),
('database', 'Database & Storage', 'Database connectors and storage solutions', 'storage', '#4ECDC4', 20),
('ui', 'User Interface', 'UI components and design systems', 'palette', '#45B7D1', 30),
('auth', 'Authentication', 'Authentication and authorization modules', 'security', '#96CEB4', 40),
('analytics', 'Analytics & Reporting', 'Analytics, reporting and business intelligence', 'assessment', '#FFEAA7', 50),
('communication', 'Communication', 'Messaging, email and communication tools', 'forum', '#DDA0DD', 60),
('workflow', 'Workflow & Automation', 'Workflow engines and automation tools', 'device_hub', '#FFB74D', 70),
('integration', 'Integration', 'Third-party integrations and APIs', 'api', '#81C784', 80),
('utility', 'Utilities', 'General utilities and helper functions', 'build', '#B0BEC5', 90),
('development', 'Development Tools', 'Development and debugging tools', 'code', '#F48FB1', 100);

-- Insert default tags
INSERT INTO tags (name, display_name, description, color, is_featured) VALUES
('react', 'React', 'React.js components and utilities', '#61DAFB', true),
('typescript', 'TypeScript', 'TypeScript support and utilities', '#3178C6', true),
('api', 'API', 'API integrations and utilities', '#FF6B6B', true),
('realtime', 'Real-time', 'Real-time data and communication', '#4ECDC4', true),
('mobile', 'Mobile', 'Mobile-friendly components', '#45B7D1', false),
('responsive', 'Responsive', 'Responsive design utilities', '#96CEB4', false),
('performance', 'Performance', 'Performance optimization tools', '#FFEAA7', false),
('security', 'Security', 'Security and encryption tools', '#DDA0DD', true),
('testing', 'Testing', 'Testing utilities and frameworks', '#FFB74D', false),
('documentation', 'Documentation', 'Documentation generation tools', '#81C784', false);

-- Functions and triggers for maintaining counts and statistics

-- Function to update package download counts
CREATE OR REPLACE FUNCTION update_download_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- Update package total downloads
  UPDATE packages 
  SET total_downloads = total_downloads + 1,
      weekly_downloads = (
        SELECT COUNT(*) FROM package_downloads 
        WHERE package_id = NEW.package_id 
        AND downloaded_at >= NOW() - INTERVAL '7 days'
      ),
      monthly_downloads = (
        SELECT COUNT(*) FROM package_downloads 
        WHERE package_id = NEW.package_id 
        AND downloaded_at >= NOW() - INTERVAL '30 days'
      )
  WHERE id = NEW.package_id;
  
  -- Update version downloads
  UPDATE package_versions 
  SET downloads = downloads + 1
  WHERE package_id = NEW.package_id AND version = NEW.version;
  
  -- Update user total downloads
  UPDATE users 
  SET total_downloads = total_downloads + 1
  WHERE id = (SELECT author_id FROM packages WHERE id = NEW.package_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_download_counts
  AFTER INSERT ON package_downloads
  FOR EACH ROW
  EXECUTE FUNCTION update_download_counts();

-- Function to update package ratings
CREATE OR REPLACE FUNCTION update_package_ratings()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE packages
  SET 
    average_rating = (
      SELECT COALESCE(AVG(rating), 0)
      FROM package_ratings 
      WHERE package_id = COALESCE(NEW.package_id, OLD.package_id)
    ),
    ratings_count = (
      SELECT COUNT(*)
      FROM package_ratings 
      WHERE package_id = COALESCE(NEW.package_id, OLD.package_id)
    )
  WHERE id = COALESCE(NEW.package_id, OLD.package_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_package_ratings
  AFTER INSERT OR UPDATE OR DELETE ON package_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_package_ratings();

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_registry_stats()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW registry_stats;
END;
$$ LANGUAGE plpgsql;

-- Schedule to refresh stats every hour (requires pg_cron extension)
-- SELECT cron.schedule('refresh-registry-stats', '0 * * * *', 'SELECT refresh_registry_stats();');