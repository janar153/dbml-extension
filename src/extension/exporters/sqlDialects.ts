export const SQL_DIALECTS = [
  ['postgres', 'PostgreSQL'],
  ['mysql', 'MySQL / MariaDB'],
  ['oracle', 'Oracle'],
  ['sqlite', 'SQLite'],
  ['mssql', 'SQL Server'],
] as const;

export type SqlDialect = typeof SQL_DIALECTS[number][0];
