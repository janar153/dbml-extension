---
name: dbml-extension-engineering
description: Maintain the DBML Extension VS Code fork. Use for implementation or design work on its parser, diagram rendering, layout, edges, Git integration, assisted edits, settings, exports, or release packaging.
---

# DBML Extension engineering

The extension ID is `janar153.dbml-extension`. Commands and settings use
`dbml-extension.*`. DBML files remain the schema source of truth and the
sibling `.dbml.layout.json` stores shared design. Keep existing sidecars
readable and preserve the upstream credit and MIT notice when changing metadata.

1. Follow the repository's codebase-memory instruction for structural
   navigation. Verify affected callers before editing shared protocol types,
   store actions, or extension entry points.
2. Read the relevant Spanish spec for design intent. Check current code when
   a spec has drifted. Update behavior-changing specs in Spanish and keep
   code and identifiers in English. Use the spec template for new designs.
3. Reuse the existing extension points in [patterns.md](references/patterns.md)
   and follow the [code rules](references/code-rules.md). The parser and file
   access stay host-side. Preserve granular Zustand subscriptions, viewport
   culling and LOD, the shared SVG edge layer, and atomic sidecar writes.
4. Verify with `pnpm typecheck` and relevant Vitest cases. For host or browser
   behavior, use the repository's `run-dbml-extension` skill.
5. A fresh local VSIX is mandatory after every change to this repository,
   including version bumps and documentation changes. After the final edit, run
   `pnpm run package` locally and verify
   `packages/dbml-extension-<version>.vsix` with `unzip -t`. Confirm the packaged
   manifest version matches `package.json` and link the local archive in the
   handoff so the user can install it. The package command retains five recent
   release archives.

Read [architecture.md](references/architecture.md) for the host/webview
boundary and [spec-template.md](references/spec-template.md) for new specs.

## Specs and entry points

Find what you're touching, read that spec, verify the current implementation through codebase-memory.

| Touching… | Read spec | Key source |
|---|---|---|
| DBML parse / AST → internal model | `specs/02-dbml-ast-mapping.md` | `src/extension/parser.ts`, `src/shared/types.ts` |
| Layout sidecar / persistence | `specs/03-layout-file-schema.md` | `src/extension/layoutStore.ts`, `src/webview/persistence.ts` |
| Render pipeline / culling / LOD | `specs/04-render-pipeline.md` | `src/webview/render/{spatialIndex,lod,tableNode,viewport}.*`, `src/webview/app.tsx` |
| Edge routing / waypoints | `specs/05-edge-routing.md` | `src/webview/render/{edgeRouter,edgeLayer}.*` |
| TableGroups / bounded contexts | `specs/06-tablegroups.md` | `src/webview/groups/{groupPanel,bcPalette}.*`, `src/webview/render/{groupContainer,collapsedGroupNode}.tsx` |
| Smart layout | `specs/13-smart-auto-layout.md` | `src/webview/layout/smartLayout/` |
| Collaborative merge and Git | `specs/14-collaborative-merge.md`, `specs/16-git-integration.md` | `src/extension/panel.ts`, `src/extension/mergeResolver.ts` |
| Image export | `specs/17-export-image.md` | `src/webview/export/`, `src/extension/panel.ts` |
| Assisted schema edits | `specs/19-editor-asistido.md` | `src/extension/schemaEditor.ts`, `src/extension/schemaEdits.ts` |
| Performance budgets | `specs/07-performance-budgets.md` | cross-cutting |
| Schema exporters (TypeORM and PostgreSQL SQL) | `specs/09-exporters.md` | `src/extension/exporters/**`, `src/shared/exporters/types.ts` |
| Settings | `specs/10-settings.md` | `src/extension/settings.ts`, `src/webview/render/settingsPanel.tsx`, `package.json` → `contributes.configuration` |
| Undo / redo / action history | `specs/11-action-history.md` | `src/webview/state/{history,store}.ts` |
| Design system / CSS / density / UI primitives | `specs/12-design-system.md` | `src/webview/style.css`, `src/webview/ui/` (`Button`, `Modal`, `Field`, `RadioGroup`, `Search`, `cn`), `src/webview/layout/density.ts`, `src/webview/groups/bcPalette.ts` |
| Host↔webview protocol / lifecycle | `specs/01-architecture.md` | `src/extension/{extension,panel}.ts`, `src/webview/main.tsx, src/webview/vscode.ts`, `src/shared/types.ts` |

`specs/00-overview.md` (goals, anti-goals, success criteria) and
`specs/08-roadmap.md` (scope) are context, not tied to one area.

