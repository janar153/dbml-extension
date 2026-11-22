import type { QualifiedName } from '../../shared/types';

/**
 * Grid-bucketed spatial index for viewport culling.
 * Each node is registered in every cell its bounding box overlaps.
 * Query checks the node boxes in overlapping cells and includes boxes touching the boundary.
 *
 * Operations O(c) where c = number of cells the node spans (typically 1-4 for our table sizes).
 */

export interface Bbox {
  x: number;
  y: number;
  w: number;
  h: number;
}

const CELL = 512;

export class SpatialIndex {
  private readonly cells = new Map<string, Map<QualifiedName, Bbox>>();
  private readonly membership = new Map<QualifiedName, string[]>();
  private readonly bboxes = new Map<QualifiedName, Bbox>();
  private revision = 0;

  /** Bumped on every mutation: culling caches keyed on the instance must also key on this. */
  public get version(): number {
    return this.revision;
  }

  public clear(): void {
    this.revision++;
    this.cells.clear();
    this.membership.clear();
    this.bboxes.clear();
  }

  public insert(name: QualifiedName, bbox: Bbox): void {
    this.remove(name);
    const keys = this.cellKeys(bbox);
    for (const key of keys) {
      let cell = this.cells.get(key);
      if (!cell) {
        cell = new Map();
        this.cells.set(key, cell);
      }
      cell.set(name, bbox);
    }
    this.membership.set(name, keys);
    this.bboxes.set(name, bbox);
    this.revision++;
  }

  public remove(name: QualifiedName): void {
    const prev = this.membership.get(name);
    if (!prev) return;
    for (const key of prev) {
      const cell = this.cells.get(key);
      if (!cell) continue;
      cell.delete(name);
      if (cell.size === 0) this.cells.delete(key);
    }
    this.membership.delete(name);
    this.bboxes.delete(name);
    this.revision++;
  }

  public move(name: QualifiedName, bbox: Bbox): void {
    this.insert(name, bbox);
  }

  public getBbox(name: QualifiedName): Bbox | undefined {
    return this.bboxes.get(name);
  }

  public size(): number {
    return this.bboxes.size;
  }

  public query(bbox: Bbox): Set<QualifiedName> {
    const out = new Set<QualifiedName>();
    const right = bbox.x + bbox.w;
    const bottom = bbox.y + bbox.h;
    const cx0 = Math.floor(bbox.x / CELL);
    const cy0 = Math.floor(bbox.y / CELL);
    const cx1 = Math.floor(right / CELL);
    const cy1 = Math.floor(bottom / CELL);
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const cell = this.cells.get(`${cx},${cy}`);
        if (!cell) continue;
        for (const [name, b] of cell) {
          if (b.x + b.w < bbox.x) continue;
          if (b.x > right) continue;
          if (b.y + b.h < bbox.y) continue;
          if (b.y > bottom) continue;
          out.add(name);
        }
      }
    }
    return out;
  }

  private cellKeys(bbox: Bbox): string[] {
    const cx0 = Math.floor(bbox.x / CELL);
    const cy0 = Math.floor(bbox.y / CELL);
    const cx1 = Math.floor((bbox.x + bbox.w) / CELL);
    const cy1 = Math.floor((bbox.y + bbox.h) / CELL);
    const keys: string[] = [];
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        keys.push(`${cx},${cy}`);
      }
    }
    return keys;
  }
}
