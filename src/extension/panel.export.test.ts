import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';

vi.mock('vscode', () => import('./testing/vscodeFake'));

import * as vscode from 'vscode';
import { DiagramPanel } from './panel';
import { cleanupDirs, newDir, openPanel } from './testing/panelHarness';
import { fake } from './testing/vscodeFake';

afterEach(() => {
  vi.restoreAllMocks();
  DiagramPanel.disposeAll();
  cleanupDirs();
  fake.reset();
});

it.each([
  ['postgres-sql', 'PostgreSQL (SQL)', '"'],
  ['mysql-sql', 'MySQL / MariaDB (SQL)', '`'],
  ['oracle-sql', 'Oracle (SQL)', '"'],
  ['sqlite-sql', 'SQLite (SQL)', '"'],
  ['mssql-sql', 'SQL Server (SQL)', '['],
] as const)('offers %s and saves all tables even with a diagram selection', async (formatId, label, quote) => {
  const h = await openPanel({
    dbml: 'Table parent { id int [pk] }\nTable child { parent_id int [ref: > parent.id] }',
  });
  const target = vscode.Uri.file(join(h.dir, 'schema.sql'));
  const save = vi.spyOn(vscode.window, 'showSaveDialog').mockResolvedValue(target);
  expect(h.since('exporters:list')[0]?.payload).toMatchObject({
    exporters: expect.arrayContaining([expect.objectContaining({ id: formatId, label, fullSchemaOnly: true })]),
  });

  await h.web.receive({
    type: 'command:export',
    payload: { formatId, scope: 'selected', selection: ['public.child'], options: {} },
  });

  await vi.waitFor(() => expect(h.since('export:result')[0]?.payload).toMatchObject({ ok: true }));
  expect(save).toHaveBeenCalledWith({
    defaultUri: vscode.Uri.file(join(h.dir, 'd.sql')),
    filters: { [label]: ['sql'] },
  });
  const sql = await readFile(target.fsPath, 'utf8');
  const close = quote === '[' ? ']' : quote;
  expect(sql).toContain(`CREATE TABLE ${quote}parent${close}`);
  expect(sql).toContain(`CREATE TABLE ${quote}child${close}`);
  expect(sql).toContain(`FOREIGN KEY (${quote}parent_id${close}) REFERENCES ${quote}parent${close}`);
});

it('resolves imported tables when exporting SQL from a trusted project', async () => {
  const dir = newDir();
  const source = "use * from './accounts'\nTable posts { user_id int [ref: > users.id] }";
  await writeFile(join(dir, 'accounts.dbml'), 'Table users { id int [pk] }');
  await writeFile(join(dir, 'd.dbml'), source);
  const h = await openPanel({ reuseDir: dir });
  const target = vscode.Uri.file(join(h.dir, 'schema.sql'));
  vi.spyOn(vscode.window, 'showSaveDialog').mockResolvedValue(target);
  await h.web.receive({
    type: 'command:export',
    payload: { formatId: 'sqlite-sql', scope: 'all', selection: [], options: {} },
  });
  await vi.waitFor(() => expect(h.since('export:result')[0]?.payload).toMatchObject({ ok: true }));
  const sql = await readFile(target.fsPath, 'utf8');
  expect(sql).toContain('CREATE TABLE "users"');
  expect(sql).toContain('FOREIGN KEY ("user_id") REFERENCES "users" ("id")');
});

it('saves the rendered ERD as a single PDF page sized to the SVG', async () => {
  const h = await openPanel({ dbml: 'Table example { id int [pk] }' });
  const target = vscode.Uri.file(join(h.dir, 'diagram.pdf'));
  const save = vi.spyOn(vscode.window, 'showSaveDialog').mockResolvedValue(target);
  // Two pixels, one opaque and one transparent.
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAD0lEQVR4nGP4z8AARAwMAAz8Af9c/RSVAAAAAElFTkSuQmCC';

  await h.web.receive({
    type: 'command:saveImage',
    payload: { mime: 'application/pdf', suggestedName: 'diagram.pdf', pngBase64, width: 800, height: 400 },
  });

  await vi.waitFor(() => expect(h.since('image:result')[0]?.payload).toMatchObject({ ok: true }));
  expect(save).toHaveBeenCalledWith({ defaultUri: target, filters: { 'PDF document': ['pdf'] } });
  const pdf = await PDFDocument.load(await readFile(target.fsPath));
  expect(pdf.getPageCount()).toBe(1);
  expect(pdf.getPage(0).getSize()).toEqual({ width: 600, height: 300 });
});
