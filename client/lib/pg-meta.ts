export const listTablesSql = (schemas?: string[]) => {
  const schemaFilter = schemas && schemas.length > 0 
    ? `AND schemaname IN (${schemas.map(s => `'${s}'`).join(', ')})`
    : '';
    
  return `
    SELECT 
      schemaname as schema,
      tablename as name,
      pg_stat_user_tables.n_live_tup::int8 as live_rows_estimate,
      obj_description(pg_class.oid, 'pg_class') as comment
    FROM pg_tables
    LEFT JOIN pg_stat_user_tables ON pg_tables.tablename = pg_stat_user_tables.relname
    LEFT JOIN pg_class ON pg_tables.tablename = pg_class.relname
    WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
    ${schemaFilter}
    ORDER BY schemaname, tablename;
  `;
};