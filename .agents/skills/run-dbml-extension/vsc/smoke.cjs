// Runs INSIDE a real VS Code extension host (via run-vscode.mjs). Opens a .dbml, opens the diagram,
// checks the Ctrl+click links (served by the parse worker), runs revealInDiagram, then edits + saves the
// .dbml so the watcher → worker parse path runs. Writes .work/vscode-smoke.txt.
const assert = require('node:assert/strict');
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

const lines = [];
const out = (k, v) => lines.push(`${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

exports.run = async () => {
  try {
    const dbml = vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, 'model.dbml');
    const doc = await vscode.workspace.openTextDocument(dbml);
    await vscode.window.showTextDocument(doc);
    out('languageId', doc.languageId);
    const ext = vscode.extensions.getExtension('janar153.dbml-extension');
    assert.ok(ext, 'DBML Extension must be loaded');
    assert.equal(doc.languageId, 'dbml');
    out('extension', ext.id);
    await vscode.commands.executeCommand('dbml-extension.openDiagram', dbml);
    await sleep(4000);
    assert.ok(ext.isActive, 'Opening the diagram must activate the extension');
    out('active', ext.isActive);
    out('tabs', vscode.window.tabGroups.all.flatMap((g) => g.tabs).map((t) => t.label));
    const links = (await vscode.commands.executeCommand('vscode.executeLinkProvider', dbml)) || [];
    out('links', links.map((l) => `L${l.range.start.line}:${l.range.start.character}-${l.range.end.character}`));
    const target = links.find((link) => link.target?.path === 'dbml-extension.revealInDiagram')?.target;
    assert.ok(target, 'The fixture must contain a table declaration with a diagram link');
    await vscode.commands.executeCommand(target.path, ...JSON.parse(decodeURIComponent(target.query)));
    out('revealInDiagram', 'ok');
    const edit = new vscode.WorkspaceEdit();
    edit.insert(dbml, new vscode.Position(doc.lineCount, 0), '\nTable smoke_added {\n  id int [pk]\n}\n');
    assert.ok(await vscode.workspace.applyEdit(edit), 'The smoke edit must apply');
    assert.ok(await doc.save(), 'The smoke document must save');
    out('save', 'ok');
    const deadline = Date.now() + 5000;
    const hasNewLink = async () => {
      const updatedLinks = await vscode.commands.executeCommand('vscode.executeLinkProvider', dbml);
      return updatedLinks?.some((link) => link.target?.query.includes('smoke_added'));
    };
    let newLink = await hasNewLink();
    while (!newLink && Date.now() < deadline) {
      await sleep(250);
      newLink = await hasNewLink();
    }
    assert.ok(newLink, 'The parse worker must return a link for the saved table');
    out('saved table link', 'ok');
  } catch (e) {
    out('ERROR', (e && e.stack) || String(e));
    throw e;
  } finally {
    fs.writeFileSync(path.join(__dirname, '..', '.work', 'vscode-smoke.txt'), lines.join('\n') + '\n');
  }
};
