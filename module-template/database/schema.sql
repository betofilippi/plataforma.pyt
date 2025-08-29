-- Schema creation for module: module_name
-- This file defines all tables for the module in its isolated schema

-- Main entity table
CREATE TABLE IF NOT EXISTS module_name.main (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    
    -- Audit fields
    created_by UUID REFERENCES plataforma.users(id),
    updated_by UUID REFERENCES plataforma.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Items/Details table (example of related table)
CREATE TABLE IF NOT EXISTS module_name.items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    main_id UUID NOT NULL REFERENCES module_name.main(id) ON DELETE CASCADE,
    item_name VARCHAR(200) NOT NULL,
    item_value DECIMAL(12,2),
    quantity INTEGER DEFAULT 1,
    notes TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Module settings table
CREATE TABLE IF NOT EXISTS module_name.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES plataforma.users(id),
    setting_key VARCHAR(100) NOT NULL,
    setting_value JSONB,
    is_global BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, setting_key)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_module_name_main_status ON module_name.main(status);
CREATE INDEX IF NOT EXISTS idx_module_name_main_created_at ON module_name.main(created_at);
CREATE INDEX IF NOT EXISTS idx_module_name_items_main_id ON module_name.items(main_id);
CREATE INDEX IF NOT EXISTS idx_module_name_settings_user_id ON module_name.settings(user_id);

-- Add comments for documentation
COMMENT ON SCHEMA module_name IS 'Module description - Isolated schema for module_name';
COMMENT ON TABLE module_name.main IS 'Main entity table for the module';
COMMENT ON TABLE module_name.items IS 'Related items/details for main entities';
COMMENT ON TABLE module_name.settings IS 'User and global settings for the module';