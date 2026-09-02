/**
 * Saves a blob (a CSV/Excel/PDF export fetched via `ApiClientService.getBlob()`) to disk with the
 * given filename — a forced download, unlike `openPdfBlobInNewTab()`, which opens a document
 * inline for viewing/printing. Use this for exports meant to be saved and opened elsewhere.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
