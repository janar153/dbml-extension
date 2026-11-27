import { isEndpointOneSide, type NormalizedModel } from '@dbml/core';

type Field = NormalizedModel['fields'][number];
type Ref = NormalizedModel['refs'][number];
type Endpoint = NormalizedModel['endpoints'][number];

const quote = (name: string) => '"' + name.replaceAll('"', '""') + '"';
const literal = (value: string) => "'" + value.replaceAll("'", "''") + "'";
const columns = (names: readonly string[]) => '(' + names.map(quote).join(', ') + ')';

function uniqueName(base: string, used: Set<string>): string {
  const prefix = /^sqlite_/i.test(base) ? 'dbml_' + base : base;
  let name = prefix;
  for (let suffix = 2; used.has(name.toLowerCase()); suffix++) name = prefix + '_' + suffix;
  used.add(name.toLowerCase());
  return name;
}

function affinity(field: Field): string {
  const type = field.type.type_name.toUpperCase().replace(/\(.*/, '');
  if (field.enumId || /CHAR|CLOB|TEXT|UUID|JSON|\[\]$/.test(type)) return 'TEXT';
  if (type.includes('INT')) return 'INTEGER';
  if (/BLOB|BINARY|BYTEA/.test(type)) return 'BLOB';
  if (/REAL|FLOA|DOUB/.test(type)) return 'REAL';
  return 'NUMERIC';
}

function checkSql(check: NormalizedModel['checks'][number]): string {
  return (check.name ? 'CONSTRAINT ' + quote(check.name) + ' ' : '') + 'CHECK (' + check.expression + ')';
}

function defaultSql(value: NonNullable<Field['dbdefault']>): string {
  if (value.type === 'string') return literal(String(value.value));
  if (value.type === 'expression') return '(' + value.value + ')';
  return String(value.value).toUpperCase();
}

function createTable(name: string, items: string[]): string {
  return 'CREATE TABLE ' + quote(name) + ' (\n  ' + items.join(',\n  ') + '\n);';
}

/** SQLite requires foreign keys in CREATE TABLE and has one namespace per database file. */
export function renderSqlite(model: NormalizedModel): string {
  const tables: NormalizedModel['tables'][number][] = Object.values(model.tables);
  const usedNames = new Set<string>();
  const tableNames = new Map(tables.map((table) => {
    const schema = model.schemas[table.schemaId]!.name;
    const base = schema === 'public' ? table.name : schema + '.' + table.name;
    return [table.id, uniqueName(base, usedNames)];
  }));
  const tableId = (endpoint: Endpoint) => model.fields[endpoint.fieldIds[0]!]!.tableId;
  const foreignKeys = new Map(tables.map((table) => [table.id, [] as string[]]));
  const junctions: string[] = [];
  const indexes: string[] = [];

  function foreignKey(local: string[], target: Endpoint, ref: Ref, name?: string): string {
    const constraint = name ? 'CONSTRAINT ' + quote(name) + ' ' : '';
    const onDelete = ref.onDelete ? ' ON DELETE ' + ref.onDelete.toUpperCase() : '';
    const onUpdate = ref.onUpdate ? ' ON UPDATE ' + ref.onUpdate.toUpperCase() : '';
    return constraint + 'FOREIGN KEY ' + columns(local) + ' REFERENCES ' + quote(tableNames.get(tableId(target))!)
      + ' ' + columns(target.fieldNames) + onDelete + onUpdate;
  }

  for (const ref of Object.values(model.refs)) {
    if (ref.inactive) continue;
    const first = model.endpoints[ref.endpointIds[0]!]!;
    const second = model.endpoints[ref.endpointIds[1]!]!;
    if (isEndpointOneSide(first.relation) || isEndpointOneSide(second.relation)) {
      const [target, local] = isEndpointOneSide(first.relation) ? [first, second] : [second, first];
      foreignKeys.get(tableId(local))!.push(foreignKey(local.fieldNames, target, ref, ref.name ?? undefined));
      continue;
    }

    const name = uniqueName(tableNames.get(tableId(first)) + '_' + tableNames.get(tableId(second)), usedNames);
    const usedColumns = new Set<string>();
    const items: string[] = [];
    const sides = [first, second].map((endpoint) => endpoint.fieldIds.map((id) => {
      const field = model.fields[id]!;
      const name = uniqueName(endpoint.tableName + '_' + field.name, usedColumns);
      items.push(quote(name) + ' ' + affinity(field) + ' NOT NULL');
      return name;
    }));
    junctions.push(createTable(name, [
      ...items,
      'PRIMARY KEY ' + columns(sides.flat()),
      foreignKey(sides[0]!, first, ref),
      foreignKey(sides[1]!, second, ref),
    ]));
  }

  const statements = tables.map((table) => {
    const name = tableNames.get(table.id)!;
    const fields = table.fieldIds.map((id) => model.fields[id]!);
    const tableIndexes = table.indexIds.map((id) => model.indexes[id]!);
    const indexedPrimaryKey = tableIndexes.find((index) => index.pk);
    const indexColumns = (index: NormalizedModel['indexes'][number]) => index.columnIds.map((id) => {
      const column = model.indexColumns[id]!;
      const key = column.type === 'expression' ? '(' + column.value + ')' : quote(column.value);
      return !index.pk && column.sortOrder === 'desc' ? key + ' DESC' : key;
    });
    const indexedKeyColumns = indexedPrimaryKey ? indexColumns(indexedPrimaryKey) : [];
    const primaryColumns = indexedPrimaryKey ? indexedKeyColumns : fields.filter((field) => field.pk).map((field) => quote(field.name));
    if (indexedPrimaryKey?.columnIds.some((id) => model.indexColumns[id]!.type === 'expression')) {
      throw new Error('SQLite requires column names in the primary key: ' + name);
    }
    const items = fields.map((field) => {
      const column = quote(field.name);
      const type = affinity(field);
      const isPrimary = primaryColumns.includes(column);
      if (field.increment && (type !== 'INTEGER' || !isPrimary || primaryColumns.length !== 1)) {
        throw new Error('SQLite requires an integer single-column primary key for [increment]: ' + name + '.' + field.name);
      }
      let sql = column + ' ' + type;
      if (isPrimary && primaryColumns.length === 1) sql += ' PRIMARY KEY';
      if (field.increment) sql += ' AUTOINCREMENT';
      if (field.not_null || isPrimary) sql += ' NOT NULL';
      if (field.unique && !(isPrimary && primaryColumns.length === 1)) sql += ' UNIQUE';
      if (field.dbdefault) sql += ' DEFAULT ' + defaultSql(field.dbdefault);
      if (field.enumId) {
        const values = model.enums[field.enumId]!.valueIds.map((id) => literal(model.enumValues[id]!.name));
        sql += ' CHECK (' + column + ' IN (' + values.join(', ') + '))';
      }
      for (const id of field.checkIds) sql += ' ' + checkSql(model.checks[id]!);
      return sql;
    });
    if (primaryColumns.length > 1) {
      items.push('PRIMARY KEY (' + primaryColumns.join(', ') + ')');
    }
    for (const id of table.checkIds) items.push(checkSql(model.checks[id]!));
    for (const index of tableIndexes) {
      if (index.pk) continue;
      const indexName = uniqueName(index.name || name + '_idx_' + index.id, usedNames);
      indexes.push('CREATE ' + (index.unique ? 'UNIQUE ' : '') + 'INDEX ' + quote(indexName) + ' ON '
        + quote(name) + ' (' + indexColumns(index).join(', ') + ');');
    }
    return createTable(name, [...items, ...foreignKeys.get(table.id)!]);
  });

  return ['PRAGMA foreign_keys = ON;', 'BEGIN;', ...statements, ...junctions, ...indexes, 'COMMIT;'].join('\n\n') + '\n';
}
