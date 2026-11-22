# DBML Extension changelog

[GitHub repository](https://github.com/janar153/dbml-extension) · [Report an issue](https://github.com/janar153/dbml-extension/issues)

## 2.0.0

- Added native DBML syntax highlighting, comment toggling, bracket and quote pairing, and editor snippets alongside the diagram. Adapted the MIT-licensed language assets from [vscode-dbml by Matthew Meyers](https://github.com/mattmeyers/vscode-dbml) for current DBML structure, visualization, lineage, architecture, and module syntax.
- Live diagrams now resolve relative `use` and `reuse` declarations in trusted local projects and refresh when an imported file changes.

## 1.1.0 — 2026-11-22

First independent release of **DBML Extension**, based on **dddbml 0.4.2** by TWulfZ. This release consolidates the changes developed since that upstream baseline.

### Added

- **PostgreSQL export.** Export a full DBML schema as a SQL script with tables, keys, constraints, indexes, and enums. The TypeORM exporter remains available.
- **System architecture diagrams.** Use `diagram_type: arch` to show role-based nodes, nested groups, notes, and labeled links. Auto-arrange the diagram, drag groups with their contents, save positions in the layout sidecar, and export to SVG or PNG.
- **Project title blocks and notes.** Display project attributes, the title, and the overview on the canvas. Move and style the title and overview independently, include the project note in image exports, and embed sibling logos and images in title-block SVG exports.
- **Editable diagram labels.** Create and drag labels backed by standalone DBML notes, customize their fonts and sizes, and include them in image exports.
- **Named diagram views.** Select a DBML view to show and export its visible tables, groups, and labels. TableGroups use DBML colors and show notes on hover.
- **Printer-friendly editing and export.** Edit the diagram in light or dark print mode. Printer-friendly SVGs show full field labels and preserve the positions and routes edited in those modes. An optional headerless PK/FK column appears beside field names.

### Changed

- **Relationships.** References use crow’s-foot notation, including optional endpoints, and preserve DBML colors and details. Reference endpoints can move along all four table sides, with saved routes and undo/redo. Drag dependencies and architecture links to add bends or move either attachment while keeping existing bends. Saved routes carry through to image exports. References, dependencies, and architecture links share controls for actions such as **Reset line** and **Edge color**.
- **Canvas gestures.** Drag empty space with no tables selected to pan. Use Shift-drag to box-select.
- **Extension identity.** DBML Extension has its own icon, repository links, and VS Code extension ID (`janar153.dbml-extension`). Commands and settings use `dbml-extension.*`. If moving from dddbml, copy custom settings to the new namespace and update custom keybindings. Existing DBML and layout files remain readable.
- **Build and development workflow.** Packaging writes to `packages/` and retains the five most recently built release archives. Repository-local Codex skills cover engineering and Chromium and VS Code smoke testing.

### Fixed

- Fields that are both primary and foreign keys show their FK status on the canvas and in SVG exports.
- Inactive references appear as dotted lines and are omitted from foreign-key labels and TypeORM relations.
- Note and project-caption positions and typography are stored in the shared layout sidecar. Legacy inline note layout migrates on the next layout save.
- Updated the DBML parser to handle enum aliases and index column sort order.

## Upstream history

Changes through dddbml 0.4.2 belong to the original project and its contributors. See the [original dddbml changelog](https://github.com/TWulfZ/dddbml/blob/main/CHANGELOG.md).
