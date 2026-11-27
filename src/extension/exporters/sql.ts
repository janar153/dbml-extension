import type { Exporter } from '../../shared/exporters/types';
import { parseRequest } from '../parseService';
import { SQL_DIALECTS } from './sqlDialects';

export const sqlExporters = SQL_DIALECTS.map(([dialect, name]): Exporter => ({
  id: `${dialect}-sql`,
  label: `${name} (SQL)`,
  description: `Save the full schema as a ${name} DDL script.`,
  language: 'sql',
  optionsSchema: [],
  fullSchemaOnly: true,
  async export({ dbmlSource, dbmlProject, channel }) {
    if (dbmlSource === undefined) throw new Error('DBML source is unavailable.');
    const result = await parseRequest({ op: 'sql', dialect, source: dbmlSource, project: dbmlProject }, channel ?? `export:${dialect}`);
    if (!result) throw new Error(`${name} export was interrupted.`);
    if (!result.ok) throw new Error(result.message);
    return { language: 'sql', fileExtension: 'sql', content: result.sql, warnings: result.warnings };
  },
}));
