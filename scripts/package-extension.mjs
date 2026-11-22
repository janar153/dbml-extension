import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, unlinkSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

if (process.argv.length > 2) {
  console.error('Usage: pnpm run package. Output is managed in packages/.');
  process.exit(1);
}

const root = join(import.meta.dirname, '..');
const { name, version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const packages = join(root, 'packages');
const staging = join(packages, '.packaging');
const filename = `${name}-${version}.vsix`;
const temporaryArchive = join(staging, filename);
const archive = join(packages, filename);
const vsce = createRequire(import.meta.url).resolve('@vscode/vsce/vsce');

mkdirSync(packages, { recursive: true });
try {
  mkdirSync(staging);
} catch (error) {
  if (error.code !== 'EEXIST') throw error;
  console.error('Packaging is already in progress. If the previous run was interrupted, remove packages/.packaging before retrying.');
  process.exit(1);
}

try {
  const result = spawnSync(process.execPath, [vsce, 'package', '--no-dependencies', '--out', temporaryArchive], {
    cwd: root,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
  } else {
    renameSync(temporaryArchive, archive);

    // Include releases built under the original name before the fork was renamed.
    const release = /^(?:dbml-extension|dddbml)-\d+\.\d+\.\d+(?:[-+][\w.+-]+)?\.vsix$/;
    const previous = readdirSync(packages, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name !== filename && release.test(entry.name))
      .map((entry) => {
        const path = join(packages, entry.name);
        return { path, builtAt: statSync(path).mtimeMs };
      })
      .sort((a, b) => b.builtAt - a.builtAt || a.path.localeCompare(b.path));

    for (const { path } of previous.slice(4)) {
      unlinkSync(path);
      console.log(`Removed old package ${path}`);
    }
    console.log(`Package ready: ${archive}`);
  }
} finally {
  rmSync(staging, { recursive: true, force: true });
}
