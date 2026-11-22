import { readFileSync, realpathSync, statSync } from 'node:fs';
import { isAbsolute, relative, sep } from 'node:path';
import { Parser } from '@dbml/core';

export interface DbmlProject {
  entry: string;
  root: string;
}

function contains(root: string, file: string): boolean {
  const path = relative(root, file);
  return path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path);
}

/** Use the compiler's own module resolution and supply sources only when it requests them. */
export function projectParser(source: string, project: DbmlProject, dependencies: Set<string>): Parser {
  const parser = new Parser();
  parser.setDbmlSource(project.entry, source);
  const layout = parser.DBMLCompiler.layout;
  const getSource = layout.getSource.bind(layout);
  const resolveFileSpecifier = layout.resolveFileSpecifier.bind(layout);
  const root = realpathSync(project.root);
  const loaded = new Map<string, string | undefined>();

  layout.resolveFileSpecifier = (from, specifier) => {
    const target = resolveFileSpecifier(from, specifier);
    return target && contains(project.root, target.fsPath) ? target : undefined;
  };
  layout.getSource = (file) => {
    const existing = getSource(file);
    if (existing !== undefined) return existing;
    const path = file.fsPath;
    if (!contains(project.root, path)) return undefined;
    if (loaded.has(path)) return loaded.get(path);
    dependencies.add(path);
    let text: string | undefined;
    try {
      const real = realpathSync(path);
      if (contains(root, real) && statSync(real).isFile()) text = readFileSync(real, 'utf8');
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT' && code !== 'ENOTDIR') throw err;
    }
    loaded.set(path, text);
    return text;
  };
  layout.exists = layout.isFile = (file) => layout.getSource(file) !== undefined;
  return parser;
}
