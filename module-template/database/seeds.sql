-- Initial data for module: module_name
-- This file contains sample/default data for the module

-- Insert default settings
INSERT INTO module_name.settings (setting_key, setting_value, is_global) VALUES
    ('default_status', '"active"', true),
    ('items_per_page', '25', true),
    ('enable_notifications', 'true', true)
ON CONFLICT DO NOTHING;

-- Insert sample data (remove in production)
-- INSERT INTO module_name.main (name, description, status) VALUES
--     ('Sample Item 1', 'This is a sample item', 'active'),
--     ('Sample Item 2', 'Another sample item', 'active')
-- ON CONFLICT DO NOTHING;