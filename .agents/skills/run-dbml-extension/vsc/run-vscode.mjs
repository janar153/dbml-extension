// Downloads (once, into ../.vscode-test) or uses an installed VS Code with this repo as the extension
// under development, then runs smoke.cjs inside its extension host. Needs a display (WSLg/X) or xvfb-run.
// Usage: node vsc/run-vscode.mjs [file.dbml]   (default: ../selfloop.dbml)
import { runTests } from '@vscode/test-electron';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const K = join(import.meta.dirname, '..');
const R = join(K, '../../..');
const work = join(K, '.work');
const report = join(work, 'vscode-smoke.txt');
const ws = join(work, 'vscode-ws');
rmSync(report, { force: true });
rmSync(ws, { recursive: true, force: true });
mkdirSync(ws, { recursive: true });
cpSync(process.argv[2] ?? join(K, 'selfloop.dbml'), join(ws, 'model.dbml'));

const profile = mkdtempSync(join(process.platform === 'darwin' ? '/tmp' : tmpdir(), 'dbml-vscode-'));
try {
  await runTests({
    vscodeExecutablePath: process.env.VSCODE_EXECUTABLE_PATH,
    cachePath: join(K, '.vscode-test'),
    extensionDevelopmentPath: R,
    extensionTestsPath: join(import.meta.dirname, 'smoke.cjs'),
    launchArgs: [ws, '--disable-extensions', '--disable-gpu', '--no-sandbox', '--user-data-dir', profile],
  });
} catch (e) {
  console.error('VS Code run failed:', e);
  process.exitCode = 1;
} finally {
  const logs = join(profile, 'logs');
  if (existsSync(logs)) cpSync(logs, join(work, 'vscode-logs'), { recursive: true });
  rmSync(profile, { recursive: true, force: true });
}
if (existsSync(report)) console.log(readFileSync(report, 'utf8'));
