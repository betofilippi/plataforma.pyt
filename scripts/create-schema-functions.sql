-- Function to get all schemas
CREATE OR REPLACE FUNCTION public.get_schemas()
RETURNS TABLE(
  schema_name text,
  table_count bigint
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    n.nspname as schema_name,
    COUNT(c.oid)::bigint as table_count
  FROM pg_namespace n
  LEFT JOIN pg_class c ON c.relnamespace = n.oid 
    AND c.relkind = 'r'
  WHERE n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
    AND n.nspname NOT LIKE 'pg_temp_%'
  GROUP BY n.nspname
  ORDER BY n.nspname;
$$;

-- Grant permission to execute
GRANT EXECUTE ON FUNCTION public.get_schemas() TO anon, authenticated;

-- Function to get tables from a specific schema
CREATE OR REPLACE FUNCTION public.get_schema_tables(p_schema text)
RETURNS TABLE(
  tablename text,
  schemaname text,
  n_live_tup bigint
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    c.relname::text as tablename,
    n.nspname::text as schemaname,
    COALESCE(s.n_live_tup, 0) as n_live_tup
  FROM pg_class c
  JOIN pg_namespace n ON c.relnamespace = n.oid
  LEFT JOIN pg_stat_user_tables s ON s.schemaname = n.nspname 
    AND s.relname = c.relname
  WHERE c.relkind = 'r'
    AND n.nspname = p_schema
  ORDER BY c.relname;
$$;

-- Grant permission to execute
GRANT EXECUTE ON FUNCTION public.get_schema_tables(text) TO anon, authenticated;