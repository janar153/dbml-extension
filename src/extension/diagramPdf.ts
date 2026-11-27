const POINTS_PER_PIXEL = 72 / 96;
const MAX_PAGE_POINTS = 14400;

/** Fit the entire SVG canvas on one PDF page, independent of the raster resolution. */
export async function diagramPdf(png: Uint8Array, width: number, height: number): Promise<Uint8Array> {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('Invalid PDF page dimensions.');
  }

  const { PDFDocument } = await import('pdf-lib');
  const document = await PDFDocument.create();
  const image = await document.embedPng(png);
  const scale = Math.min(POINTS_PER_PIXEL, MAX_PAGE_POINTS / Math.max(width, height));
  const page = document.addPage([width * scale, height * scale]);
  page.drawImage(image, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });
  return document.save();
}
