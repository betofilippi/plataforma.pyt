-- Permissions setup for module: module_name
-- Define roles and access control for the module

-- Create module-specific roles (optional)
-- CREATE ROLE IF NOT EXISTS module_name_viewer;
-- CREATE ROLE IF NOT EXISTS module_name_editor;
-- CREATE ROLE IF NOT EXISTS module_name_admin;

-- Grant schema usage
-- GRANT USAGE ON SCHEMA module_name TO module_name_viewer;
-- GRANT USAGE ON SCHEMA module_name TO module_name_editor;
-- GRANT USAGE ON SCHEMA module_name TO module_name_admin;

-- Viewer permissions (read-only)
-- GRANT SELECT ON ALL TABLES IN SCHEMA module_name TO module_name_viewer;

-- Editor permissions (read/write)
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA module_name TO module_name_editor;

-- Admin permissions (full access)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA module_name TO module_name_admin;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA module_name TO module_name_admin;

-- Row Level Security (RLS) policies
-- Enable RLS on main table
-- ALTER TABLE module_name.main ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own records (example)
-- CREATE POLICY "Users can view own records" ON module_name.main
--     FOR SELECT
--     USING (created_by = current_user_id() OR has_permission('module-name:view-all'));

-- Policy: Users can create records
-- CREATE POLICY "Users can create records" ON module_name.main
--     FOR INSERT
--     WITH CHECK (has_permission('module-name:create'));

-- Policy: Users can update own records
-- CREATE POLICY "Users can update own records" ON module_name.main
--     FOR UPDATE
--     USING (created_by = current_user_id() OR has_permission('module-name:edit-all'))
--     WITH CHECK (created_by = current_user_id() OR has_permission('module-name:edit-all'));

-- Policy: Only admins can delete
-- CREATE POLICY "Only admins can delete" ON module_name.main
--     FOR DELETE
--     USING (has_permission('module-name:delete'));